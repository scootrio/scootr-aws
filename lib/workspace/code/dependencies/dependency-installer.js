'use strict';

const { createNodeDependencyInstaller } = require('./installers/node');
const { createPythonDependencyInstaller } = require('./installers/python');

function createDependencyInstaller(language) {
  switch (language) {
    case 'node':
      return createNodeDependencyInstaller();
    case 'python':
      return createPythonDependencyInstaller();
  }
}

module.exports = { createDependencyInstaller };
