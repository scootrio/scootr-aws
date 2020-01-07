'use strict';

const path = require('path');
const { spawn } = require('child_process');
const { debug, info, error } = require('./logger');

function deployer(self) {
  const workdir = process.env.SCOOTR_WORKDIR || path.join(process.cwd(), '.scoots');

  return {
    deploy: () => {
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
          data = data.toString().trim();
          debug(data);
          if (failure) {
            if (result) return;
          }
          if (finished) {
            if (data.includes('endpoints')) {
              // Get the endpoint methods and URLs
              let regex = new RegExp(`^  (.*) - (.*\/${result.meta.stage}(.*))$`, 'gm');
              let current;
              while ((current = regex.exec(data)) !== null) {
                if (!result.events.http[current[3]]) {
                  result.events.http[current[3]] = {
                    methods: [current[1]],
                    url: current[2]
                  };
                } else {
                  result.events.http[current[3]].methods.push(current[1]);
                }
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
          } else if (data.includes('Error')) {
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
  };
}

module.exports = deployer;
