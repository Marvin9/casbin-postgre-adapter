const { Helper } = require('casbin');
const { Pool } = require('pg');

const {
  createTableIfNotExist,
  loadPolicyQuery,
  insertQuery,
} = require('./helper/essentialQueries');

/**
 * PostgreAdapter
 */
class PostgreAdapter {
  /**
   *
   * @param {string} connectionURI
   * https://www.postgresql.org/docs/9.3/libpq-connect.html#AEN39692
   */
  constructor(connectionURI) {
    // TODO -> validation for connectionURI
    try {
      this.connectionURI = connectionURI;
      this.pool = null;
      this.postgreClient = null;
      this.checkIfTableExist = false;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   *
   * @param {string} connectionURI
   * @returns {Object} returns connected adapter.
   */
  static async newAdapter(connectionURI) {
    // TODO -> validation of connectionURI
    const adapter = new PostgreAdapter(connectionURI);
    // await adapter.open();
    return adapter;
  }

  // eslint-disable-next-line class-methods-use-this
  addToText(v) {
    if (v) return `, ${v}`;
    return '';
  }

  loadPolicyLine(line, model) {
    let text = line.p_type; // text -> 'p' (for example)

    const toBeAdd = [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5];

    toBeAdd.forEach((v) => {
      // text -> 'p, value'. ', value' or '' is added during each iteration.
      text += this.addToText(v);
    });

    Helper.loadPolicyLine(text, model);
  }

  async loadPolicy(model) {
    const lines = await this.query(loadPolicyQuery);
    lines.rows.forEach((line) => {
      this.loadPolicyLine(line, model);
    });
  }

  // eslint-disable-next-line class-methods-use-this
  savePolicyLine(ptype, rule) {
    // model -> { ptype: 'p' }
    const model = { ptype };

    const assign = ['v0', 'v1', 'v2', 'v3', 'v4', 'v5'];
    let i = 0;

    while (i < assign.length) {
      const assignee = assign[i]; // eslint-disable-line
      if (rule.length > i) {
        Object.assign(model, {
          [assignee]: rule[i],
        });
      } else break;
      i += 1;
    }

    return insertQuery(model);
  }

  async savePolicy(model) {
    const policyRule = model.model.get('p');
    const groupPolicy = model.model.get('g');

    const bulkInsert = [];
    policyRule.forEach((rule) => {
      const ast = rule;
      ast.policy.forEach(async (policy) => {
        bulkInsert.push(this.savePolicyLine(rule.key, policy));
      });
    });

    groupPolicy.forEach((rule) => {
      const ast = rule;
      ast.policy.forEach(async (policy) => {
        bulkInsert.push(this.savePolicyLine(rule.key, policy));
      });
    });

    await this.query(bulkInsert.join(';'));
  }

  async addPolicy(sec, ptype, rule) {
    const query = this.savePolicyLine(ptype, rule);
    await this.query(query);
  }

  async query(qry) {
    let output;
    try {
      this.pool = new Pool({ connectionString: this.connectionURI });
      this.postgreClient = await this.pool.connect();
      if (!this.checkIfTableExist) {
        await this.postgreClient.query(createTableIfNotExist);
        this.checkIfTableExist = true;
      }
      output = await this.postgreClient.query(qry);
    } catch (Err) {
      throw new Error(Err.message);
    } finally {
      await this.postgreClient.release();
      await this.pool.end();
    }
    return output;
  }
}

module.exports = PostgreAdapter;
