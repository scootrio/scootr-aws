'use strict';

const fs = require('fs');
const path = require('path');
const YAML = require('js-yaml');
const { paramCase } = require('change-case');
const { trace } = require('./util/logger');
const { generateEntry } = require('./template');
const { sourcedir, workdir, serverlessYamlFilepath, entryFilepath } = require('./util/lib-config');

async function build(config, resources) {
  await _clearWorkspace();
  await _buildRootWorkspace();
  await _buildSourceDirectory();
  await _generateHandlers(resources.computes);
  await _writeServerlessYaml(config);
}

function _writeServerlessYaml(obj) {
  return new Promise((resolve, reject) => {
    trace('Writing serverless.yml file');
    let yaml = YAML.dump(obj);
    fs.writeFile(serverlessYamlFilepath, yaml, { encoding: 'utf8' }, err => {
      if (err) return reject(err);
      resolve();
    });
  });
}

function _clearWorkspace() {
  return new Promise((resolve, reject) => {
    trace('Clearing workspace');
    fs.exists(workdir, exists => {
      if (exists) {
        fs.rmdir(workdir, { recursive: true }, err => {
          if (err) return reject(err);
          resolve();
        });
      } else {
        resolve();
      }
    });
  });
}

function _buildRootWorkspace() {
  trace('Building the root workspace at', workdir);
  return _createDirectory(workdir);
}

function _buildSourceDirectory() {
  trace('Building the source directory');
  return _createDirectory(sourcedir);
}

function _createDirectory(path) {
  return new Promise((resolve, reject) => {
    fs.exists(path, exists => {
      if (exists) return resolve();
      fs.mkdir(path, err => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

function _generateHandlers(computes) {
  return new Promise((resolve, reject) => {
    trace('Generating primary handler file');
    let handlers = computes.map(c => ({
      id: c.id,
      file: paramCase(c.id),
      ext: '.js',
      code: c.code
    }));
    let entry = generateEntry(handlers);
    fs.writeFile(entryFilepath, entry, 'utf8', err => {
      if (err) return reject(err);
      // Write the resulting code files
      let pending = computes.length;
      let errors = [];
      handlers.forEach(c => {
        fs.writeFile(path.join(sourcedir, c.file + c.ext), c.code, err => {
          if (err) errors.push(err);
          if (--pending === 0) {
            if (errors.length === 0) {
              return resolve();
            }
            // Errors occured while trying to write the source code files
            reject(new Error(`Failed to write source code for handler "${c.id}": ${err.message}`));
          }
        });
      });
    });
  });
}

module.exports = {
  build
};
