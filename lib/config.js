'use strict';

const { pascalCase } = require('change-case');
const { types, actions } = require('scootr');
const { DynamoDb } = require('./enums/storage');

function configuration(app, region) {
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
        region,
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

  const referenceInitializers = {};

  const behaviors = self => ({
    /**
     * Maps compute configuration to function configuration for the `serverless.yaml` file used to deploy this
     * serverless application.
     *
     * To start out, the `events` property on the function object is not populated. The events for this object will
     * be added later when the Scootr library begins passing triggers to the driver.
     */
    addCompute: function(resource) {
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
        events: []
      };
    },

    /**
     * Maps storage configuration from the Scootr library into valid `serverless.yaml` configuration.
     *
     * In reality, this function will create a pending initialiation function and store it until a reference
     * to the provided storage resource is encountered. Once a reference is encountered, the resource will be
     * initialized. If subsequent references to the storage resource are encountered, new environment variables
     * that reference the same ARN created during initialization will be added so that each reference can have
     * a unique name.
     */
    addStorage: function(resource) {
      switch (resource.type) {
        case types.KeyValueStorage:
          addKeyValueStorage(self, resource);
          break;

        case types.RelationalStorage:
          throw new Error('Failed to add storage resource: The driver does not yet support relational storage types');

        default:
          throw new Error('Failed to add storage resource: got unsupported type: ' + resource.type);
      }
    },

    /**
     * Maps trigger configuration into valid function event configuration for the `serverless.yaml` file.
     *
     * We know that the compute resource configuration used to setup the function configuration will have already been
     * delivered to the driver, so we don't need to make sure that the target function exists.
     */
    addTrigger: function(trigg) {
      let source = trigg.source;
      let target = self.value.functions[trigg.target.id];
      let event = null;
      switch (source.type) {
        case types.HttpEvent:
          event = {
            http: {
              name: source.id,
              path: source.path,
              method: source.method
            }
          };
          break;

        case types.TopicEvent:
          throw new Error('Failed to configure trigger: The `TopicEvent` handler has not been implemented');

        default:
          throw new Error('Got unsupported event type: ' + source.type.toString());
      }
      target.events.push(event);
    },

    /**
     * Maps reference configuration into IAM Roles for the serverless deployment.
     *
     * These references are passed last to the driver, so all resources required to make the references "valid" will
     * already be present in the serverless configuration.
     */
    addReference: function(ref) {
      switch (ref.target.type) {
        case types.KeyValueStorage:
          addKeyValueStorageReference(self, ref);
          break;

        case types.RelationalStorage:
          throw new Error(
            'Failed to add resource reference: The `RelationalStorage` type handler has not yet been implemented'
          );

        case types.TopicEvent:
          throw new Error(
            'Failed to add resource reference: The `TopicEvent` type handler has not yet been implemented'
          );

        default:
          throw new Error('Failed to add resource referece: Got unsupported target type ' + ref.target.type.toString());
      }
    }
  });

  /**
   * Uses the provided storage resource configuration to add a KeyValue database to the `Resources` section of the
   * `serverless.yaml` file.
   */
  function addKeyValueStorage(self, resource) {
    switch (resource.engine) {
      case DynamoDb:
        referenceInitializers[resource.id] = function(connectionName) {
          let envKey = connectionName;
          self.value.provider.environment[
            envKey
          ] = `\${self:service}-${resource.collection}-\${opt:stage, self:provider.stage}`;
          if (!self.value.resources.Resources[resource.collection]) {
            self.value.resources.Resources[resource.collection] = {
              Type: 'AWS::DynamoDB::Table',
              Properties: {
                TableName: `\${self:provider.environment.${envKey}}`,
                BillingMode: 'PAY_PER_REQUEST',
                AttributeDefinitions: [
                  {
                    AttributeName: resource.key.name,
                    AttributeType: resource.key.type
                  }
                ],
                KeySchema: [
                  {
                    AttributeName: resource.key.name,
                    KeyType: 'HASH'
                  }
                ]
              }
            };
          }
        };

        break;

      default:
        throw new Error(
          'Failed to add key-value storage to configuration: Got unsupported engine type ' + resource.engine
        );
    }
  }

  /**
   * Uses the provided reference configuration to set up permissions for the reference. This may require finalizing
   * the initialization of the reference's target resource, and will always require setting new environment
   * variables to the reference ID so that the reference target's ARN can be easily accessible to the developer.
   */
  function addKeyValueStorageReference(self, ref) {
    let func = self.value.functions[ref.source.id];
    switch (ref.target.engine) {
      case DynamoDb:
        let actions = transformPermissionsToDynamoDbActions(ref.allows);
        if (!func.iamRoleStatements) func.iamRoleStatements = [];
        func.iamRoleStatements.push({
          Effect: 'Allow',
          Action: Array.from(actions.values()),
          Resource: `arn:aws:dynamodb:\${opt:region, self:provider.region}:*:table/\${self:provider.environment.${ref.id}}`
        });
        break;

      default:
        throw new Error(
          'Failed to add key-value storage reference: Got unsupported target type ' + ref.target.type.toString()
        );
    }

    // We also need to check to make sure the target resources are completely initialized and create the necessary
    // enviroment variables so that the code can refer to the resource ARNs efficiently.
    if (referenceInitializers[ref.target.id]) {
      referenceInitializers[ref.target.id](ref.id);
    }
  }

  return Object.assign(self, behaviors(self));
}

/**
 * Maps the Scootr libraries `action` types to a set of valid DynamoDB roles.
 */
function transformPermissionsToDynamoDbActions(permissions) {
  const actionSet = new Set();
  for (let action of permissions) {
    switch (action) {
      case actions.Create:
        actionSet.add('dynamodb:PutItem');
        break;

      case actions.Read:
        actionSet
          .add('dynamodb:Query')
          .add('dynamodb:Scan')
          .add('dynamodb:GetItem');
        break;

      case actions.Update:
        actionSet.add('dynamodb:UpdateItem');
        break;

      case actions.Delete:
        actionSet.add('dynamodb:DeleteItem');
        break;

      case actions.All:
        actionSet
          .add('dynamodb:Query')
          .add('dynamodb:Scan')
          .add('dynamodb:GetItem')
          .add('dynamodb:PutItem')
          .add('dynamodb:UpdateItem')
          .add('dynamodb:DeleteItem');
        break;

      default:
        throw new Error('Unsupported action type in `allows` definition:' + action.toString());
    }
  }
  return actionSet;
}

module.exports = configuration;
