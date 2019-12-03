const AWS = require('aws-sdk');
const Config = require('./lib/config');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const profile = process.env.AWS_PROFILE || 'scootr';
const workdir = process.env.SCOOTR_WORKDIR || path.join(process.cwd(), '.scoots');

var credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;

class AWSDriver {
  constructor(project) {
    this.config = new Config(project);
    this.tasks = [];
  }

  onStorage(resource) {
    this.config.addStorage(resource);
  }

  onCompute(resource) {
    this.config.addCompute(resource);
  }

  onConnection(connection) {}

  onEvent(event) {}

  async finish() {
    try {
      await this._prepare();
      await this._write();
      await this._deploy();
    } catch (err) {
      throw new Error(`Failed to finish deployment: ${err.message}`);
    }
  }

  _prepare() {
    return new Promise((resolve, reject) => {
      fs.exists(workdir, async exists => {
        if (!exists) {
          fs.mkdir(workdir, async err => {
            if (err) return reject(new Error(`Failed to create directory '${workdir}': ${err.message}`));
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  _write() {
    return new Promise((resolve, reject) => {
      let yaml = this.config.dump();
      let serverlessFile = path.join(workdir, 'serverless.yml');
      fs.writeFile(serverlessFile, yaml, { encoding: 'utf8' }, err => {
        if (err) return reject(new Error('Failed to write config file: ' + err.message));
        resolve();
      });
    });
  }

  _deploy() {
    return new Promise((resolve, reject) => {
      let cmd = 'serverless';
      let args = ['deploy'];
      console.log(`Running '${commandString(cmd, args)}' at ${workdir}`);
      let child = spawn(cmd, args, { cwd: workdir, stdio: 'inherit' });
      child.on('close', code => {
        if (code === 0) {
          return resolve();
        }
        // Something went wrong
        reject(new Error(`${commandString(cmd, args)} failed`));
      });
    });
  }
}

function commandString(cmd, args) {
  return `${cmd}${args.length > 0 ? ' ' + args.join(' ') : ''}`;
}

function driver(config) {
  return new AWSDriver(config);
}

module.exports = driver;
