const { compute, storage, application, http, topic, actions, types } = require('scootr');
const { driver, enums } = require('../lib/index');

const code1 = `'use strict';

const AWS = require('aws-sdk');

async function handler(event) {
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
}

module.exports = handler;
`;

const code2 = `'use-strict';

const AWS = require('aws-sdk');

function json(code, body) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }
}

async function handler(event) {

  const params = {
    Message: JSON.stringify({
      message: 'Hello from MySecondCompute!'
    }),
    TopicArn: process.env.MyTopicConnection
  };

  const sns = new AWS.SNS();

  try {
    const result = await sns.publish(params).promise();
    return json(200, {
      message: 'Successfully sent message with ID ' + result.MessageId
    });
  } catch(err) {
    return json(500, {
      message: 'Failed to send SNS message',
      details: err.message
    })
  }
}

module.exports = handler;
`;

const code3 = `'use strict';

function handler(event){
  const message = event.Records[0].Sns.Message;
  const data = JSON.parse(message);
  console.log('Got event from SNS topic with data', data);
}

module.exports = handler;
`;

const topic1 = topic('MyTopic')
  .broker(enums.Brokers.SNS)
  .name('my-topic-name');

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
        .on(
          http('MyPostEvent')
            .method('POST')
            .path('/event')
        )
        .use(topic1, [actions.Create], 'MyTopicConnection')
    )
    .with(
      compute('MyThirdCompute')
        .runtime(enums.Runtimes.Node12x)
        .code(code3)
        .on(topic1)
    );

  try {
    const result = await app.deploy(driver, enums.Regions.UsWest2);
    console.log(result);
  } catch (err) {
    console.error(err);
  }
})();
