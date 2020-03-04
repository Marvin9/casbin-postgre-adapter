const { Client } = require('pg');

const {
  createTableIfNotExist,
} = require('./helper/essentialQueries');

/**
 * PostgreAdapter
 */
class PostgreAdapter {
  /**
   *
   * @param {Object} postgreClientConfig
   * see config options here https://node-postgres.com/api/client
   */
  constructor(postgreClientConfig) {
    // TODO -> validation for postgreClientConfig
    try {
      this.postgreClient = new Client({
        ...postgreClientConfig,
      });
    } catch (err) {
      throw new Error(err.message);
    }
  }

  /**
   *
   * @param {Object} postgreClientConfig
   * @returns {Object} returns connected adapter.
   */
  static async newAdapter(postgreClientConfig) {
    const adapter = new PostgreAdapter(postgreClientConfig);
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

  async close() {
    await this.postgreClient.end();
  }
}

module.exports = PostgreAdapter;
