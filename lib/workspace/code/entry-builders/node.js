'use strict';

const { pascalCase } = require('change-case');

function createNodeEntryBuilder() {
  const self = {
    files: []
  };

  const behaviors = self => ({
    addFile: function(name) {
      self.files.push(name);
    },

    buildEntryFile: function() {
      let template = "'use strict';\n\nmodule.exports = {\n    ";
      template += self.files.map(f => `on${pascalCase(f)}: require('./src/${f}')`).join(',\n    ');
      template += '\n};\n';
      return { file: 'handler.js', content: template };
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = { createNodeEntryBuilder };
