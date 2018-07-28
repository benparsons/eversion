var debug = false;

var error = function(tag, message) {
  write("ERROR", tag, message);
};

var info = function(tag, message) {
  write("INFO", tag, message);
};

var verbose = function(tag, message) {
  write("VERBOSE", tag, message);
};

var debug = function(tag, message) {
  if (!debug) return;
  write("DEBUG", tag, message);
};

function write(level, tag, message) {
  var delimiter = "\t";
  var output = (new Date()).toISOString();
  output += delimiter;
  output += tag;
  output += delimiter;
  output += level;
  output += delimiter;
  if (typeof(message) === 'object') {
    output += JSON.stringify(message, null, 0);
  } else {
    output += message;
  }
  console.log(output);
}

module.exports = {
  error: error,
  info: info,
  verbose: verbose
};
