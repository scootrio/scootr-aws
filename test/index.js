const driver = require('..');
const { US_WEST_2 } = require('../lib/regions');
const { NODE_12X } = require('../lib/runtimes');
const { DYNAMO_DB, Schema, Actions } = require('../lib/storage');
const { compute, storage, application, connection, http } = require('scootr');

let e1 = http('MyEvent')
  .method('GET')
  .path('users');
let e2 = http('MyOtherEvent')
  .method('POST')
  .path('todos');
let c1 = compute('MyCompute', NODE_12X)
  .env('PORT', '4567')
  .env('NAME', 'my-name')
  .on(e2).code(`
  'use strict';

  const AWS = require('aws-sdk');

  module.exports = async event => {
    let client = new AWS.DynamoDB.DocumentClient();
    let params = {
      TableName: process.env.MyConnection,
      Item: {
        ID: 'jdk87JFYjd6H6n',
        Name: 'John Smith',
        Age: 24
      }
    };

    try {
      await client.put(params).promise();
      return {
        statusCode: 201,
        body: JSON.stringify({
          message: 'Successfully created the user'
        })
      };
    } catch(err) {
      return {
        statusCode: 500,
        body: JSON.stringify(
          {
            message: 'Failed to add user',
            details: err.message
          }
        )
      };
    }
  };
  `);
let c2 = compute('MyOtherCompute', NODE_12X)
  .tag('stage', 'dev')
  .tag('product', 'x')
  .on(e1).code(`
  'use-strict';

  module.exports = async event => {
    return {
      statusCode: 200,
      body: JSON.stringify(
        {
          message: 'Hello from my-other-compute.js!',
          input: event
        },
        null,
        2
      )
    };
  };
`);
let s = storage('MyStorage', DYNAMO_DB)
  .table('UserTable')
  .primary('ID', Schema.STRING)
  .col('Name', Schema.STRING)
  .col('Age', Schema.INT);

let conn = connection('MyConnection')
  .from(c1)
  .to(s)
  .allow(Actions.ALL);

(async () => {
  try {
    const result = await application('MyApplication', US_WEST_2)
      .withAll([e1, e2, c1, c2])
      .with(s)
      .with(conn)
      .deploy(driver);
    console.log(result);
  } catch (err) {
    console.log(err);
  }
})();
