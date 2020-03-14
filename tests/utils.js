const casbin = require('casbin');
const fs = require('fs');
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

const policyToArray = (filePath) => {
  const csvData = fs.readFileSync(filePath, 'utf8');
  const csvArray = csvData.trim().split('\n');
  for (let i = 0, iBound = csvArray.length; i < iBound; i += 1) {
    csvArray[i] = csvArray[i].split(', ');
  }
  return csvArray;
};

module.exports = {
  createEnforcer,
  isEmptyDatabase,
  policyToArray,
};
