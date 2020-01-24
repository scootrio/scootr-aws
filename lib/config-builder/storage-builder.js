'use strict';

const { types } = require('scootr');
const { DynamoDb } = require('../enums/storage');

function storageBuilder(functions, resources, initializers) {
  /**
   * Maps storage configuration from the Scootr library into valid `serverless.yaml` configuration.
   *
   * In reality, this function will create a pending initialiation function and store it until a reference
   * to the provided storage resource is encountered. Once a reference is encountered, the resource will be
   * initialized. If subsequent references to the storage resource are encountered, new environment variables
   * that reference the same ARN created during initialization will be added so that each reference can have
   * a unique name.
   */
  function addStorage(resource) {
    switch (resource.type) {
      case types.KeyValueStorage:
        addKeyValueStorage(resource, functions, resources, initializers);
        break;

      case types.RelationalStorage:
        throw new Error('Failed to add storage resource: The driver does not yet support relational storage types');

      default:
        throw new Error('Failed to add storage resource: got unsupported type: ' + resource.type);
    }
  }

  return {
    addStorage
  };
}

/**
 * Uses the provided storage resource configuration to add a KeyValue database to the `Resources` section of the
 * `serverless.yaml` file.
 */
function addKeyValueStorage(resource, functions, resources, initializers) {
  switch (resource.engine) {
    case DynamoDb:
      initializers[resource.id] = function(ref) {
        const key = ref.id;
        const f = functions[ref.source.id];
        f.environment[key] = `\${self:service}-${resource.collection}-\${opt:stage, self:provider.stage}`;
        if (!resources[resource.collection]) {
          resources[resource.collection] = {
            Type: 'AWS::DynamoDB::Table',
            Properties: {
              TableName: `\${self:provider.environment.${key}}`,
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

module.exports = { storageBuilder };
