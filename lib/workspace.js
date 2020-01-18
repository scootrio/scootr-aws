'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const YAML = require('js-yaml');
const { paramCase, snakeCase } = require('change-case');
const logger = require('./util/logger');
const { generateEntryForRuntime } = require('./template');
const { sourcedir, workdir, getPathRelativeToWorkdir, serverlessYamlFilepath } = require('./util/lib-config');

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
  if (computes.length === 0) return;

  logger.trace('Generating handlers entrypoint');
  const handlers = computes.map(mapComputeToHandler);

  const entry = generateEntryForRuntime(computes[0].runtime, handlers);

  await fsWriteFileAsync(getPathRelativeToWorkdir(entry.file), entry.content, 'utf8');

  // We may have to add extra files to the src directory for certain languages
  if (computes[0].runtime.includes('python')) {
    await fsWriteFileAsync(path.join(sourcedir, '__init__.py'), '');
  }

  logger.trace('Generating handlers');
  for (let h of handlers) {
    await fsWriteFileAsync(path.join(sourcedir, h.file + h.ext), h.code, 'utf8');
  }
}

function mapComputeToHandler(compute) {
  const id = compute.id;
  let file = null;
  let ext = null;
  if (compute.runtime.includes('node')) {
    file = paramCase(id);
    ext = '.js';
  } else if (compute.runtime.includes('python')) {
    file = snakeCase(id);
    ext = '.py';
  } else {
    throw new Error('Failed to map compute to handler: The runtime "' + compute.runtime + '" is not supported');
  }

  const code = compute.code;

  return {
    id,
    file,
    ext,
    code
  };
}

module.exports = {
  build
};
