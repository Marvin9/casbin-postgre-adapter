const { Helper } = require('casbin');
const { Client } = require('pg');

const {
  createTableIfNotExist,
  loadPolicyQuery,
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
      this.postgreClient = new Client(connectionURI);
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
    await adapter.open();
    return adapter;
  }

  /**
   * @returns {Promise} connect client & create table named __casbin_policy if not exist.
   */
  async open() {
    try {
      await this.postgreClient.connect();
      await this.postgreClient.query(createTableIfNotExist);
    } catch (clientOpenError) {
      throw new Error(clientOpenError.message);
    }
  }

  // eslint-disable-next-line class-methods-use-this
  addToText(v) {
    if (v) return `, ${v}`;
    return '';
  }

  loadPolicyLine(line, model) {
    let text = line.p_type;

    const toBeAdd = [line.v0, line.v1, line.v2, line.v3, line.v4, line.v5];

    toBeAdd.forEach((v) => {
      text += this.addToText(v);
    });

    Helper.loadPolicyLine(text, model);
  }

  async loadPolicy(model) {
    const lines = await this.postgreClient.query(loadPolicyQuery);
    lines.rows.forEach((line) => {
      this.loadPolicyLine(line, model);
    });
  }

  async close() {
    await this.postgreClient.end();
  }
}

module.exports = PostgreAdapter;
