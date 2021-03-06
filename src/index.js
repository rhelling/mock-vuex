module.exports = function (config) {
  if (!config){
    config = {};
  }
  if (config.$$isStore){
    return config;
  }

  var store = new Store();

  store = create(config, store, store.state, []);

  store.state = reactify(store.state);

  return store;
};

module.exports.config = {
  autoNamespace: true,
  Promise : Promise //eslint-disable-line
};

var reactify = require('./reactify');
var create = require('./create');
var Store = require('./store');
