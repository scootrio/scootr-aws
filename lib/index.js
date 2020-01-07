'use strict';

const assert = require('assert');
const configuration = require('./config');
const deployer = require('./deployer');
const workspace = require('./workspace');
const { profile } = require('./lib-config');

function driver(app) {
  assert(app, 'Failed to create AWS driver: missing application configuration');

  const self = {
    config: configuration(app),
    resources: {
      computes: [],
      storage: [],
      connections: [],
      events: []
    },
    tasks: []
  };

  const selfDeployer = deployer(self);

  const behaviors = self => ({
    onStorage: resource => {
      self.config.addStorage(resource);
      self.resources.storage.push(resource);
    },
    onCompute: resource => {
      self.config.addCompute(resource);
      self.resources.computes.push(resource);
    },
    onConnection: resource => {
      self.config.addConnection(resource);
      self.resources.connections.push(resource);
    },
    onEvent: resource => {
      self.resources.events.push(resource);
    },
    finish: async () => {
      try {
        await workspace.build(self.config.value, self.resources);
        return await selfDeployer.deploy();
      } catch (err) {
        throw new Error(`Failed to finish deployment: ${err.message}`);
      }
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = driver;
