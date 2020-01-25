'use strict';

function createPythonEntryBuilder() {
  const self = {
    files: []
  };

  const behaviors = self => ({
    addFile: function(name) {
      self.files.push(name);
    },

    buildEntryFile: function() {
      let template = '';
      template += self.files
        .map(function(f) {
          return `from src.${f} import endpoint as ${f}_endpoint`;
        })
        .join('\n');
      template += '\n';
      return { file: 'handler.py', content: template };
    }
  });

  return Object.assign(self, behaviors(self));
}

module.exports = { createPythonEntryBuilder };
