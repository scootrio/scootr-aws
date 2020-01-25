'use strict';

const { paramCase, snakeCase } = require('change-case');

function createCodeConfiguration(compute) {
  const language = determineLanguageFromRuntime(compute.runtime);
  const extension = getExtensionForLanguage(language);
  const name = changeCaseByLanguage(language, compute.id);

  const self = {
    name,
    language,
    code: compute.code,
    extension,
    filename: name + extension
  };

  return self;
}

function determineLanguageFromRuntime(runtime) {
  if (runtime.includes('node')) {
    return 'node';
  }
  if (runtime.includes('python')) {
    return 'python';
  }
  throw new Error(`The runtime "${runtime}" is not supported by the secretary`);
}

function changeCaseByLanguage(language, text) {
  switch (language) {
    case 'node':
      return paramCase(text);
    case 'python':
      return snakeCase(text);
  }
}

function getExtensionForLanguage(language) {
  switch (language) {
    case 'node':
      return '.js';
    case 'python':
      return '.py';
  }
}

module.exports = { createCodeConfiguration };
