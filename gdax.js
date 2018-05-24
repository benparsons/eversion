
var settings = require('./settings.js');
console.log(settings);

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

var autosell = function() {
  publicClient.getProductTicker('ETH-BTC', (error, response, data) => {
    console.log(error);
    console.log(data);
    console.log(data.ask);
    sell(Number.parseFloat(data.ask));
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
    'cancel_after': 'hour'
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
