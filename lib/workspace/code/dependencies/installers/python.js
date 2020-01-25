'use strict';

function createPythonDependencyInstaller() {
  const self = {};

  const behaviors = self => ({
    install: async function(deps) {
      // TODO: implement Python dep installation
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = { createPythonDependencyInstaller };
