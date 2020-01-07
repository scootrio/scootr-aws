'use strict';

const assert = require('assert');
const { pascalCase } = require('change-case');
const { types } = require('scootr');
const { DYNAMO_DB, Actions } = require('./storage');

function configuration(app) {
  assert(app, 'Failed to create configuration for AWS driver: missing project configuration');

  const self = {
    value: {
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
    }
  };

  const pendingStorageResourceInitializers = {};

  const behaviors = self => ({
    addCompute: resource => {
      self.value.functions[resource.id] = {
        handler: 'handler.on' + pascalCase(`${resource.id}`),
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
            case types.HttpEvent:
              return {
                http: {
                  name: e.id,
                  path: e.path,
                  method: e.method
                }
              };

            default:
              throw new Error('Got unsupported event type: ' + e.type);
          }
        })
      };
    },

    addStorage: function(resource) {
      // For AWS, this means we are going to have to construct a CloudFormation template depending on the
      // storage type we are using
      //
      // If we get a storage resoure that has no connections, we don't need to use it. Since we are guaranteed by the
      // Scootr library to get connections at the end, we instead add storage elements to a list of pending storage
      // resource initializer functions that will be invoked with the connection name when we get the connections.

      // Right now we only support DynamoDB. TODO: update this to support more types
      switch (resource.type) {
        case DYNAMO_DB:
          if (resource.tables.length > 1)
            throw new Error('Failed to add storage resource: you can only have one table for a DynamoDB resource');
          const t = resource.tables[0];
          pendingStorageResourceInitializers[resource.id] = function(connectionName) {
            let envKey = connectionName;
            self.value.provider.environment[envKey] = `\${self:service}-${t.name}-\${opt:stage, self:provider.stage}`;
            self.value.resources.Resources[t.name] = {
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
          };
          break;

        default:
          throw new Error('Failed to add storage resource: got unsupported type: ' + resource.type);
      }
    },

    addConnection: resource => {
      // This essentially will ensure that all the required permissions are set up. It can also be used to generate
      // template code for all of the functions.
      // For now, we are assuming we can only connect a compute instance to a storage instance
      // TODO: allow other resource connections
      let sourceId = resource.source.config.id;
      let source = self.value.functions[sourceId];
      let target = resource.target.config;
      let actions = transformPermissionsToDynamoDbActions(resource.allows);
      if (!source.iamRoleStatements) source.iamRoleStatements = [];
      source.iamRoleStatements.push({
        Effect: 'Allow',
        Action: Array.from(actions.values()),
        Resource: `arn:aws:dynamodb:\${opt:region, self:provider.region}:*:table/\${self:provider.environment.${resource.id}}`
      });

      // We also need to check for storage resources to initialize
      if (pendingStorageResourceInitializers[target.id]) {
        pendingStorageResourceInitializers[target.id](resource.id);
        pendingStorageResourceInitializers[target.id] = undefined;
      }
    }
  });

  return Object.assign(self, behaviors(self));
}

function transformPermissionsToDynamoDbActions(permissions) {
  const actions = new Set();
  permissions.forEach(function(action) {
    switch (action) {
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
  return actions;
}

module.exports = configuration;
