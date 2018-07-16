function insertOrReplaceSql(tableName, obj) {
  var keys = Object.keys(obj);
  var sql = `INSERT OR REPLACE INTO ${tableName} (`;
  sql += keys.join(', ');
  sql += ') VALUES (';
  var values = [];
  keys.forEach(field => {
    var value = obj[field];
    if (! value)
      values.push('null');
    else if (typeof(value) === "boolean")
      values.push(`'${value}'`);
    else if (! isNaN(value))
      values.push(value);
    else
      values.push(`'${value}'`);
  });
  sql += values.join(', ')
  sql += ')';
  return sql;
}

module.exports = {
  insertOrReplaceSql: insertOrReplaceSql
}
  