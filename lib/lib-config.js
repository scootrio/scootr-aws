'use strict';

const path = require('path');
const AWS = require('aws-sdk');

const workdir = process.env.SCOOTR_WORKDIR || path.join('.', '.scoots');
const serverlessYamlFilepath = path.join(workdir, 'serverless.yml');
const entryFilepath = path.join(workdir, 'handler.js');
const sourcedir = path.join(workdir, '/src');
const profile = process.env.AWS_PROFILE || 'scootr';

const credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;

const libconfig = {
  workdir,
  serverlessYamlFilepath,
  entryFilepath,
  sourcedir,
  profile
};

module.exports = libconfig;
