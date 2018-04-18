const knex = require('knex');
const mockKnex = require('mock-knex');

const connection = knex({
  client: 'mysql2',
  debug: false
});

mockKnex.mock(connection);

module.exports = connection;