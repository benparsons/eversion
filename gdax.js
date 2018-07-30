var settings = require('./settings.js');
var logger = require('./logger.js');
logger.verbose("gdax_auth,gdax", settings);

var Gdax = require('gdax');

var publicClient = new Gdax.PublicClient('ETH-BTC');

var authedClient = new Gdax.AuthenticatedClient(
  settings.key,
  settings.b64secret,
  settings.passphrase,
  settings.apiURI);

const websocket = new Gdax.WebsocketClient(
  ['ETH-BTC'],
  'wss://ws-feed.gdax.com',
  settings,
  { channels: ['user'] }
);

var autosell = function(sell_prices) {
  logger.debug("autosellPriceList", sell_prices);
  publicClient.getProductTicker('ETH-BTC', (error, response, data) => {
    global.graphite.write({ethBtcTicker: data}, function(err) {
      if (err) { logger.error("graphite", err); }
    });
    var target = Number.parseFloat(data.ask);
    var done = false;
    while (!done) {
      // TODO the 0.999 / 1.001 values should be stored as a global setting, then created 1-setting, 1+setting
      var blocking_prices = sell_prices.filter(price => price.price > target * 0.999 && price.price < target * 1.001);
      if (blocking_prices.length > 0) {
        logger.debug("autosellRestrained", {target: target, blocking_prices: blocking_prices});
        target *= 1.001;
      }
      else {
        logger.info("autosellResult", target);
        sell(Number.parseFloat(target.toFixed(5)));
        done = true;
      }
    }

    return;
  });
};

var sell = function(price) {
  if (! settings.liveTrade) { return; }

  var sellParams = {
    'price': price, // BTC 
    'size': global.config.basicSize.toString(), // ETH 
    'product_id': 'ETH-BTC',
    'post_only': true,
    'time_in_force': 'GTT',
    'cancel_after': 'day'//'hour'
  };

  authedClient.sell(sellParams, (error, response, data) => {
    if (error) { 
      logger.error("sell", error);
      return;
    }
    logger.info("sell", data);
    return;
  });
};

var autobuy = function() {
  if (! settings.liveTrade) { return; }

  publicClient.getProductTicker('ETH-BTC', (error, response, data) => {    
    global.graphite.write({ethBtcTicker: data}, function(err) {
      if (err) { logger.error("graphite", err); }
    });
    buy(data.bid);
  });
};

// TODO buy should take a size
var buy = function(price) {
  if (! settings.liveTrade) { return; }
  
  var buyParams = {
    'price': price, // BTC 
    'size': global.config.basicSize.toString(), // ETH 
    'product_id': 'ETH-BTC',
  };

  authedClient.buy(buyParams, (error, response, data) => {
    if (error) {
      logger.error("buy", error);
    }
    if (data) {
      logger.info("buy", data);
    }
    return;
  });
};

var getAccounts = function(callback) {
  authedClient.getAccounts(callback);
};

var getOrders = function(callback, orders, after) {
  if (! orders) orders = [];
  if (! after) after = {};

  authedClient.getOrders(after, function(err, res, data) {
    if (err) {
      logger.error("gdax,getOrders", JSON.stringify(err));
      return;
    }
    orders = orders.concat(data);
    if (data.length === 100) {
      getOrders(callback, orders, {after: res.headers['cb-after']});
    }
    else {
      callback(orders);
    }
  });
};

var getProductTicker = function(product, callback) {
  publicClient.getProductTicker(product, (error, response, data) => {
    if (error) {
      logger.error("getProductTicker", error);
      return;
    }

    callback(data);
  });
};

module.exports = {
  websocket: websocket,
  sell: sell,
  buy: buy,
  getAccounts: getAccounts,
  autosell: autosell,
  autobuy: autobuy,
  getOrders: getOrders,
  getProductTicker: getProductTicker
};
