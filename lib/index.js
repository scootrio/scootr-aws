const AWS = require('aws-sdk');
const scoot = require('scootjs');

const compute = require('./compute');

const profile = process.env.AWS_PROFILE | 'scootr';

var credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;

class AWSDriver {
  constructor() {}

  deploy(project, resource) {
    console.log(project, resource);
    switch (resource.type) {
      case scoot.Types.COMPUTE:
        compute.deployCompute(resource);
        break;

      case scoot.Types.STORAGE:
        console.log('Deploying storage');
        break;

      default:
        console.log('That did not work');
        break;
    }
  }

  connect(project, connection) {
    console.log('Deploying connection');
  }

  initializeEvent(project, event) {
    console.log(event);
  }

  async finish() {}
}

module.exports = AWSDriver;
