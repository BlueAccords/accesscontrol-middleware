const knex = require('knex');
const mockKnex = require('mock-knex');

const connection = knex({
  client: 'mysql2',
  debug: true
});

mockKnex.mock(connection);

module.exports = connection;