'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const YAML = require('js-yaml');
const { paramCase } = require('change-case');
const logger = require('./util/logger');
const { generateEntry } = require('./template');
const { sourcedir, workdir, serverlessYamlFilepath, entryFilepath } = require('./util/lib-config');

const fsWriteFileAsync = util.promisify(fs.writeFile);
const fsExistsAsync = util.promisify(fs.exists);
const fsRmdirAsync = util.promisify(fs.rmdir);
const fsMkdirAsync = util.promisify(fs.mkdir);

async function build(config, resources) {
  await _clearWorkspace();
  await _buildRootWorkspace();
  await _buildSourceDirectory();
  await _generateHandlers(resources.computes);
  await _writeServerlessYaml(config);
}

async function _writeServerlessYaml(obj) {
  logger.trace('Writing serverless.yml file');
  let yaml = YAML.dump(obj);
  await fsWriteFileAsync(serverlessYamlFilepath, yaml, { encoding: 'utf8' });
}

async function _clearWorkspace() {
  logger.trace('Clearing the previous workspace');
  const exists = await fsExistsAsync(workdir);
  if (exists) {
    await fsRmdirAsync(workdir, { recursive: true });
  }
}

function _buildRootWorkspace() {
  logger.trace('Building the root workspace at', workdir);
  return _createDirectory(workdir);
}

function _buildSourceDirectory() {
  logger.trace('Building the source directory');
  return _createDirectory(sourcedir);
}

async function _createDirectory(path) {
  const exists = await fsExistsAsync(path);
  if (!exists) {
    await fsMkdirAsync(path);
  }
}

async function _generateHandlers(computes) {
  logger.trace('Generating primary handler file');
  const handlers = computes.map(c => ({
    id: c.id,
    file: paramCase(c.id),
    ext: '.js',
    code: c.code
  }));

  const entry = generateEntry(handlers);

  await fsWriteFileAsync(entryFilepath, entry, 'utf8');

  for (let h of handlers) {
    await fsWriteFileAsync(path.join(sourcedir, h.file + h.ext), h.code, 'utf8');
  }
}

module.exports = {
  build
};
