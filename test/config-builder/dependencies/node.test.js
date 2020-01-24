'use strict';

require('chai').should();

const { createNodeDependencyExtractor } = require('../../../lib/config-builder/dependencies/node');

describe('Node.js Dependency Extractor', function() {
  it('should extract the dependencies', function() {
    const deps = ['@foo/bar', 'baz', 'alpha/bravo/charlie'];

    const code = `'use strict';
    
    ${deps.map((d, i) => `const dep${i} = require('${d}');`).join('\n')}

    function f() {
      console.log('Hello, world!');
    }
    `;

    const extractor = createNodeDependencyExtractor();

    extractor.extract({ code });

    extractor.list().should.have.members(['@foo/bar', 'baz', 'alpha']);
  });
});
