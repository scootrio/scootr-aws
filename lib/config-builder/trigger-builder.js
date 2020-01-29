'use strict';

const { types } = require('scootr');
const { generateTopicName } = require('./common');

function triggerBuilder(functions, app) {
  /**
   * Maps trigger configuration into valid function event configuration for the `serverless.yaml` file.
   *
   * We know that the compute resource configuration used to setup the function configuration will have already been
   * delivered to the driver, so we don't need to make sure that the target function exists.
   */
  function addTrigger(connection) {
    let source = connection.source;
    let target = functions[connection.target.id];
    let event = null;
    switch (source.type) {
      case types.HttpEvent:
        event = {
          http: {
            path: source.path,
            method: source.method,
            cors: true
          }
        };
        if (source.params.length > 0) {
          event.http.request = {
            parameters: {
              paths: {}
            }
          };
          for (let p of source.params) {
            event.http.request.parameters.paths[p.name] = true;
          }
        }
        break;

      case types.TopicEvent:
        event = {
          sns: {
            // TODO: currently, this method only supports topics that are internal to the application. There
            // could arise a case where an existing topic is used. Should we include this?
            arn: {
              Ref: source.id
            },
            topicName: generateTopicName(app.name, app.stage, source.name)
          }
        };
        break;

      default:
        throw new Error('Got unsupported event type: ' + source.type.toString());
    }
    target.events.push(event);
  }

  return { addTrigger };
}

module.exports = { triggerBuilder };
