var settings = require('./settings.js');
var logger = require('./logger.js');
logger.verbose("gdax_auth,listener", settings);
var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();
var market = require('./gdax.js');
var heartbeat_obj = {};


let db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  } else {
    console.log('Connected to the eversion database.');
  }
});

var websocket = market.websocket;

websocket.on('close', function() {
  websocket.connect();
});
websocket.on('error', function(a,b) { 
  console.log("websocket error"); 
  console.log(a); 
  console.log(b); 
});

websocket.on('message', function(data) {

  if (data.type === 'heartbeat') {
    heartbeat_obj = data;
    return;
  }
  logger.info("message", JSON.stringify(data, null, 0));
  if (data.type === 'subscriptions') { return; };

  storeEvent(data);
  if (data.type === 'done' && data.reason === 'filled') {
    if (data.side === 'sell') {
      var buyPrice = data.price * 0.9975; // -0.25%
      buyPrice = Number.parseFloat(buyPrice.toFixed(5));
      market.buy(buyPrice);
    }
  }
});

function storeEvent(data) {
  var sqlstring = "INSERT into events(type , order_id , order_type , size , price , side , product_id , sequence , user_id , profile_id , time , remaining_size , reason) VALUES (";
  sqlstring += "'" + data.type + "', "
  sqlstring += "'" + data.order_id + "', "
  sqlstring += "'" + data.order_type + "', "
  sqlstring += "'" + data.size + "', "
  sqlstring += "'" + data.price + "', "
  sqlstring += "'" + data.side + "', "
  sqlstring += "'" + data.product_id + "', "
  sqlstring += "'" + data.sequence + "', "
  sqlstring += "'" + data.user_id + "', "
  sqlstring += "'" + data.profile_id + "', "
  sqlstring += "'" + data.time + "', "
  sqlstring += "'" + data.remaining_size + "', "
  sqlstring += "'" + data.reason + "')"
  //console.log(sqlstring);
  db.run( sqlstring);


  sqlstring = "insert or replace into orders(type , order_id , order_type , size , price , side , product_id , sequence , user_id , profile_id , time , remaining_size , reason) VALUES (";
  sqlstring += "'" + data.type + "', "
  sqlstring += "'" + data.order_id + "', "
  sqlstring += "'" + data.order_type + "', "
  sqlstring += "'" + data.size + "', "
  sqlstring += "'" + data.price + "', "
  sqlstring += "'" + data.side + "', "
  sqlstring += "'" + data.product_id + "', "
  sqlstring += "'" + data.sequence + "', "
  sqlstring += "'" + data.user_id + "', "
  sqlstring += "'" + data.profile_id + "', "
  sqlstring += "'" + data.time + "', "
  sqlstring += "'" + data.remaining_size + "', "
  sqlstring += "'" + data.reason + "')"
  //console.log(sqlstring);
  db.run( sqlstring);
}

minuteAction();

var seconds = 60 ;
setInterval(minuteAction, 1000 * seconds);

function minuteAction() {
  logger.verbose("minuteAction", heartbeat_obj);
  market.getAccounts((error, response, data) => {
    if (error) {
      console.log(error);
      return;
    }
    //console.log(data);
    var eth_available = Number.parseFloat(
      data.find(o => o.currency === 'ETH').available
    );
    var sqlstring = "INSERT into accounts(eth_available, eth_hold, btc_available, btc_hold, time) VALUES (";
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'ETH').available) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'ETH').hold) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'BTC').available) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'BTC').hold) + ',';
    sqlstring += "'" + new Date().toISOString() + "')";
    //console.log(sqlstring);
    db.run( sqlstring);

    logger.verbose("currentETH", "ETH available: " + eth_available);
    if (eth_available >= 0.01) {
      logger.info("initiatingAutosell", "time to sell eth");
      db.all("SELECT price FROM orders WHERE type = 'open' AND side = 'sell'", function (err, rows) {
        if(err){
            console.log(err);
        }else{
          //console.log("min_sell_price: " + min_sell_price);
          market.autosell(rows);
        }
      });
    }

    return;
  });
}
