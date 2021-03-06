'use strict';

const path = require('path');
const { spawn } = require('child_process');
const AWS = require('aws-sdk');
const logger = require('./util/logger');
const { workdir } = require('./util/config');

function deployer(self) {
  return {
    init: async config => {
      logger.info('Initializing bucket for deployment');
      try {
        AWS.config.update({ region: config.provider.region });
        const s3 = new AWS.S3();

        const bucket = config.provider.deploymentBucket.name;

        try {
          // Check to see if the bucket exists
          const params = {
            Bucket: bucket
          };
          logger.trace('Attempting to get bucket location:', bucket);
          await s3.getBucketLocation(params).promise();
          // The bucket exists: exit
          return;
        } catch (err) {
          logger.error('Failed to get bucket location', err);
          logger.trace('Attempting to create bucket:', bucket);
          // The bucket may not exist, or another error occured. Try to create the bucket.
          const params = {
            Bucket: bucket,
            ACL: 'private'
          };
          await s3.createBucket(params).promise();
          return;
        }
      } catch (err) {
        throw err;
      }
    },

    deploy: () => {
      return new Promise((resolve, reject) => {
        let cmd = 'node';
        let svs = path.join(__dirname, '..', 'node_modules', 'serverless', 'bin', 'serverless');
        let args = [svs, 'deploy', '--force'];
        logger.info('Deploying configuration');
        let child = spawn(cmd, args, {
          cwd: workdir
        });

        // Capture the output. When the deployment succeeds, there is information (such as URL endpoints) that we need
        // to get back to the develpoer. If we get an error we want to capture it so that we can parse the information
        // out and let the developer know what went wrong.
        let finished = false;
        let failure = false;
        let result;
        child.stdout.on('data', data => {
          data = data.toString().trim();
          // Skip the progress dots while the application is deploying
          if (/^\.*$/m.test(data)) return;

          logger.debug(data);
          if (failure) {
            if (result) return;
          }
          if (finished) {
            if (data.includes('endpoints')) {
              //
              // Get the endpoint methods and URLs
              //
              let regex = new RegExp(`^  (.*) - (.*\/${result.meta.stage}(.*))$`, 'gm');
              let current;
              while ((current = regex.exec(data)) !== null) {
                result.events.push({
                  type: 'http',
                  path: current[3],
                  method: current[1].toLowerCase(),
                  url: current[2]
                });
              }
            } else if (data.includes('functions')) {
              // Get the deployed compute information
              let regex = /^  (.*): (.*)$/gm;
              let current;
              while ((current = regex.exec(data)) !== null) {
                result.compute.push({
                  id: current[1],
                  name: current[2]
                });
              }
            }
          } else if (data.includes('Service Information')) {
            finished = true;
            // Prepare to capture all the information
            result = {
              success: true,
              meta: {},
              events: [],
              compute: [],
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
              logger.error(result.message);
            }
          }
        });

        child.stderr.on('data', data => {
          logger.error(data.toString('utf8'));
        });

        child.on('close', code => {
          if (result) {
            if (code === 0) logger.info('Deployment Success');
            else logger.error('Deployment Failed');
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
