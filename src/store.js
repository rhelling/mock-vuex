var Promise = require('./').config.Promise;

var Store = function () {
  this.state = {};
  this.getters = {};
  this._modulesNamespaceMap = {};
  this.$$when = [];
  this.$$expect = [];

  Object.defineProperties(this, {
    $$isStore : {
      get : function () {
        return true;
      }
    }
  });
};
Store.prototype.dispatch = function (name, payload) {
  var self = this;
  var pathToAction = name.split('/');
  pathToAction.pop();
  var localState = pathToAction.reduce(function (last, current) {
    return last && last[current];
  }, this.state);
  var rootState = this.state;
  var localCommit = function (name, payload) {
    var commitName = pathToAction.concat(name).join('/');
    return self.commit(commitName, payload);
  };
  var localDispatch = function (name, payload) {
    var dispatchName = pathToAction.concat(name).join('/');
    return self.dispatch(dispatchName, payload);
  };
  var getters = this.getters;
  var context = {
    state : localState,
    rootState : rootState,
    commit : localCommit,
    dispatch : localDispatch,
    getters : getters
  };

  var action = self.$$doWhen('dispatch', name, context, payload);
  return Promise.resolve().then(function () {
    return action;
  });
};

Store.prototype.commit = function (name, payload) {
  var pathToCommit = name.split('/');
  pathToCommit.pop();
  var localState = pathToCommit.reduce(function (last, current) {
    return last && last[current];
  }, this.state);

  return this.$$doWhen('commit', name, localState, payload);
};

Store.prototype.when = function (method, name) {
  var any = /.*/;
  if (method === undefined && name === undefined){
    method = name = any;
  }else if (method === undefined){
    method = any;
  }else if (name === undefined){
    name = method;
    method = any;
  }

  if (typeof method === 'string'){
    method = method.toLowerCase();
  }

  var when = {
    method : method,
    name : name,
    callback : function(context, payload){
      return payload;
    },
    count : 0
  };

  this.$$when.push(when);

  return {
    return : function (value) {
      when.callback = function(){
        return value;
      };
      return this;
    },
    call : function (cb) {
      when.callback = cb;
      return this;
    },
    stop : function () {
      when.callback = function(){
        return new Promise(function(){});
      };
      return this;
    },
    throw : function(value){
      return this.reject(value);
    },
    reject : function (value) {
      when.callback = function(){
        throw (value || new Error());
      };
      return this;
    },
  };
};
Store.prototype.otherwise = function () {
  this.$$when.reverse();
  var result = this.when();
  this.$$when.reverse();
  return result;
};
Store.prototype.expect = function (method, name, count) {
  if (typeof name === 'undefined' && typeof method === 'number'){
    count = method;
    method = undefined;
  }else if (typeof count === 'undefined' && typeof name === 'number'){
    count = name;
    name = undefined;
  }

  var result = this.when(method, name);
  var when = this.$$when[this.$$when.length-1];
  when.expected = count;
  this.$$expect.push(when);
  return result;
};
Store.prototype.assert = function () {
  var $$expect = this.$$expect.splice(0);
  while ($$expect.length){
    var expected = $$expect.shift();
    if (typeof expected.expected === 'number'){
      if (expected.expected !== expected.count){
        throw new Error('Expected {method : ' + expected.method + ', name : ' + expected.name + '} to have been called ' + expected.expected + ' times but was called ' + expected.count + ' times');
      }
    }else if (expected.count < 1){
      throw new Error('Expected a call for {method : ' + expected.method + ', name : ' + expected.name + '}');
    }
  }
};

Store.prototype.$$doWhen = function (method, name) {
  function findMatchingRequest() {
    var $$when = this.$$when.slice().reverse();

    for (var x = 0, l = $$when.length; x < l; x++){
      var when = $$when[x];
      if (when.method instanceof RegExp){
        if (!when.method.test(method)){
          continue;
        }
      }else if (when.method !== method){
        continue;
      }

      if (when.name instanceof RegExp){
        if (!when.name.test(name)){
          continue;
        }
      }else if (when.name !== name){
        continue;
      }
      return when;
    }
  }

  method = method.toLowerCase();
  var args = Array.prototype.slice.call(arguments, 2);
  var when = findMatchingRequest.call(this);
  if (when){
    when.count++;
  }

  if (when && when.callback){
    return when.callback.apply(this, args);
  }else{
    return args[args.length-1]; // just return the payload again
  }
};

module.exports = Store;