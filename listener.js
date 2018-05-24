var settings = require('./settings.js');
console.log(settings);
var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();
var market = require('./gdax.js');


let db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the eversion database.');
});

var websocket = market.websocket;

websocket.on('close', function() {
  logger.log("technical", "websocket close", null);
  websocket.connect();
});
websocket.on('error', function(a,b) { 
  console.log("websocket error"); 
  console.log(a); 
  console.log(b); 
});

websocket.on('message', function(data) {

  if (data.type === 'heartbeat') { return; };
  console.log(JSON.stringify(data, null, 2));
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
  console.log(sqlstring);
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
  console.log(sqlstring);
  db.run( sqlstring);
}

minuteAction();

var seconds = 60 ;
setInterval(minuteAction, 1000 * seconds);

function minuteAction() {
  console.log(new Date());
  market.getAccounts((error, response, data) => {
    console.log(error);
    console.log(data);
    var eth_available = Number.parseFloat(
      data.find(o => o.currency === 'ETH').available
    );
    var sqlstring = "INSERT into accounts(eth_available, eth_hold, btc_available, btc_hold, time) VALUES (";
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'ETH').available) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'ETH').hold) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'BTC').available) + ',';
    sqlstring += Number.parseFloat(data.find(o => o.currency === 'BTC').hold) + ',';
    sqlstring += "'" + new Date().toISOString() + "')";
    console.log(sqlstring);
    db.run( sqlstring);

    console.log("ETH available: " + eth_available);
    if (eth_available >= 0.01) {
      console.log("time to sell eth");
      market.autosell();
    }
    return;
  });
}
