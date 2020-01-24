'use strict';

const { types, actions } = require('scootr');
const { DynamoDb } = require('../enums/storage');
const { SNS } = require('../enums/brokers');

function referenceBuilder(functions, initializers) {
  /**
   * Maps reference configuration into IAM Roles for the serverless deployment.
   *
   * These references are passed last to the driver, so all resources required to make the references "valid" will
   * already be present in the serverless configuration.
   */
  function addReference(connection) {
    switch (connection.target.type) {
      case types.KeyValueStorage:
        addKeyValueStorageReference(connection, functions, initializers);
        break;

      case types.RelationalStorage:
        throw new Error(
          'Failed to add resource reference: The `RelationalStorage` type handler has not yet been implemented'
        );

      case types.TopicEvent:
        addTopicEventRef(connection, functions, initializers);
        break;

      default:
        throw new Error(
          'Failed to add resource referece: Got unsupported target type ' + connection.target.type.toString()
        );
    }
  }

  return { addReference };
}

/**
 * Uses the provided reference configuration to set up permissions for the reference. This may require finalizing
 * the initialization of the reference's target resource, and will always require setting new environment
 * variables to the reference ID so that the reference target's ARN can be easily accessible to the developer.
 */
function addKeyValueStorageReference(ref, functions, initializers) {
  let func = functions[ref.source.id];
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
  if (initializers[ref.target.id]) {
    initializers[ref.target.id](ref);
  }
}

/**
 * Adds a new reference to an internal event, potentially finalizing the initialization of the CloudFormation
 * resource.
 */
function addTopicEventRef(ref, functions, initializers) {
  let func = functions[ref.source.id];
  const broker = ref.target.broker;
  switch (broker) {
    case SNS:
      let actions = transformPermissionsToSnsActions(ref.allows);
      if (!func.iamRoleStatements) func.iamRoleStatements = [];
      func.iamRoleStatements.push({
        Effect: 'Allow',
        Action: Array.from(actions.values()),
        Resource: {
          Ref: ref.target.id
        }
      });
      break;

    default:
      throw new Error('Failed to add internal event: The broker ' + broker.toString() + ' is invalid.');
  }

  // We also need to check to make sure the target resources are completely initialized and create the necessary
  // enviroment variables so that the code can refer to the resource ARNs efficiently.
  if (initializers[ref.target.id]) {
    initializers[ref.target.id](ref);
  }
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

/**
 * Maps the Scootr library's action types to a set of SNS roles.
 */
function transformPermissionsToSnsActions(permissions) {
  const actionSet = new Set();
  for (let action of permissions) {
    switch (action) {
      case actions.Create:
        actionSet.add('sns:CreateTopic').add('sns:Publish');
        break;

      case actions.Read:
        actionSet.add('sns:Subscribe');
        break;

      case actions.Update:
        actionSet.add('sns:Publish').add('sns:SetTopicAttributes');
        break;

      case actions.Delete:
        actionSet.add('sns:DeleteTopic').add('sns:Unsubscribe');
        break;

      case actions.All:
        actionSet
          .add('sns:CreateTopic')
          .add('sns:Publish')
          .add('sns:Subscribe')
          .add('sns:DeleteTopic')
          .add('sns:Unsubscribe');
        break;

      default:
        throw new Error('Unsupported action type in `allows` definition:' + action.toString());
    }
  }
  return actionSet;
}

module.exports = { referenceBuilder };
