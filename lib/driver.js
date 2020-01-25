'use strict';

const assert = require('assert');
const { createConfigurationBuilder } = require('./config-builder/builder');
const deployer = require('./deployer');
const workspaceBuilder = require('./workspace/workspace-builder');

function driver(app, region) {
  assert(app, 'Failed to create AWS driver: missing application configuration');
  assert(region, 'Failed to create AWS driver: missing region');
  // TODO: validate region

  const config = createConfigurationBuilder(app);
  config.setRegion(region);

  const self = {
    config,
    resources: {
      computes: [],
      storage: [],
      triggers: [],
      references: [],
      events: []
    },
    tasks: []
  };

  const selfDeployer = deployer(self);

  const behaviors = self => ({
    onEvent: resource => {
      self.config.addEvent(resource);
      self.resources.events.push(resource);
    },
    onStorage: resource => {
      self.config.addStorage(resource);
      self.resources.storage.push(resource);
    },
    onCompute: resource => {
      self.config.addCompute(resource);
      self.resources.computes.push(resource);
    },
    onTrigger: trig => {
      self.config.addTrigger(trig);
      self.resources.triggers.push(trig);
    },
    onReference: ref => {
      self.config.addReference(ref);
      self.resources.references.push(ref);
    },
    finish: async () => {
      try {
        await workspaceBuilder.buildWorkspace(self.resources, self.config);
        return await selfDeployer.deploy();
      } catch (err) {
        throw new Error(`Failed to finish deployment: ${err.message}`);
      }
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = driver;
