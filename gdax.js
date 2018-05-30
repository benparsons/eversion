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
  console.log(sell_prices);
  publicClient.getProductTicker('ETH-BTC', (error, response, data) => {
    // console.log(error);
    // console.log(data);
    // console.log(data.ask);
    var target = Number.parseFloat(data.ask);
    var done = false;
    while (!done) {
      var higher_prices = sell_prices.filter(price => price.price >= target && price.price < target * 1.001);
      var lower_prices = sell_prices.filter(price => price.price <= target && price.price > target * 0.999);
      if (higher_prices.length > 0 || lower_prices.length > 0) {
        console.log(target);
        console.log((new Date()).toISOString() + " - lower_prices - " + JSON.stringify(lower_prices));
        console.log((new Date()).toISOString() + " - higher_prices - " + JSON.stringify(higher_prices));
        target *= 1.001;
      }
      else {
        console.log("would sell for " + target);
        sell(Number.parseFloat(target.toFixed(5)));
        done = true;
      }
    }



    return;
  });
}

var sell = function(price) {
  var sellParams = {
    'price': price, // BTC 
    'size': size, // ETH 
    'product_id': 'ETH-BTC',
    'post_only': true,
    'time_in_force': 'GTT',
    'cancel_after': 'day'//'hour'
  };

  authedClient.sell(sellParams, (error, response, data) => {
    console.log(error);
    console.log(data);
    return;
  });
}

var buy = function(price) {
  var buyParams = {
    'price': price, // BTC 
    'size': size, // ETH 
    'product_id': 'ETH-BTC',
  };

  authedClient.buy(buyParams, (error, response, data) => {
    console.log(error);
    console.log(data);
    return;
  });
}

var getAccounts = function(callback) {
  authedClient.getAccounts(callback);
}

module.exports = {
  websocket: websocket,
  sell: sell,
  buy: buy,
  getAccounts: getAccounts,
  autosell: autosell
}
