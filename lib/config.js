const YAML = require('js-yaml');
const { HTTP } = require('scootjs/events/types');
const { DYNAMO_DB } = require('../storage');

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
        environment: {},
        region: project.region,
        //stackName: '',
        //apiName: '',
        profile: 'scootr',
        deploymentBucket: {
          name: 'io.scootr.${self:provider.region}.deployments'
        },
        tags: {
          provisioner: 'scootr'
        },
        deploymentPrefix: 'scootr'
      },
      functions: {},
      resources: {
        Resources: {}
      }
    };
  }

  addCompute(resource) {
    this._config.functions[resource.id] = {
      handler: toCamelCase(`handler.on ${resource.id}`),
      name: resource.id + '-${self:provider.stage}',
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
          case HTTP:
            return {
              http: {
                name: toPascalCase(e.id),
                path: e.path,
                method: e.method
              }
            };

          default:
            throw new Error('Got unsupported event type: ' + e.type);
        }
      })
    };
    // TODO: make sure we don't need to add any additional resources
  }

  addStorage(resource) {
    // For AWS, this means we are going to have to construct a CloudFormation template depending on the
    // storage type we are using
    switch (resource.type) {
      case DYNAMO_DB:
        resource.tables.forEach(t => {
          let envKey = t.as || t.name;
          this._config.provider.environment[envKey] = `\${self:service}-${t.name}-\${opt:stage, self:provider.stage}`;
          this._config.resources.Resources[t.name] = {
            Type: 'AWS::DynamoDB::Table',
            Properties: {
              TableName: `\${self:provider.environment.${envKey}}`,
              BillingMode: 'PAY_PER_REQUEST',
              AttributeDefinitions: t.primaries.map(c => ({
                AttributeName: c.name,
                AttributeType: c.type
              })),
              KeySchema: t.primaries.map(c => ({
                AttributeName: c.name,
                KeyType: 'HASH'
              }))
            }
          };
        });

        break;

      default:
        throw new Error('Got unsupported storage type: ' + resource.type);
    }
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

function toPascalCase(str) {
  return str
    .replace(/(?:^\w|^\.|[A-Z]|\b\w)/g, word => word.toUpperCase())
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9\. ]/g, '');
}
