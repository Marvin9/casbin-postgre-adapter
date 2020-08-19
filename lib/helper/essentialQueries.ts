import casbinModel from './casbinModel';
import { PostgreModel } from '../adapter';

const tableName = '__casbin_policy';

export default {
  tableName,
  createTableIfNotExist: `CREATE TABLE IF NOT EXISTS ${tableName} (${casbinModel})`,
  loadPolicyQuery: `SELECT * FROM ${tableName}`,
  insertQuery: (obj: PostgreModel): string => {
    let insertTypes = '';
    let insertValues = '';

    Object.keys(obj).forEach((type) => {
      if (type === 'p_type') {
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
  deleteQuery: (obj: PostgreModel): string => {
    const keyValue = [];

    Object.keys(obj).forEach((columnName) => {
      let pair;
      if (columnName === 'p_type') pair = `p_type='${obj[columnName]}'`;
      else pair = `${columnName}='${obj[columnName]}'`;
      keyValue.push(pair);
    });

    const query = `DELETE FROM ${tableName} WHERE ${keyValue.join(' AND ')};`;
    return query;
  },
};
