import { Adapter, Model, Helper } from 'casbin';
import { Pool, QueryResult } from 'pg';

import queries from './helper/essentialQueries';

type Versions = {
    v0?: string;
    v1?: string;
    v2?: string;
    v3?: string;
    v4?: string;
    v5?: string;
};

export interface PostgreModel extends Versions {
    p_type: string;
}

/**
 * PostgreAdapter
 */
export class PostgreAdapter implements Adapter {
    private connectionURI: string;

    private pool: Pool;

    private postgreClient: null;

    private checkIfTableExist: boolean;

    /**
     *
     * @param {string} connectionURI
     * https://www.postgresql.org/docs/9.3/libpq-connect.html#AEN39692
     */
    constructor(connectionURI: string) {
        // TODO -> validation for connectionURI
        try {
            this.connectionURI = connectionURI;
            this.pool = new Pool({ connectionString: connectionURI });
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
    static async newAdapter(connectionURI: string) {
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
    addToText(v: string): string {
        if (v) return `, ${v}`;
        return '';
    }

    /**
     *
     * @param {PostgreModel} line
     * @param {Object} model
     * @returns {void}
     */
    loadPolicyLine(line: PostgreModel, model: Model) {
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
    async loadPolicy(model: Model) {
        const lines = await this.query(queries.loadPolicyQuery);
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
    savePolicyLine(ptype: string, rule: string[]): PostgreModel {
        // model -> { ptype: 'p' }
        const model = { p_type: ptype };

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
    async savePolicy(model: Model): Promise<boolean> {
        const policyRule = model.model.get('p');
        const groupPolicy = model.model.get('g');

        const bulkInsert = [];
        let generatedInsertQuery;

        policyRule.forEach((rule) => {
            const ast = rule;
            ast.policy.forEach(async (policy) => {
                generatedInsertQuery = queries.insertQuery(this.savePolicyLine(rule.key, policy));
                bulkInsert.push(generatedInsertQuery);
            });
        });

        groupPolicy.forEach((rule) => {
            const ast = rule;
            ast.policy.forEach(async (policy) => {
                generatedInsertQuery = queries.insertQuery(this.savePolicyLine(rule.key, policy));
                bulkInsert.push(generatedInsertQuery);
            });
        });

        try {
            await this.query(bulkInsert.join(';'));
        } catch (e) {
            return false;
        }

        return true;
    }

    async addPolicy(sec: string, ptype: string, rule: string[]) {
        const query = queries.insertQuery(this.savePolicyLine(ptype, rule));
        await this.query(query);
    }

    async removePolicy(sec: string, ptype: string, rule: string[]) {
        const query = queries.deleteQuery(this.savePolicyLine(ptype, rule));
        await this.query(query);
    }

    // eslint-disable-next-line class-methods-use-this, @typescript-eslint/no-empty-function
    async removeFilteredPolicy(
        sec: string,
        ptype: string,
        fieldIndex: number,
        ...fieldValues: string[]
    ) {
        const line: PostgreModel = { p_type: ptype };

        const idx = fieldIndex + fieldValues.length;
        const totalV = 5;
        for (let i = 0; i <= totalV; i += 1) {
            if (fieldIndex <= i && idx > i) {
                line[`v${i}`] = fieldValues[i - fieldIndex];
            }
        }

        await this.query(queries.deleteQuery(line));
    }

    /**
     * ->
     * @param {string} qry a query to be executed on database.
     * @returns {Array.<Array.<string>> | boolean}
     */
    async query(qry: string): Promise<QueryResult<any>> {
        let output;
        try {
            if (!this.checkIfTableExist) {
                await this.pool.query(queries.createTableIfNotExist);
                this.checkIfTableExist = true;
            }
            output = await this.pool.query(qry);
        } catch (err) {
            throw new Error(err.message);
        }
        return output;
    }

    async closePool() {
        await this.pool.end();
    }
}

export default PostgreAdapter;
