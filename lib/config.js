const YAML = require('js-yaml');
const { EventTypes } = require('scootjs/events');

module.exports = class Config {
  constructor(project) {
    this._config = {
      service: {
        name: project.name
      },
      //frameworkVersion: '',
      provider: {
        name: 'aws',
        stage: project.stage || 'dev',
        region: project.region,
        //stackName: '',
        //apiName: '',
        profile: 'scootr',
        deploymentBucket: {
          name: 'io.scootr.${self:provider.region}.deploys'
        },
        tags: {
          provisioner: 'scootr'
        },
        deploymentPrefix: 'scootr'
      },
      functions: {},
      resources: {}
    };
  }

  addCompute(resource) {
    this._config.functions[resource.id] = {
      handler: toCamelCase(`handler.on ${resource.id}`),
      name: '${self:provider.stage}',
      description: resource.description || '',
      runtime: resource.runtime,
      environment: {
        ...resource.environment
      },
      tags: {
        managedBy: 'scootr',
        ...resource.tags
      },
      events: resource.events.triggers.map(e => {
        switch (e.type) {
          case EventTypes.HTTP:
            // Do stuff
            return {
              http: {
                name: e.id,
                path: e.path,
                method: e.method
              }
            };

          default:
            throw new Error('Got unsupported event type:', e.type);
        }
      })
    };
    // TODO: make sure we don't need to add any additional resources
  }

  addStorage(resource) {
    // For AWS, this means we are going to have to construct a CloudFormation template depending on the
    // storage type we are using
  }

  addConnection(resource) {
    // This essentially will ensure that all the required permissions are set up. It can also be used to generate
    // template code for all of the functions.
  }

  dump() {
    return YAML.dump(this._config);
  }
};

/**
 * Converts a string to camel case.
 * 
 * This implementation allows for slash and period delimiters.
 * 
 * @param {string} str The string to convert.
 */
function toCamelCase(str) {
  return str
    .split('.')
    .map(s =>
      s
        .replace(/(?:^\w|^\.|[A-Z]|\b\w)/g, function(word, index) {
          return index == 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9\. ]/g, '')
    )
    .join('.');
}
