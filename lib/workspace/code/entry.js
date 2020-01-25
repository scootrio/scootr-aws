'use strict';

const { createNodeEntryBuilder } = require('./entry-builders/node');
const { createPythonEntryBuilder } = require('./entry-builders/python');

function createEntryFileBuilder(language) {
  switch (language) {
    case 'node':
      return createNodeEntryBuilder();
    case 'python':
      return createPythonEntryBuilder();
  }
}

module.exports = { createEntryFileBuilder };
