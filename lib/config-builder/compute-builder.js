'use strict';

const { pascalCase, snakeCase } = require('change-case');

function computeBuilder(functions) {
  /**
   * Maps compute configuration to function configuration for the `serverless.yaml` file used to deploy this
   * serverless application.
   *
   * To start out, the `events` property on the function object is not populated. The events for this object will
   * be added later when the Scootr library begins passing triggers to the driver.
   */
  function addCompute(resource) {
    let handler = null;
    if (resource.runtime.includes('node')) {
      handler = 'handler.on' + pascalCase(`${resource.id}`);
    } else if (resource.runtime.includes('python')) {
      handler = 'handler.' + snakeCase(resource.id) + '_endpoint';
    } else {
      throw new Error('Failed to add compute: The runtime ' + resource.runtime + ' is not supported');
    }
    functions[resource.id] = {
      handler,
      name: resource.id + '-${self:provider.stage}',
      description: resource.description || '',
      runtime: resource.runtime,
      environment: {
        ...resource.environment
      },
      tags: {
        ...resource.tags
      },
      events: []
    };
  }

  return { addCompute };
}

module.exports = { computeBuilder };
