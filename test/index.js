const AWSDriver = require('../lib');
const AWS = require('aws-sdk');
const { compute, storage, project, event } = require('scootjs');
const { http } = require('scootjs/events');

AWS.config.getCredentials(function(err) {
  if (err) console.log(err.stack);
  // credentials not loaded
  else {
    console.log('Access key:', AWS.config.credentials.accessKeyId);
    console.log('Secret access key:', AWS.config.credentials.secretAccessKey);
  }
});

let e = event('id').type(http('GET', 'users'));
let c = compute('id');
let s = storage('id');

project('id')
  .name('My Project')
  .with(e)
  .with(c)
  .with(s)
  .deploy(new AWSDriver());
