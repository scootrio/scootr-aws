'use strict';

const path = require('path');
const { paramCase } = require('change-case');
const { computeBuilder } = require('./compute-builder');
const { storageBuilder } = require('./storage-builder');
const { eventBuilder } = require('./event-builder');
const { triggerBuilder } = require('./trigger-builder');
const { referenceBuilder } = require('./reference-builder');

function createConfigurationBuilder(app, region) {
  // Set some defaults
  if (!app.stage) {
    app.stage = 'dev';
  }

  const config = {
    service: {
      name: app.name
    },
    plugins: {
      localPath: path.join(__dirname, '..', '..', 'node_modules'),
      modules: ['serverless-iam-roles-per-function']
    },
    provider: {
      name: 'aws',
      region: region,
      stage: app.stage,
      profile: 'scootr',
      deploymentBucket: {
        name: `io.scootr.${region}.deployments.${paramCase(app.name)}`
      },
      tags: {
        provisioner: 'scootr'
      },
      deploymentPrefix: 'scootr'
    }
  };

  const functions = {};

  const resources = {};

  const initializers = {};

  const self = {};

  const behaviors = self => ({
    build: function() {
      if (!config.provider.region) {
        throw new Error('Failed to build configuration: region is missing');
      }
      return {
        ...config,
        functions,
        resources: {
          Resources: {
            ...resources
          }
        }
      };
    }
  });

  return Object.assign(
    self,
    behaviors(self),
    computeBuilder(functions),
    storageBuilder(functions, resources, initializers),
    eventBuilder(functions, resources, initializers, app),
    triggerBuilder(functions, app),
    referenceBuilder(functions, initializers)
  );
}

module.exports = {
  createConfigurationBuilder
};
