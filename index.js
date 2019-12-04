const path = require('path');
const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const Config = require('./lib/config');
const { buildWorkspace } = require('./lib/workspace');

const profile = process.env.AWS_PROFILE || 'scootr';
const workdir = process.env.SCOOTR_WORKDIR || path.join(process.cwd(), '.scoots');

var credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;

class AWSDriver {
  constructor(project) {
    this.config = new Config(project);
    this.resources = {
      computes: [],
      storage: [],
      connections: [],
      events: []
    };
    this.tasks = [];
  }

  onStorage(resource) {
    this.config.addStorage(resource);
    this.resources.storage.push(resource);
  }

  onCompute(resource) {
    this.config.addCompute(resource);
    this.resources.computes.push(resource);
  }

  onConnection(connection) {
    this.resources.connections.push(connection);
  }

  onEvent(event) {
    this.resources.events.push(event);
  }

  async finish() {
    try {
      await buildWorkspace(this.config.get(), this.resources);
      await this._deploy();
    } catch (err) {
      throw new Error(`Failed to finish deployment: ${err.message}`);
    }
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
