import { readFileSync } from 'fs';
import * as casbin from 'casbin';
import { PostgreAdapter } from '../lib/adapter';
import queries from '../lib/helper/essentialQueries';
import { Pool } from 'pg';

export const connectionURI = 'postgresql://postgres@localhost:5432/temp';

export const createEnforcer = async (conf) => {
  const adapter = await PostgreAdapter.newAdapter(connectionURI);
  return casbin.newEnforcer(conf, adapter);
};

export const isEmptyDatabase = async (client: Pool) => {
  const { rowCount } = await (await client.query(queries.loadPolicyQuery));
  return rowCount === 0;
};

export const policyToArray = (filePath) => {
  const csvData = readFileSync(filePath, 'utf8');
  const csvArray: any = csvData.trim().split('\n');
  for (let i = 0, iBound = csvArray.length; i < iBound; i += 1) {
    csvArray[i] = csvArray[i].split(', ');
  }
  return csvArray;
};
