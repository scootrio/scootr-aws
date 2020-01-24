'use strict';

function createNodeDependencyExtractor() {
  const dependencies = new Set();

  const self = {};

  const behaviors = self => ({
    extract: function(compute) {
      let re = /require\('(.*)'\)/gm;
      let match = null;
      while ((match = re.exec(compute.code)) !== null) {
        const rootDep = _extractRootDependency(match[1]);
        dependencies.add(rootDep);
      }
    },

    list: function() {
      return Array.from(dependencies);
    }
  });

  return Object.assign(self, behaviors(self));
}

function _extractRootDependency(dep) {
  const parts = dep.split('/');
  let rootDep = parts[0];
  if (parts.length > 1 && rootDep.includes('@')) {
    rootDep += '/' + parts[1];
  }
  return rootDep;
}

module.exports = {
  createNodeDependencyExtractor
};
