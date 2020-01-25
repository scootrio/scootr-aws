'use strict';

const { createNodeDependencyBuilder } = require('./builders/node');
const { createPythonDependencyBuilder } = require('./builders/python');

function createDependencyBuilder(language) {
  switch (language) {
    case 'node':
      return createNodeDependencyBuilder();
    case 'python':
      return createPythonDependencyBuilder();
  }
}

module.exports = { createDependencyBuilder };
