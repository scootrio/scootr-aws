'use strict';

const path = require('path');
const YAML = require('js-yaml');
const wfs = require('./fs');
const logger = require('../util/logger');
const { createCodeConfiguration } = require('./code/code-config');
const { createDependencyBuilder } = require('./code/dependencies/dependency-builder');
const { createDependencyInstaller } = require('./code/dependencies/dependency-installer');
const { createEntryFileBuilder } = require('./code/entry');

async function writeConfigurationFile(configBuilder) {
  logger.trace('Writing configuration file');
  const yaml = YAML.dump(configBuilder.build());
  await wfs.writeWorkspaceFile('serverless.yml', yaml);
}

async function writeCodeFiles(computeResources) {
  logger.trace('Writing code files');
  // First, we need to transform each compute resource into a code file configuration object
  const codeConfig = computeResources.map(createCodeConfiguration);

  // Then, we write all of the code to the 'src' directory. As we do this, we are also going to build our list of
  // dependencies we need to install.
  //
  // We will also be setting up our entry file builder to write the entry file
  const language = codeConfig[0].language;
  const depBuilder = createDependencyBuilder(language);
  const entryFileBuilder = createEntryFileBuilder(language);
  for (let c of codeConfig) {
    // Fow now, we only want one language per application. In the future, we will want to add support for
    // multi-language applications
    if (c.language !== language) {
      throw new Error(`Failed to write code files: multiple languages detected (${language} and ${c.language})`);
    }
    depBuilder.extract(c.code);
    await wfs.writeWorkspaceFile(path.join('src', c.filename), c.code);
    entryFileBuilder.addFile(c.name);
  }

  // Get our final list of dependencies and install them
  const deps = depBuilder.list();
  const depInstaller = createDependencyInstaller(language);
  await depInstaller.install(deps);

  // Finally, write our entry file
  const { file, content } = entryFileBuilder.buildEntryFile();
  await wfs.writeWorkspaceFile(file, content);
}

module.exports = { writeConfigurationFile, writeCodeFiles };
