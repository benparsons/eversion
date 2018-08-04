var Gdax = require('gdax');
var market = require('./gdax.js');
var sqlgen = require('./sqlgen.js');
var logger = require('./logger.js');

function updateOrders() {
  market.getOrders(function(orders) {
    logger.verbose("updateOrders", {numOfOrders: orders.length});
    logger.debug("getOrders", JSON.stringify(orders));
    
    var previousDate = (new Date()).toISOString();
    orders.forEach(order => {
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
      global.db.run(sqlString);
    });
    var deleteSqlString = "DELETE FROM orders WHERE last_updated < '" + previousDate + "'";
    global.db.run(deleteSqlString);
  });
}

function getDatabaseOrders(callback) {
  global.db.all("SELECT side FROM orders WHERE type='open'", function(err, rows) {
    if (err) {
      logger.error("getDatabaseOrders", err);
      return;
    }
    var sells = rows.filter(o => o.side === 'sell').length;
    var buys = rows.filter(o => o.side === 'buy').length;
    var result = {sells:sells, buys:buys, allOrders: sells+buys};
    if (typeof(callback) === 'function')
      callback(result);
  });
}

function logMarketAndOrderStatus() {
  market.getProductTicker('ETH-BTC', (data) => {
    global.graphite.write({ethBtcTicker: data}, function(err) {
      if (err) { logger.error("graphite", err); }
    });
  });

  var sqlGetLowestBuy = "SELECT price FROM orders  WHERE side = 'buy' AND type = 'open' ORDER BY price ASC LIMIT 1";
  global.db.get(sqlGetLowestBuy, function(err, value) {
    if (err) {
      logger.error("logMarketAndOrderStatus,sqlGetLowestBuy", err);
    } else if (value && value.price) {
      global.graphite.write({lowestBuy: value.price}, function(err) {
        if (err) { logger.error("graphite", err); }
      });
    }
  });

  var sqlGetHighestBuy = "SELECT price FROM orders  WHERE side = 'buy' AND type = 'open' ORDER BY price DESC LIMIT 1";
  global.db.get(sqlGetHighestBuy, function(err, value) {
    if (err) {
      logger.error("logMarketAndOrderStatus,sqlGetHighestBuy", err);
    } else if (value && value.price) {
      global.graphite.write({highestBuy: value.price}, function(err) {
        if (err) { logger.error("graphite", err); }
      });
    }
  });

  var sqlGetLowestSell = "SELECT price FROM orders  WHERE side = 'sell' AND type = 'open' ORDER BY price ASC LIMIT 1";
  global.db.get(sqlGetLowestSell, function(err, value) {
    if (err) {
      logger.error("logMarketAndOrderStatus,sqlGetLowestSell", err);
    } else if (value && value.price) {
      global.graphite.write({lowestSell: value.price}, function(err) {
        if (err) { logger.error("graphite", err); }
      });
    }
  });

  var sqlGetHighestSell = "SELECT price FROM orders  WHERE side = 'sell' AND type = 'open' ORDER BY price DESC LIMIT 1";
  global.db.get(sqlGetHighestSell, function(err, value) {
    if (err) {
      logger.error("logMarketAndOrderStatus,sqlGetHighestSell", err);
    } else if (value && value.price) {
      global.graphite.write({highestSell: value.price}, function(err) {
        if (err) { logger.error("graphite", err); }
      });
    }
  });
}

function logSellCountByHour() {
  var sqlGetSellCountByHour = "select substr(expire_time, 12, 2) as hour, count(*) as count from orders where side = 'sell' group by 1 order by 1";
  db.all(sqlGetSellCountByHour, function (err, rows) {
    if(err){
        logger.error("logSellCountByHour", err);
    } else {
      var output = {};
      rows.forEach(row => {
        output["h" + row.hour] = row.count;
      });
      console.log(output);
      global.graphite.write({sellCountByHour: output}, function(err) {
        if (err) { logger.error("graphite", err); }
      });
    }
  });
}

module.exports = { 
  updateOrders: updateOrders,
  getDatabaseOrders: getDatabaseOrders,
  logMarketAndOrderStatus: logMarketAndOrderStatus,
  logSellCountByHour: logSellCountByHour
};
