'use strict';

const { types } = require('scootr');
const { SNS } = require('../enums/brokers');
const { generateTopicName } = require('./common');

function eventBuilder(functions, resources, initializers, app) {
  /**
   * Maps internal event configuration from the Scootr library into valid `serverless.yaml` configuration.
   *
   * This is mostly used for internal events, where SNS topics and resources need to be created in order to
   * properly use the event. Since internal events can also be Scootr resource references, this function will store
   * an initialization function to be invoked when the trigger using the event resource is discovered.
   */
  function addEvent(resource) {
    switch (resource.type) {
      case types.TopicEvent:
        addTopicEvent(resource, functions, resources, initializers, app);
        break;

      case types.HttpEvent:
        return;

      default:
        throw new Error('Failed to add event resource: The type ' + event.type.toString() + ' is not supported');
    }
  }
  return { addEvent };
}

/**
 * Initializes and stores a function to be invoked later that will initialize the proper AWS resources to handle
 * an internal event.
 */
function addTopicEvent(resource, functions, resources, initializers, app) {
  switch (resource.broker) {
    case SNS:
      initializers[resource.id] = function(ref) {
        const key = ref.id;
        const f = functions[ref.source.id];
        f.environment[key] = { Ref: resource.id };
        if (!resources[resource.id]) {
          resources[resource.id] = {
            Type: 'AWS::SNS::Topic',
            Properties: {
              DisplayName: `\${self:service}-${resource.id}-\${opt:stage, self:provider.stage}`,
              TopicName: generateTopicName(app.name, app.stage, resource.name)
            }
          };
        }
      };
      break;

    default:
      throw new Error('Failed to add internal event: The broker ' + resource.broker.toString() + ' is invalid.');
  }
}

module.exports = { eventBuilder };
