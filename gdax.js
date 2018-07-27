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

var size = '0.01';

var autosell = function(sell_prices) {
  logger.info("autosellPriceList", sell_prices);
  publicClient.getProductTicker('ETH-BTC', (error, response, data) => {
    var target = Number.parseFloat(data.ask);
    var done = false;
    while (!done) {
      var higher_prices = sell_prices.filter(price => price.price >= target && price.price < target * 1.001);
      var lower_prices = sell_prices.filter(price => price.price <= target && price.price > target * 0.999);
      if (higher_prices.length > 0 || lower_prices.length > 0) {
        logger.verbose("autosellRestrainedAt", target);
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
    'size': size, // ETH 
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

var buy = function(price) {
  if (! settings.liveTrade) { return; }
  
  var buyParams = {
    'price': price, // BTC 
    'size': size, // ETH 
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

var getOrders = function(callback) {
  authedClient.getOrders(callback);
};

module.exports = {
  websocket: websocket,
  sell: sell,
  buy: buy,
  getAccounts: getAccounts,
  autosell: autosell,
  getOrders: getOrders
};
