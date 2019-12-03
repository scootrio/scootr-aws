const AWSDriver = require('..');
const { US_WEST_2 } = require('../regions');
const { NODE_12X } = require('../runtimes');
const { DYNAMO_DB, Schema } = require('../storage');
const AWS = require('aws-sdk');
const { compute, storage, application } = require('scootjs');
const { http } = require('scootjs/events');

AWS.config.getCredentials(function(err) {
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log('Access key:', AWS.config.credentials.accessKeyId);
    console.log('Secret access key:', AWS.config.credentials.secretAccessKey);
  }
});

let e1 = http('my-event')
  .method('GET')
  .path('users');
let e2 = http('my-other-event')
  .method('POST')
  .path('todos');
let c1 = compute('my-compute', NODE_12X)
  .env('PORT', '4567')
  .env('NAME', 'my-name')
  .on(e1);
let c2 = compute('my-other-compute', NODE_12X).on(e2);
let s = storage('my-storage', DYNAMO_DB)
  .table('UserTable')
  .primary('ID', Schema.STRING)
  .col('Name', Schema.STRING)
  .col('Age', Schema.INT);

(async () => {
  try {
    await application('id', US_WEST_2)
      .name('my-project')
      .withAll([e1, e2, c1, c2])
      .with(s)
      .deploy(AWSDriver);
  } catch (err) {
    console.log(err);
  }
})();
