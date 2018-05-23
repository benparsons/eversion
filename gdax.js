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
var price = 0.07810;

var sellParams = {
  'price': price, // BTC 
  'size': size, // ETH 
  'product_id': 'ETH-BTC',
};

authedClient.sell(sellParams, (error, response, data) => {
  console.log(error);
  console.log(data);
});