'use strict';

const fs = require('fs');
const util = require('util');
const path = require('path');
const libconfig = require('../util/config');

const fsWriteFileAsync = util.promisify(fs.writeFile);
const fsExistsAsync = util.promisify(fs.exists);
const fsRmdirAsync = util.promisify(fs.rmdir);
const fsMkdirAsync = util.promisify(fs.mkdir);

async function writeWorkspaceFile(filePath = '', content) {
  return await fsWriteFileAsync(path.join(libconfig.workdir, filePath), content, { encoding: 'utf8' });
}

async function makeWorkspaceDir(dirPath = '') {
  const directory = path.join(libconfig.workdir, dirPath);
  const exists = await fsExistsAsync(directory);
  if (!exists) {
    await fsMkdirAsync(directory);
  }
}

async function removeWorkspaceDir(dirPath = '') {
  const directory = path.join(libconfig.workdir, dirPath);
  const exists = await fsExistsAsync(directory);
  if (exists) {
    await fsRmdirAsync(directory, { recursive: true });
  }
}

module.exports = {
  writeWorkspaceFile,
  makeWorkspaceDir,
  removeWorkspaceDir
};
