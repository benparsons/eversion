var express = require('express');
var app = express();
var utility = require('./utility.js');

app.get("/status", async function (req, res) {
  utility.getDatabaseOrders((orderCounts) => {
    res.send(orderCounts);
  });
});

app.listen(2018, () => console.log("listening on :2018"));