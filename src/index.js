'use strict'

const deprecate = require('depd')('loopback-find')
const loopbackFind = require('./find')

module.exports = function mixin(app) {
  app.loopback.modelBuilder.mixins.define = deprecate.function(app.loopback.modelBuilder.mixins.define,
    'app.modelBuilder.mixins.define: Use mixinSources instead ' +
    'see https://github.com/jeff3yan/loopback-find')
  app.loopback.modelBuilder.mixins.define('Find', loopbackFind);
}
