'use strict';

const path = require('path');
const AWS = require('aws-sdk');

const workdir = process.env.SCOOTR_WORKDIR || path.join('.', '.scoots');

function getPathRelativeToWorkdir(...parts) {
  return path.join(workdir, ...parts);
}

const serverlessYamlFilepath = getPathRelativeToWorkdir('serverless.yml');
const sourcedir = getPathRelativeToWorkdir('src');
const profile = process.env.AWS_PROFILE || 'scootr';

const credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;

const libconfig = {
  workdir,
  getPathRelativeToWorkdir,
  serverlessYamlFilepath,
  sourcedir,
  profile
};

module.exports = libconfig;
