const { Client } = require('pg');
const { newEnforcer } = require('casbin');
const ctoj = require('csvtojson');
const PostgreAdapter = require('../lib/adapter');
const {
  createEnforcer,
  isEmptyDatabase,
} = require('./utils');

const connectionURI = 'postgresql://postgres: @localhost:5432/temp';
const pgClient = new Client(connectionURI);

const {
  tableName,
  loadPolicyQuery,
} = require('../lib/helper/essentialQueries');

const basicModal = './config/basic_modal.conf';
const rbacModal = './config/rbac_modal.conf';
const rbacRules = './config/rbac_policy.csv';

beforeEach(async () => {
  await pgClient.query(`DELETE FROM ${tableName}`);
});

beforeAll(async () => {
  await pgClient.connect();
});

afterAll(async () => {
  await pgClient.end();
});

test('adapter should properly connected to database', async () => {
  try {
    const client = new PostgreAdapter(connectionURI);
    await client.open();
    await client.close();
  } catch (err) {
    throw new Error(err.message);
  }
});

test('adapter should properly load policy -> loadPolicy()', async () => {
  const enf = await createEnforcer(basicModal);

  expect(await enf.getPolicy()).toStrictEqual([]);

  // Database also should be clean
  expect(await isEmptyDatabase(pgClient)).toBeTruthy();

  // Stuck with this issue
  // If I don't manualy close this, process runs forever
  await enf.getAdapter().close();
});

test('adapter should properly store new policies -> loadPolicy() + addPolicy()', async () => {
  const enf = await createEnforcer(basicModal);

  // database should be clear first
  expect(await isEmptyDatabase(pgClient)).toBeTruthy();

  // enforcer must contain this policy
  expect(await enf.addPolicy('sub', 'obj', 'act')).toBeTruthy();

  const addedPolicy = ['sub', 'obj', 'act'];
  // enforcer must load above(added) policy
  expect(await enf.getPolicy()).toStrictEqual([addedPolicy]);

  const condition = "p_type='p' AND v0='sub' AND v1='obj' AND v2='act'";
  // database must contain policy added by enforcer
  expect(await (await pgClient.query(`${loadPolicyQuery} WHERE ${condition}`)).rowCount).toBe(1);

  await enf.getAdapter().close();
});

/*
test('adapter should properly store new policy rules from file', async () => {
  const adapter = await PostgreAdapter.newAdapter(connectionURI);

  // load rbac policy through file adapter
  const enforcer = await newEnforcer(rbacModal, rbacRules);

  // Database is empty
  expect(await isEmptyDatabase(pgClient)).toBeTruthy();

  // load that(file adapter's) policy into db adapter
  expect(await adapter.savePolicy(await enforcer.getModel())).toBeTruthy();

  const csvToJson = await ctoj().fromFile(rbacRules);
  // db adapter should load, saved policies
  console.log(csvToJson);

  adapter.close();
});
*/
