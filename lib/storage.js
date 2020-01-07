'use strict';

module.exports = {
  DYNAMO_DB: 'dynamo-db',

  Schema: {
    STRING: 'S',
    INT: 'N',
    FLOAT: 'N'
  },

  Actions: {
    CREATE: 'create',
    READ: 'read',
    UPDATE: 'update',
    DELETE: 'delete',
    ALL: '*'
  }
};
