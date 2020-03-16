const { Helper } = require('casbin');
const { Pool } = require('pg');

const {
  createTableIfNotExist,
  loadPolicyQuery,
  insertQuery,
  deleteQuery,
} = require('./helper/essentialQueries');

/**
 * @typedef PostgreModel
 * @type {object}
 * @property {string} p_type
 * @property {?string} v0
 * @property {?string} v1
 * @property {?string} v2
 * @property {?string} v3
 * @property {?string} v4
 * @property {?string} v5
 */

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

  /**
   *
   * @param {string} v
   * @returns {string} -> if @v is not empty, it appends comma and space to @v
   */
  // eslint-disable-next-line class-methods-use-this
  addToText(v) {
    if (v) return `, ${v}`;
    return '';
  }

  /**
   *
   * @param {PostgreModel} line
   * @param {Object} model
   * @returns {void}
   */
  loadPolicyLine(line, model) {
    let text = line.p_type; // text -> 'p' (for example)

    const toBeAdd = [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5];

    toBeAdd.forEach((v) => {
      // text -> 'p, value'. ', value' or '' is added during each iteration.
      text += this.addToText(v);
    });

    Helper.loadPolicyLine(text, model);
  }

  /**
   *
   * @param {Object} model
   * @returns {void}
   */
  async loadPolicy(model) {
    const lines = await this.query(loadPolicyQuery);
    lines.rows.forEach((line) => {
      this.loadPolicyLine(line, model);
    });
  }

  /**
   *
   * @param {string} ptype
   * @param {Array.<string>} rule
   * @returns {PostgreModel}
   */
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

    return model;
  }

  /**
   *
   * @param {Object} model
   */
  async savePolicy(model) {
    const policyRule = model.model.get('p');
    const groupPolicy = model.model.get('g');

    const bulkInsert = [];
    let generatedInsertQuery;

    policyRule.forEach((rule) => {
      const ast = rule;
      ast.policy.forEach(async (policy) => {
        generatedInsertQuery = insertQuery(this.savePolicyLine(rule.key, policy));
        bulkInsert.push(generatedInsertQuery);
      });
    });

    groupPolicy.forEach((rule) => {
      const ast = rule;
      ast.policy.forEach(async (policy) => {
        generatedInsertQuery = insertQuery(this.savePolicyLine(rule.key, policy));
        bulkInsert.push(generatedInsertQuery);
      });
    });

    await this.query(bulkInsert.join(';'));
  }

  async addPolicy(sec, ptype, rule) {
    const query = insertQuery(this.savePolicyLine(ptype, rule));
    await this.query(query);
  }

  async removePolicy(sec, ptype, rule) {
    const query = deleteQuery(this.savePolicyLine(ptype, rule));
    await this.query(query);
  }

  /**
   * -> Create new Pool
   * -> connect database through pool
   * -> check if table for casbin exists, if not then create it first.
   * -> query @qry using connection
   * -> release connection
   * -> end Pool
   * @param {string} qry a query to be executed on database.
   * @returns {Array.<Array.<string>> | boolean}
   */
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
