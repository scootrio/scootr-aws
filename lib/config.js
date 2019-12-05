const { HTTP } = require('scootjs/events/types');
const { DYNAMO_DB, Actions } = require('../storage');

module.exports = class Config {
  constructor(app) {
    this._config = {
      service: {
        name: app.name
      },
      plugins: ['serverless-iam-roles-per-function'],
      provider: {
        name: 'aws',
        stage: app.stage || 'dev',
        environment: {},
        region: app.region,
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

  get() {
    return this._config;
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
    // For now, we are assuming we can only connect a compute instance to a storage instance
    // TODO: allow other resource connections
    let sourceId = resource.source._config.id;
    let source = this._config.functions[sourceId];
    let target = resource.target._config;
    let actions = new Set();
    resource.allows.forEach(a => {
      switch (a) {
        case Actions.CREATE:
          actions.add('dynamodb:PutItem');
          break;

        case Actions.READ:
          actions
            .add('dynamodb:Query')
            .add('dynamodb:Scan')
            .add('dynamodb:GetItem');
          break;

        case Actions.UPDATE:
          actions.add('dynamodb:UpdateItem');
          break;

        case Actions.DELETE:
          actions.add('dynamodb:DeleteItem');
          break;

        case Actions.ALL:
          actions
            .add('dynamodb:Query')
            .add('dynamodb:Scan')
            .add('dynamodb:GetItem')
            .add('dynamodb:PutItem')
            .add('dynamodb:UpdateItem')
            .add('dynamodb:DeleteItem');
          break;

        default:
          throw new Error('Unsupported action type in `allows` definition:' + a);
      }
    });
    if (!source.iamRoleStatements) source.iamRoleStatements = [];
    source.iamRoleStatements.push({
      Effect: 'Allow',
      Action: Array.from(actions.values()),
      Resource: `arn:aws:dynamodb:\${opt:region, self:provider.region}:*:table/\${self:provider.environment.${target
        .tables[0].as || target.tables[0].name}}`
    });
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
