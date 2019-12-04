const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const { pascalCase } = require('change-case');
const YAML = require('js-yaml');
const { trace } = require('./logger');

const workdir = process.env.SCOOTR_WORKDIR || path.join(process.cwd(), '.scoots');
const templateDir = path.join(path.dirname(__dirname), 'templates');
const sourcedir = path.join(workdir, '/src');

module.exports = {
  async buildWorkspace(config, resources) {
    trace('Building workspace');
    await _buildRootWorkspace();
    await _buildSourceDirectory();
    await _generateHandlers(resources.computes);
    await _writeServerlessYaml(config);
  }
};

function _writeServerlessYaml(obj) {
  return new Promise((resolve, reject) => {
    trace('Writing serverless.yml file');
    let yaml = YAML.dump(obj);
    let serverlessFile = path.join(workdir, 'serverless.yml');
    fs.writeFile(serverlessFile, yaml, { encoding: 'utf8' }, err => {
      if (err) return reject(err);
      resolve();
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
    let filepath = path.join(workdir, 'handler.js');
    let templatePath = path.join(templateDir, 'js', 'handler.ejs');
    ejs.renderFile(
      templatePath,
      { handlers: computes.map(c => ({ name: pascalCase(c.id), path: './src/' + c.id + '.js' })) },
      (err, text) => {
        if (err) return reject(err);
        fs.writeFile(filepath, text, 'utf8', err => {
          if (err) return reject(err);
          // Write the resulting code files
          let pending = computes.length;
          let errors = [];
          computes.forEach(c => {
            let filepath = path.join(sourcedir, c.id + '.js');
            fs.writeFile(filepath, c.code, err => {
              if (err) errors.push(err);
              if (--pending === 0) {
                if (errors.length === 0) {
                  return resolve();
                }
                // Errors occured while trying to write the source code files
                reject(new Error('Failed to write source code'));
              }
            });
          });
        });
      }
    );
  });
}
