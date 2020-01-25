'use strict';

const wfs = require('./fs');
const logger = require('../util/logger');

async function clearWorkspace() {
  logger.trace('Clearing workspace');
  await wfs.removeWorkspaceDir();
}

async function setupWorkspace() {
  logger.trace('Seting up workspace');
  await wfs.makeWorkspaceDir();
  await wfs.makeWorkspaceDir('src');
}

module.exports = { clearWorkspace, setupWorkspace };
