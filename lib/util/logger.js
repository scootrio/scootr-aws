const pino = require('pino');

module.exports = pino({
  name: 'scootjs-aws',
  level: process.env.SCOOTR_AWS_LOG_LEVEL || 'trace'
});
