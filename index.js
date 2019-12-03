const AWS = require('aws-sdk');
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

  deployStorage(resource) {
    this.config.addStorage(resource);
  }

  deployCompute(resource) {
    this.config.addCompute(resource);
  }

  connect(connection) {
    console.log('Deploying connection');
  }

  initializeEvent(event) {
    console.log('Initializing Event');
  }

  finish() {
    return new Promise((resolve, reject) => {
      fs.exists('.scoots', async exists => {
        try {
          if (exists) {
            await this._write();
            resolve();
          } else {
            fs.mkdir('.scoots', async err => {
              if (err) return reject(new Error('Failed to write config file: ' + err.message));
              try {
                await this._write();
              } catch (err) {
                reject(err);
              }
              resolve();
            });
          }
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  _write() {
    return new Promise((resolve, reject) => {
      let yaml = this.config.dump();
      fs.writeFile('.scoots/serverless.yml', yaml, { encoding: 'utf8' }, err => {
        if (err) return reject(new Error('Failed to write config file: ' + err.message));
        resolve();
      });
    });
  }
}

function driver(config) {
  return new AWSDriver(config);
}

module.exports = driver;
