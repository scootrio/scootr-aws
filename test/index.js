const driver = require('..');
const { US_WEST_2 } = require('../regions');
const { NODE_12X } = require('../runtimes');
const { DYNAMO_DB, Schema } = require('../storage');
const { compute, storage, application } = require('scootjs');
const { http } = require('scootjs/events');

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
      .deploy(driver);
  } catch (err) {
    console.log(err);
  }
})();
