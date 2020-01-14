'use strict';

module.exports = {
  driver: require('./driver'),

  enums: {
    Storage: require('./enums/storage'),
    Runtimes: require('./enums/runtimes'),
    Regions: require('./enums/regions')
  }
};
