const AWS = require('aws-sdk');
const scoot = require('scootjs');
const Config = require('./lib/config');
const fs = require('fs');

const profile = process.env.AWS_PROFILE | 'scootr';

var credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;

class AWSDriver {
  constructor(project) {
    this.config = new Config(project);
    this.tasks = [];
  }

  deploy(resource) {
    switch (resource.type) {
      case scoot.Types.COMPUTE:
        this.config.addCompute(resource);
        break;

      case scoot.Types.STORAGE:
        this.config.addStorage(resource);
        break;

      default:
        throw new Error('Unsupported resource type in deployment:', resource.type);
    }
  }

  connect(connection) {
    console.log('Deploying connection');
  }

  initializeEvent(event) {
    console.log('Initializing Event');
  }

  finish() {
    return new Promise((resolve, reject) => {
      fs.mkdir('.scoots', err => {
        if (err) return reject(new Error('Failed to write config file: ' + err.message));
        let yaml = this.config.dump();
        fs.writeFile('.scoots/serverless.yml', yaml, { encoding: 'utf8' }, err => {
          if (err) return reject(new Error('Failed to write config file: ' + err.message));
          resolve();
        });
      });
    });
  }
}

module.exports = AWSDriver;
