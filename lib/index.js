const AWS = require('aws-sdk');

const profile = process.env.AWS_PROFILE | 'scootr';

var credentials = new AWS.SharedIniFileCredentials({ profile });
AWS.config.credentials = credentials;
