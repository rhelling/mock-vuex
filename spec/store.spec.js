import test from 'ava-spec';
import Sinon from 'sinon';
import jpex from 'jpex';
import jpexDefaults from 'jpex-defaults';
import mock from '../src';

test.beforeEach(function (t) {
  let sinon = Sinon.sandbox.create();

  t.context = {sinon};
});
test.afterEach(function (t) {
  t.context.sinon.restore();
});

test.group('state-only', function (test) {
  test('it creates a store with root state', function (t) {
    let store = mock({
      loading : true,
      foo : 'bah'
    });

    t.not(store.state, undefined);
    t.is(store.state.loading, true);
    t.is(store.state.foo, 'bah');
  });
  test('it creates nested modules', function (t) {
    let store = mock({
      moduleA : {
        value : 'A'
      },
      moduleB : {
        value : 'B',
        moduleC : {
          value : 'C'
        }
      }
    });

    t.is(store.state.moduleA.value, 'A');
    t.is(store.state.moduleB.value, 'B');
    t.is(store.state.moduleB.moduleC.value, 'C');
  });

  test('it allows a mixed configuration', function (t) {
    let store = mock({
      simple : {
        loading : true,
        foo : 'bah'
      },
      complex : {
        state : {
          loading : false,
          foo : 'bah'
        },
        getters : {
          getMe : () => 'got!'
        }
      }
    });

    t.is(store.state.simple.loading, true);
    t.is(store.state.simple.foo, 'bah');
    t.is(store.state.complex.loading, false);
    t.is(store.state.complex.foo, 'bah');
    t.is(store.getters['complex/getMe'], 'got!');
  });
});

test.group('state', function (test) {
  test('it creates a store with root state', function (t) {
    let store = mock({
      state : {
        loading : true
      }
    });

    t.is(store.state.loading, true);
  });
  test('it creats a store with nested states', function (t) {
    let store = mock({
      modules : {
        foo : {
          state : {
            loading : false
          }
        }
      }
    });

    t.is(store.state.foo.loading, false);
  });
});

test.group('getters', function (test) {
  test('it creates a store with getters', function (t) {
    let store = mock({
      getters : {
        getterA : () => 'A',
        getterB : () => 'B'
      }
    });

    t.is(store.getters.getterA, 'A');
    t.is(store.getters.getterB, 'B');
  });
  test('it creates getters with nested module paths', function (t) {
    let store = mock({
      modules : {
        moduleA : {
          modules : {
            moduleB : {
              getters : {
                getterA : () => 'A',
                getterB : () => 'B'
              }
            }
          }
        }
      }
    });

    t.is(store.getters['moduleA/moduleB/getterA'], 'A');
    t.is(store.getters['moduleA/moduleB/getterB'], 'B');
  });
  test('getter has access to local state', function (t) {
    let store = mock({
      moduleA : {
        state : {
          foo : 'bah'
        },
        getters : {
          getterA(state){
            return state.foo;
          }
        }
      }
    });

    t.is(store.getters['moduleA/getterA'], 'bah');
  });
  test('getter has access to other local getters', function (t) {
    let store = mock({
      moduleA : {
        getters : {
          getterA : () => 'foo',
          getterB(state, getters){
            return getters.getterA;
          }
        }
      }
    });

    t.is(store.getters['moduleA/getterB'], 'foo');
  });
  test('getter has access to root state', function (t) {
    let store = mock({
      loading : true,
      moduleA : {
        getters : {
          isRootLoading(state, getters, rootState){
            return rootState.loading;
          }
        }
      }
    });

    t.is(store.getters['moduleA/isRootLoading'], true);
  });
});

test.group('mutations', function (test) {
  test('calls the mutation method', function (t) {
    let spy = t.context.sinon.spy();

    let store = mock({
      mutations : {
        TEST : spy
      }
    });

    store.commit('TEST');

    t.true(spy.called);
  });
  test('calls a nested mutation method', function (t) {
    let spy = t.context.sinon.spy();

    let store = mock({
      moduleA : {
        mutations : {
          TEST : spy
        }
      }
    });

    store.commit('TEST');
    t.false(spy.called);

    store.commit('moduleA/TEST');
    t.true(spy.called);
  });
  test('has access to the local state', function (t) {
    return new Promise(resolve => {
      let store = mock({
        moduleA : {
          state : {
            loading : true
          },
          mutations : {
            TEST(state){
              t.is(state.loading, true);
              resolve();
            }
          }
        }
      });

      store.commit('moduleA/TEST');
    });
  });
  test('has access to the payload', function (t) {
    return new Promise(resolve => {
      let store = mock({
        moduleA : {
          mutations : {
            TEST(state, payload){
              t.is(payload, 'foo');
              resolve();
            }
          }
        }
      });

      store.commit('moduleA/TEST', 'foo');
    });
  });
});

test.group('actions', function (test) {
  test('calls the action method', function (t) {
    let {sinon} = t.context;

    let spy = sinon.spy();
    let store = mock({
      actions : {
        test : spy
      }
    });

    return store.dispatch('test')
      .then(() => {
        t.true(spy.called);
      });
  });
  test('calls a nested action method', function (t) {
    let {sinon} = t.context;
    let spy = sinon.spy();

    let store = mock({
      moduleA : {
        moduleB : {
          actions : {
            test : spy
          }
        }
      }
    });

    return store.dispatch('moduleA/moduleB/test').then(() => {
      t.true(spy.called);
    });
  });
  test('always returns a promise', function (t) {
    let store = mock();

    return store.dispatch('some/unknown/event').then(() => {
      t.pass();
    });
  });
  test('has access to local state', function (t) {
    let store = mock({
      moduleA : {
        state : {
          loading : true
        },
        actions : {
          test({state}){
            return state.loading;
          }
        }
      }
    });

    return store.dispatch('moduleA/test').then(result => {
      t.is(result, true);
    });
  });
  test('has access to root state', function (t) {
    let store = mock({
      loading : true,
      moduleA : {
        state : {
          loading : false
        },
        actions : {
          test({state, rootState}){
            return rootState.loading;
          }
        }
      }
    });

    return store.dispatch('moduleA/test').then(result => {
      t.is(result, true);
    });
  });
  test('has access to local dispatch', function (t) {
    let store = mock({
      moduleA : {
        actions : {
          test({dispatch}){
            return dispatch('test2').then(response => response);
          },
          test2(){
            return 'success';
          }
        }
      }
    });

    return store.dispatch('moduleA/test').then(result => {
      t.is(result, 'success');
    });
  });
  test('has access to local commit', function (t) {
    let {sinon} = t.context;
    let spy = sinon.spy();

    let store = mock({
      moduleA : {
        mutations : {
          TEST : spy
        },
        actions : {
          test({commit}){
            commit('TEST');
          }
        }
      }
    });

    return store.dispatch('moduleA/test').then(() => {
      t.true(spy.called);
    });
  });
  test('has access to the payload', function (t) {
    let store = mock({
      actions : {
        test(context, payload){
          return payload;
        }
      }
    });

    return store.dispatch('test', 'fred').then(result => {
      t.is(result, 'fred');
    });
  });
});

test.group('when', function (test) {
  function setup(t) {
    let store = mock({
      moduleA : {
        count : 0
      }
    });

    t.context.store = store;

    return t.context;
  }

  test('triggers the response when the related method is used', function (t) {
    let {store, sinon} = setup(t);
    let spy = sinon.spy();
    let spy2 = sinon.spy();
    store.when('dispatch').call(spy);
    store.when('COMMIT').call(spy2);

    t.false(spy.called);
    t.false(spy2.called);

    store.commit('COMMIT');
    t.false(spy.called);
    t.true(spy2.called);

    return store.dispatch('dispatch').then(() => {
      t.true(spy.called);
    });
  });
  test('does not trigger if the incorrect method is used', async function (t) {
    let {store, sinon} = setup(t);
    let spy1 = sinon.spy(),
        spy2 = sinon.spy(),
        spy3 = sinon.spy(),
        spy4 = sinon.spy();

    store.when('dispatch', 'dispatch').call(spy1);
    store.when('dispatch', 'COMMIT').call(spy2);
    store.when('commit', 'dispatch').call(spy3);
    store.when('commit', 'COMMIT').call(spy4);

    store.commit('COMMIT');
    await store.dispatch('dispatch');

    t.true(spy1.called);
    t.false(spy2.called);
    t.false(spy3.called);
    t.true(spy4.called);
  });
  test('triggers based on regular expression', function (t) {
    let {store, sinon} = setup(t);
    let spy = sinon.spy();

    store.when(/.*/, /commit/i).call(spy);

    store.commit('COMMIT');
    store.commit('commit');
    store.commit('bob');

    t.true(spy.calledTwice);
  });
  test('triggers for all other options', async function (t) {
    let {store, sinon} = setup(t);
    let spy1 = sinon.spy(), spy2 = sinon.spy();

    store.when('commit', 'COMMIT').call(spy1);
    store.otherwise().call(spy2);

    store.commit('COMMIT');
    store.commit('FOOBAH');
    await store.dispatch('myDispatch');
    await store.dispatch('COMMIT');

    t.true(spy1.calledOnce);
    t.true(spy2.calledThrice);
  });
  test('returns a value', function (t) {
    let {store} = setup(t);
    store.when('dispatch').return('foo');
    store.when('COMMIT').return('bah');

    t.is(store.commit('COMMIT'), 'bah');

    return store.dispatch('dispatch').then(result => {
      t.is(result, 'foo');
    });
  });
  test.cb('returns a hanging promise', function (t) {
    let {store} = setup(t);
    store.when('dispatch').stop();

    store.dispatch('dispatch').then(() => {
      t.fail();
      t.end();
    }, () => {
      t.fail();
      t.end();
    });

    setTimeout(() => {
      t.pass();
      t.end();
    }, 500);
  });
  test('throws an error', function (t) {
    let {store} = setup(t);
    store.when('COMMIT').throw();
    store.when('dispatch').throw();

    t.throws(() => store.commit('COMMIT'));
    t.throws(() => store.dispatch('dispatch'));
  });
});

test.group('expect / assert', test => {
  test('expect accepts a method and name', t => {
   let store = mock();
   let spy = Sinon.spy();
   store.expect('commit', 'COMMIT').call(spy);

   store.commit('COMMIT');
   t.true(spy.called);
 });
 test('accepts a method and name regexp', async t => {
   let store = mock();
   let spy = Sinon.spy();
   store.expect(/dispatch/, /doSomething/).call(spy);

   await store.dispatch('doSomething');
   t.true(spy.called);
 });
 test('accepts just a name string', t => {
   let store = mock();
   let spy = Sinon.spy();
   store.expect('COMMIT').call(spy);

   store.commit('COMMIT');
   t.true(spy.called);
 });
 test('accepts just a name regexp', t => {
   let store = mock();
   let spy = Sinon.spy();
   store.expect(/commit/).call(spy);

   store.commit('commit');
   t.true(spy.called);
 });
 test('returns response object from expect', t => {
   let store = mock();
   store.expect('dispatch', 'dsp').return('foo');

   return store.dispatch('dsp').then(response => {
     t.is(response, 'foo');
   });
 });
 test('assert does not throw if expected calls have been made', t => {
   let store = mock();

   store.expect('commit', 'COMMIT');
   store.expect('dispatch', 'dispatch');

   store.commit('COMMIT');
   store.dispatch('dispatch');

   t.notThrows(() => store.assert());
 });
 test('assert throws if any expect has not been called', t => {
   let store = mock();

   store.expect('commit', 'COMMIT');
   store.expect('commit', 'COMMIT2');
   store.otherwise();

   store.commit('COMMIT');
   store.commit('COMMIT3');

   t.throws(() => store.assert());
 });
 test('assert resets after being called', t => {
   let store = mock();

   store.expect('commit', 'COMMIT');
   store.expect('dispatch', 'dispatch');
   store.otherwise();

   store.commit('COMMIT');

   t.throws(() => store.assert());

   // should start again
   t.notThrows(() => store.assert());
 });
 test('can specify a call count that must be met', t => {
   let store = mock();

   store.expect('commit', 'COMMIT', 3);
   store.expect('dispatch', 'dispatch', 0);

   t.throws(() => store.assert());

   store.expect('commit', 'COMMIT', 3);
   store.expect('dispatch', 'dispatch', 0);

   store.commit('COMMIT');
   store.commit('COMMIT');
   store.commit('COMMIT');

   t.notThrows(() => store.assert());
 });
});