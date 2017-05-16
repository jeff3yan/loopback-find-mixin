'use strict'

const debug = require('debug')('loopback:mixin:find')
const { transformRequireFilter } = require('./utils');

module.exports = function(Model, options = {}) {
  const {
    remotes = [],
    allow = null // TODO: Only allow a certain set of relation paths
  } = options;

  // For each enabled remote method, transform the require
  remotes.forEach(remote => {
    Model.beforeRemote(remote, transformRequireFilter);
  });
};

