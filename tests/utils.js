const casbin = require('casbin');
const pgAdapter = require('../lib/adapter');
const { loadPolicyQuery } = require('../lib/helper/essentialQueries');

const connectionURI = 'postgresql://postgres: @localhost:5432/temp';

const createEnforcer = async (conf) => {
  const adapter = await pgAdapter.newAdapter(connectionURI);
  return casbin.newEnforcer(conf, adapter);
};

const isEmptyDatabase = async (client) => {
  const { rowCount } = await (await client.query(loadPolicyQuery));
  return rowCount === 0;
};

module.exports = {
  createEnforcer,
  isEmptyDatabase,
};
