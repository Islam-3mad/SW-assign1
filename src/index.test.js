const test = require('node:test');
const assert = require('node:assert');
const app = require('./index');

test('App exports an express instance', () => {
  assert.strictEqual(typeof app, 'function');
});