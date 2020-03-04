const P_TYPE = 'VARCHAR (50)';
const VERSIONS_TYPE = 'VARCHAR (255)';

const COLUMNS = [
  `p_type ${P_TYPE} NOT NULL`,
  `v0 ${VERSIONS_TYPE}`,
  `v1 ${VERSIONS_TYPE}`,
  `v2 ${VERSIONS_TYPE}`,
  `v3 ${VERSIONS_TYPE}`,
  `v4 ${VERSIONS_TYPE}`,
  `v5 ${VERSIONS_TYPE}`,
];

module.exports = COLUMNS.join(', ');
