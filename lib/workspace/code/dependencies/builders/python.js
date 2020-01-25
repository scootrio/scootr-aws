'use strict';

function createPythonDependencyBuilder() {
  const dependencies = new Set();

  const self = {};

  const behaviors = self => ({
    extract: function(code) {
      // Ignore for now
      // TODO: implement python dependency extraction
    },

    list: function() {
      return Array.from(dependencies);
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = {
  createPythonDependencyBuilder
};
