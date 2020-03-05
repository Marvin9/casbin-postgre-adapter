const casbinModel = require('./casbinModel');

const tableName = '__casbin_policy';

module.exports = {
  createTableIfNotExist: `CREATE TABLE IF NOT EXISTS ${tableName} (${casbinModel})`,
  loadPolicyQuery: `SELECT * FROM ${tableName}`,
};
