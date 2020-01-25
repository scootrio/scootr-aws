'use strict';

const janitor = require('./janitor');
const secretary = require('./secratary');
const logger = require('../util/logger');

async function buildWorkspace(resources, configBuilder) {
  logger.trace('Building workspace');
  await janitor.clearWorkspace();
  await janitor.setupWorkspace();
  await secretary.writeConfigurationFile(configBuilder);
  await secretary.writeCodeFiles(resources.computes);
}

module.exports = { buildWorkspace };
