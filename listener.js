var settings = require('./settings.js');
var logger = require('./logger.js');
var sqlgen = require('./sqlgen.js');
logger.verbose("gdax_auth,listener", settings);
var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();
// TODO make market global same as db and graphite
var market = require('./gdax.js');
var utility = require('./utility.js');
var heartbeat_obj = {};
var dirty = false;
var graphite = require('graphite');
global.graphite = graphite.createClient('plaintext://localhost:2003/');
var fs = require('fs');

global.db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    logger.error("DB", err.message);
  } else {
    logger.verbose("DB", 'Connected to the eversion database.');
  }
});

var websocket = market.websocket;

websocket.on('close', function(err) {
  logger.error("websocket,close", err);
  websocket.connect();
});
websocket.on('error', function(err) { 
  logger.error("websocket,error", err);
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

  global.db.run(sqlString);
}

minuteAction();

var seconds = 60 ;
setInterval(minuteAction, 1000 * seconds);

function minuteAction() {
  global.graphite.write({"heartbeat-last_trade_id": heartbeat_obj.last_trade_id}, function(err) {
    if (err) { logger.error("graphite", err); }
  });
  utility.getDatabaseOrders((orders) => {
    global.graphite.write(orders, function(err) {
      if (err) { logger.error("graphite", err); }
    });
  });

  global.config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  global.graphite.write({config: global.config}, function(err) {
    if (err) { logger.error("graphite", err); }
  });

  market.getAccounts((error, response, data) => {
    if (error) {
      logger.error("getAccounts", error);
      return;
    }
    
    var accounts = {
      ethAvailable: Number.parseFloat(data.find(o => o.currency === 'ETH').available),
      ethHold: Number.parseFloat(data.find(o => o.currency === 'ETH').hold),
      btcAvailable: Number.parseFloat(data.find(o => o.currency === 'BTC').available),
      btcHold: Number.parseFloat(data.find(o => o.currency === 'BTC').hold)
    };
    // TODO wrap this
    global.graphite.write({accounts: accounts}, function(err) {
      if (err) { logger.error("graphite", err); }
    });
    // TODO if there is more than x btcAvailable, we should make a small buy
    if (accounts.ethAvailable >= global.config.basicSize) {
      dirty = true;
      logger.info("initiatingAutosell", "time to sell eth");
      processAutosell();
    }

    if (dirty) {
      setTimeout(utility.updateOrders, 5 * 1000);
      dirty = false;
    }
    
    return;
  });
}

function processAutosell() {
  var sqlGetHighestBuy = "SELECT price FROM orders  WHERE side = 'buy' AND type = 'open' ORDER BY price DESC LIMIT 1";
  var highestBuy = 0;
  global.db.get(sqlGetHighestBuy, function(err, value) {
    if (err) {
      logger.error("sqlGetHighestBuy", err);
      return;
    }

    if (value && value.price) {
      highestBuy = value.price;
      global.graphite.write({highestBuy: highestBuy}, function(err) {
        if (err) { logger.error("graphite", err); }
      });
    }
    global.db.all("SELECT price FROM orders WHERE type = 'open' AND side = 'sell'", function (err, rows) {
      if(err){
          logger.error("sqlGetOpenSells", err);
      }else{
        var lowestSell = Math.min.apply(null,rows.map(r => r.price));
        global.graphite.write({lowestSell: lowestSell}, function(err) {
          if (err) { logger.error("graphite", err); }
        });
        if (highestBuy) {
          // TODO pushing these into rows should be optional
          logger.verbose("highestBuyAsASell", "push to rows");
          rows.push({price : highestBuy});
          rows.push({price : highestBuy * (1/0.9975)}); // as sell
          // TODO as above, 0.9975 should be extracted to a config
        }
        market.autosell(rows);
      }
    });
    
  });
}

tenMinuteAction();

setInterval(tenMinuteAction, 1000 * seconds * 10);

function tenMinuteAction() {
  utility.logMarketAndOrderStatus();

  // TODO database stats and maintenance report
  // * find any duplicate prices
  // * measure the spread between orders (sell and buy separate)
}