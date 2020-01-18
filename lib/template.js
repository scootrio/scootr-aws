'use strict';

const { pascalCase, snakeCase } = require('change-case');

function generateEntryForRuntime(runtime, handlers) {
  if (runtime.includes('node')) {
    return generateEntryForNode(handlers);
  }

  if (runtime.includes('python')) {
    return generateEntryForPython(handlers);
  }

  throw new Error('Unsupported runtime in template generator: ' + runtime);
}

function generateEntryForNode(handlers) {
  let template = "'use strict';\n\nmodule.exports = {\n    ";
  template += handlers.map(h => `on${pascalCase(h.id)}: require('./src/${h.file}')`).join(',\n    ');
  template += '\n};\n';

  return { file: 'handler.js', content: template };
}

function generateEntryForPython(handlers) {
  let template = '';
  template += handlers
    .map(function(h) {
      let name = snakeCase(h.id);
      return `from src.${name} import endpoint as ${name}_endpoint`;
    })
    .join('\n');
  template += '\n';
  return { file: 'handler.py', content: template };
}

module.exports = {
  generateEntryForRuntime
};
