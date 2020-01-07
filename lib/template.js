'use strict';

const { pascalCase } = require('change-case');

function generateEntry(handlers) {
  let template = "'use strict';\n\nmodule.exports = {\n    ";
  template += handlers.map(h => `on${pascalCase(h.id)}: require('./src/${h.file}')`).join(',\n    ');
  template += '\n};\n';

  return template;
}

module.exports = {
  generateEntry
};
