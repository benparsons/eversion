var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();
var market = require('./gdax.js');
var sqlgen = require('./sqlgen.js');
var logger = require('./logger.js');


let db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    logger.error("DB", err.message);
  } else {
    logger.verbose("DB", 'Connected to the eversion database.');
  }
});

function updateOrders() {
  logger.verbose("utility", "updateOrders()");
  logger.info("warning", "updateOrders only reads the first page");
  market.getOrders(function(err, res, data) {
    if (err) {
      logger.error("getOrders", JSON.stringify(err));
      return;
    }
    
    logger.verbose("getOrders", JSON.stringify(data));
    // TODO instead of DELETEing everything up front, save the current
    // datetime and delete everything that doesn't get updated/created
    // in the loop below
    db.run("DELETE FROM orders");
    data.forEach(order => {
      var order = {
        type:	'open',
        order_id:	order.id,
        order_type: order.type,
        size:	order.size,
        price:	order.price,
        side:	order.side,
        product_id:	order.product_id,
        remaining_size:	order.remaining_size,
        reason:	order.reason,
        expire_time: order.expire_time,
        post_only: order.post_only,
        settled: order.settled,
        last_updated: (new Date()).toISOString()
      };
      
      var sqlString = sqlgen.insertOrReplaceSql('orders', order);
    
      db.run(sqlString);
    });
  });
}

function getDatabaseOrders(callback) {
  db.all("SELECT side FROM orders WHERE type='open'", function(err, rows) {
    var sells = rows.filter(o => o.side === 'sell').length;
    var buys = rows.filter(o => o.side === 'buy').length;
    var result = {sells:sells, buys:buys};
    if (typeof(callback) === 'function')
      callback(result);
  });
}


module.exports = { 
  updateOrders: updateOrders,
  getDatabaseOrders: getDatabaseOrders
};
