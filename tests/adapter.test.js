const { Client } = require('pg');
const { newEnforcer } = require('casbin');
const ctoj = require('csvtojson');
const PostgreAdapter = require('../lib/adapter');
const {
  createEnforcer,
  isEmptyDatabase,
  policyToArray,
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

let executeBeforeEach = false;

beforeEach(async () => {
  if (executeBeforeEach) {
    await pgClient.query(`DELETE FROM ${tableName}`);
  }
});

beforeAll(async () => {
  await pgClient.connect();

  // if table exist then delete it.
  pgClient.query(`SELECT * FROM ${tableName}`, async (err, resp) => {
    if (resp) await pgClient.query(`DELETE FROM ${tableName}`);
  });
});

afterAll(async () => {
  await pgClient.end();
});

test('adapter should properly load policy -> loadPolicy()', async () => {
  const enf = await createEnforcer(basicModal);

  expect(await enf.getPolicy()).toStrictEqual([]);

  // Database also should be clean
  expect(await isEmptyDatabase(pgClient)).toBeTruthy();

  executeBeforeEach = true;
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
});

test('adapter should properly store new policy rules from file', async () => {
  const adapter = await PostgreAdapter.newAdapter(connectionURI);

  // load rbac policy through file adapter
  let enforcer = await newEnforcer(rbacModal, rbacRules);

  // Database is empty
  expect(await isEmptyDatabase(pgClient)).toBeTruthy();

  // load that(file adapter's) policy into db adapter
  await adapter.savePolicy(await enforcer.getModel());

  const policyArray = policyToArray(rbacRules);

  // Database should contain all saved policies (in this case csvToJson)
  const policiesInDb = await (await pgClient.query(loadPolicyQuery)).rows;

  policiesInDb.forEach((row, i) => {
    Object.keys(row).forEach((columnName, j) => {
      const value = row[columnName];
      if (value !== null) {
        expect(value).toBe(policyArray[i][j]);
      }
    });
  });

  await enforcer.clearPolicy();
  expect(await enforcer.getPolicy()).toStrictEqual([]);

  // adapter contains policy rules of rbac_policy.csv file
  enforcer = await newEnforcer(rbacModal, adapter);

  const policiesInEnfocer = await enforcer.getPolicy();
  for (let i = 0, k = 0, iBound = policyArray.length; i < iBound; i += 1) {
    if (policyArray[i][0] !== 'g') {
      for (let j = 1, jBound = policyArray[i].length; j < jBound; j += 1) {
        expect(policyArray[i][j]).toBe(policiesInEnfocer[k][j - 1]);
      }
      k += 1;
    }
  }
});
