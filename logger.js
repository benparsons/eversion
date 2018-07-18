var error = function(tag, message) {
  write("ERROR", tag, message);
};

var info = function(tag, message) {
  write("INFO", tag, message);
};

var verbose = function(tag, message) {
  write("VERBOSE", tag, message);
};

function write(level, tag, message) {
  var output = (new Date()).toISOString();
  output += " - ";
  output += tag;
  output += " - ";
  output += level;
  output += " - ";
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
