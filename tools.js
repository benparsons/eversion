var utility = require('./utility.js');

if (process.argv[2]) {
    utility[process.argv[2]]();
} else {
    console.log("command needed");
}