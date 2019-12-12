const path = require('path');
const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const Config = require('./lib/config');
const { buildWorkspace } = require('./lib/workspace');
const { info, error } = require('./lib/logger');

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
    this.config.addConnection(connection);
    this.resources.connections.push(connection);
  }

  onEvent(event) {
    this.resources.events.push(event);
  }

  async finish() {
    try {
      await buildWorkspace(this.config.get(), this.resources);
      return await this._deploy();
    } catch (err) {
      throw new Error(`Failed to finish deployment: ${err.message}`);
    }
  }

  _deploy() {
    return new Promise((resolve, reject) => {
      let cmd = 'serverless';
      let args = ['deploy'];
      info('Deploying configuration');
      let child = spawn(cmd, args, { cwd: workdir });

      // Capture the output. When the deployment succeeds, there is information (such as URL endpoints) that we need
      // to get back to the develpoer. If we get an error we want to capture it so that we can parse the information
      // out and let the developer know what went wrong.
      let finished = false;
      let failure = false;
      let result;
      child.stdout.on('data', data => {
        data = data.toString();
        if (failure) {
          if (result) return;
        }
        if (finished) {
          if (data.includes('endpoints')) {
            // Get the endpoint methods and URLs
            let regex = new RegExp(`^  (.*) - (.*\/${result.meta.stage}\/(.*))$`, 'gm');
            let current;
            while ((current = regex.exec(data)) !== null) {
              result.events.http[current[3]] = {
                method: current[1],
                url: current[2]
              };
            }
          } else if (data.includes('functions')) {
            // Get the deployed compute information
            let regex = /^  (.*): (.*)$/gm;
            let current;
            while ((current = regex.exec(data)) !== null) {
              result.compute[current[1]] = {
                name: current[2]
              };
            }
          }
        } else if (data.includes('Service Information')) {
          finished = true;
          // Prepare to capture all the information
          result = {
            success: true,
            meta: {},
            events: {
              http: {}
            },
            compute: {},
            storage: {},
            connections: {}
          };
          // Extract the meta information
          let regex = /^(.*): (.*)$/gm;
          let current;
          while ((current = regex.exec(data)) !== null) {
            result.meta[current[1]] = current[2];
          }
        } else {
          failure = true;
          let regex = /Error: (.*) *$/gm;
          let parsed = regex.exec(data);
          if (parsed) {
            result = {
              success: false,
              message: parsed[1]
            };
            error(result.message);
          }
        }
      });

      child.stderr.on('data', data => {
        error(data.toString('utf8'));
      });

      child.on('close', code => {
        if (result) {
          if (code === 0) info('Deployment Success');
          else error('Deployment Failed');
          return resolve(result);
        }
        // Something went wrong and we weren't able to fully process the request
        reject(result);
      });
    });
  }
}

function driver(config) {
  return new AWSDriver(config);
}

module.exports = driver;
