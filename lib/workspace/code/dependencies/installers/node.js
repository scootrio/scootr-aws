'use strict';

function createNodeDependencyInstaller() {
  const self = {};

  const behaviors = self => ({
    install: async function(deps) {
      // TODO: implement Node.js dep installation
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = { createNodeDependencyInstaller };
