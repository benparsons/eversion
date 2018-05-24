
var settings = require('./settings.js');
console.log(settings);

var Gdax = require('gdax');

var publicClient = new Gdax.PublicClient('ETH-BTC');

var authedClient = new Gdax.AuthenticatedClient(
  settings.key,
  settings.b64secret,
  settings.passphrase,
  settings.apiURI);

var size = '0.01';

var sell = function(price) {
  var sellParams = {
    'price': price, // BTC 
    'size': size, // ETH 
    'product_id': 'ETH-BTC',
  };

  authedClient.sell(sellParams, (error, response, data) => {
    console.log(error);
    console.log(data);
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
  });
}

sell(0.07855);