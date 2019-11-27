const YAML = require('js-yaml');

module.exports = class Config {
  constructor(projectName) {
    this._config = {
      service: {
        name: projectName
      },
      frameworkVersion: '',
      provider: {
        name: 'aws',
        runtime: '',
        stage: '',
        region: '',
        stackName: '',
        apiName: '',
        profile: 'default',
        deploymentBucket: {
          name: 'io.scootr.${self:provider.region}.deploys'
        },
        tags: {
          provisioner: 'scootr'
        },
        deploymentPrefix: 'scootr'
      },
      functions: {}
    };
  }

  addCompute(resource) {
    this._config.functions[resource._name] = {
      handler: '',
      name: '${self:provider.stage}',
      description: resource._description,
      runtime: resource._language,
      environment: {
        ...resource._env
      },
      tags: {
        managedBy: 'scootr',
        ...resource._tags
      }
    };

    // TODO: add the events

    // TODO: make sure we don't need to add any additional resources
  }

  addStorage(resource) {
    
  }

  addConnection() {}

  dump() {
    return YAML.dump(this._config);
  }
};
