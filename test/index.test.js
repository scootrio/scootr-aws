const { compute, storage, application, http, actions, types } = require('scootr');
const { driver, enums } = require('../lib/index');

const code1 = `'use strict';

const AWS = require('aws-sdk');

module.exports = async event => {
  let client = new AWS.DynamoDB.DocumentClient();
  let params = {
    TableName: process.env.MyStorageConnection,
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
};`;

const code2 = `'use-strict';

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
};`;

(async function() {
  const app = application('MyApplication')
    .with(
      compute('MyFirstCompute')
        .runtime(enums.Runtimes.Node12x)
        .code(code1)
        .tag('stage', 'dev')
        .tag('product', 'x')
        .on(
          http('MyGetEvent')
            .method('GET')
            .path('/event')
        )
        .use(
          storage('MyStorage', types.KeyValueStorage)
            .engine(enums.Storage.DynamoDb)
            .collection('MyCollection')
            .key('ID')
            .keytype(enums.Storage.String),
          [actions.Create],
          'MyStorageConnection'
        )
    )
    .with(
      compute('MySecondCompute')
        .runtime(enums.Runtimes.Node12x)
        .code(code2)
        .env('PORT', '4567')
        .env('NAME', 'my-name')
        .on(
          http('MyPostEvent')
            .method('POST')
            .path('/event')
        )
    );

  try {
    const result = await app.deploy(driver, enums.Regions.UsWest2);
    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();
