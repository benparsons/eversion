var settings = require('./settings.js');
var logger = require('./logger.js');
var sqlgen = require('./sqlgen.js');
logger.verbose("gdax_auth,listener", settings);
var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();
var market = require('./gdax.js');
var utility = require('./utility.js');
var heartbeat_obj = {};
var dirty = false;
var graphite = require('graphite');
var client = graphite.createClient('plaintext://localhost:2003/');


let db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    logger.error("DB", err.message);
  } else {
    logger.verbose("DB", 'Connected to the eversion database.');
  }
});

var websocket = market.websocket;

websocket.on('close', function() {
  websocket.connect();
});
websocket.on('error', function(err) { 
  logger.error("websocket", err);
  websocket.connect();
});

websocket.on('message', function(data) {

  if (data.type === 'heartbeat') {
    heartbeat_obj = data;
    return;
  }
  logger.info("message", JSON.stringify(data, null, 0));
  if (data.type === 'subscriptions') { return; };

  storeEvent(data);
  dirty = true;
  if (data.type === 'done' && data.reason === 'filled') {
    if (data.side === 'sell') {
      var buyPrice = data.price * 0.9975; // -0.25%
      buyPrice = Number.parseFloat(buyPrice.toFixed(5));
      market.buy(buyPrice);
    }
  }
});

function storeEvent(data) {
  var order = {
    type:	data.type,
    order_id:	data.order_id,
    order_type: data.order_type ? data.order_type : null,
    size:	data.remaining_size ? data.remaining_size : null,
    price:	data.price,
    side:	data.side,
    product_id:	data.product_id,
    remaining_size:	data.remaining_size,
    reason:	data.reason,
    expire_time: null,
    post_only: null,
    settled: null,
    last_updated: (new Date()).toISOString()
  };
  
  var sqlString = sqlgen.insertOrReplaceSql('orders', order);

  db.run(sqlString);
}

minuteAction();

var seconds = 60 ;
setInterval(minuteAction, 1000 * seconds);

function minuteAction() {
  client.write({"heartbeat-last_trade_id": heartbeat_obj.last_trade_id}, function(err) {
    if (err) { logger.error("graphite", err); }
  });
  utility.getDatabaseOrders((orders) => {
    client.write(orders, function(err) {
      if (err) { logger.error("graphite", err); }
    });
  });
  market.getAccounts((error, response, data) => {
    if (error) {
      logger.error("getAccounts", error);
      return;
    }
    var eth_available = Number.parseFloat(
      data.find(o => o.currency === 'ETH').available
    );
    var sqlstring = "INSERT into accounts(eth_available, eth_hold, btc_available, btc_hold, time) VALUES (";
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'ETH').available) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'ETH').hold) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'BTC').available) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'BTC').hold) + ',';
    sqlstring += "'" + new Date().toISOString() + "')";
    db.run( sqlstring);

    if (eth_available >= 0.01) {
      dirty = true;
      logger.info("initiatingAutosell", "time to sell eth");
      var sqlGetHighestBuy = "SELECT price FROM orders  WHERE side = 'buy' AND type = 'open' ORDER BY price DESC LIMIT 1";
      var highestBuy = 0;
      db.get(sqlGetHighestBuy, function(err, value) {
        if (err) {
          logger.error("sqlGetHighestBuy", err)
        } else {
          if (value && value.price) {
            highestBuy = value.price;
            logger.verbose("sqlGetHighestBuy", highestBuy);
          }
          db.all("SELECT price FROM orders WHERE type = 'open' AND side = 'sell'", function (err, rows) {
            if(err){
                logger.error("sqlGetOpenSells", err);
            }else{
              logger.verbose("highestBuyAsASell", highestBuy);
              if (highestBuy) {
                logger.verbose("highestBuyAsASell", "push to rows");
                rows.push({price : highestBuy});
                rows.push({price : highestBuy * (1/0.9975)}); // as sell
                // TODO as above, 0.9975 should be extracted to a config
              }
              market.autosell(rows);
            }
          });
        }
      });
    }

    if (dirty) {
      setTimeout(utility.updateOrders, 5 * 1000);
      dirty = false;
    }
    
    return;
  });
}
