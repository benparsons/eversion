var Gdax = require('gdax');
const sqlite3 = require('sqlite3').verbose();
var market = require('./gdax.js');
var sqlgen = require('./sqlgen.js');
var logger = require('./logger.js');


let db = new sqlite3.Database('./eversion.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
  if (err) {
    console.log(err);
    process.exit();
  } else {
    console.log('Connected to the eversion database.');
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
    
      console.log(sqlString);
      db.run(sqlString);
    });
  });
}


module.exports = { updateOrders: updateOrders }