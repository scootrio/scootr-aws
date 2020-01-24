'use strict';

const { paramCase } = require('change-case');

function generateTopicName(serviceName, stageName, topicName) {
  return [paramCase(serviceName), paramCase(stageName), topicName].join('-');
}

module.exports = {
  generateTopicName
};
