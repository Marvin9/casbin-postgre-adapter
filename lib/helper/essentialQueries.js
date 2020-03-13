const casbinModel = require('./casbinModel');

const tableName = '__casbin_policy';

module.exports = {
  tableName,
  createTableIfNotExist: `CREATE TABLE IF NOT EXISTS ${tableName} (${casbinModel})`,
  loadPolicyQuery: `SELECT * FROM ${tableName}`,
  insertQuery: (obj) => {
    let insertTypes = '';
    let insertValues = '';

    Object.keys(obj).forEach((type) => {
      if (type === 'ptype') {
        insertTypes += 'p_type';
        insertValues += `'${obj[type]}'`;
      } else {
        insertTypes += `, ${type}`;
        insertValues += `, '${obj[type]}'`;
      }
    });

    const query = `INSERT INTO ${tableName} (${insertTypes}) VALUES (${insertValues})`;
    return query;
  },
};
