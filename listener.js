var settings = require('./settings.js');
console.log(settings);
var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the eversion database.');
});

const websocket = new Gdax.WebsocketClient(
  ['ETH-BTC'],
  'wss://ws-feed.gdax.com',
  settings,
  { channels: ['user'] }
);
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
//if (data.type==='open') {

//}
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


var seconds = 60 ;
setInterval(printTime, 1000 * seconds);

function printTime() {
    console.log(new Date());
}
