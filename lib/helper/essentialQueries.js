const casbinModel = require('./casbinModel');

module.exports = {
  createTableIfNotExist: `CREATE TABLE IF NOT EXISTS __casbin_policy (${casbinModel})`,
};
