const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { detectFramework, resetFrameworkCache } = require('../dist/detect/framework');
const { detectRuntime, resetRuntimeCache } = require('../dist/detect/runtime');

describe('detectFramework', () => {
  it('returns valid FrameworkInfo shape', () => {
    resetFrameworkCache();
    const info = detectFramework();

    assert.equal(typeof info.name, 'string');
    assert.equal(typeof info.version, 'string');
    assert.equal(typeof info.detected, 'boolean');
  });

  it('returns "none" when no framework is loaded', () => {
    resetFrameworkCache();
    const info = detectFramework();
    // In test environment, no web framework should be loaded
    assert.equal(info.name, 'none');
    assert.equal(info.detected, false);
  });

  it('caches result across calls', () => {
    resetFrameworkCache();
    const first = detectFramework();
    const second = detectFramework();
    assert.deepEqual(first, second);
  });
});

describe('detectRuntime', () => {
  it('returns valid RuntimeInfo shape', () => {
    resetRuntimeCache();
    const info = detectRuntime();

    assert.equal(typeof info.runner, 'string');
    assert.equal(typeof info.detected, 'boolean');
    assert.equal(typeof info.details, 'string');
  });

  it('detects "direct" in plain node environment', () => {
    resetRuntimeCache();
    const info = detectRuntime();
    // Unless running under pm2/nodemon/tsx, should be direct
    assert.equal(info.runner, 'direct');
    assert.equal(info.detected, false);
  });

  it('caches result across calls', () => {
    resetRuntimeCache();
    const first = detectRuntime();
    const second = detectRuntime();
    assert.deepEqual(first, second);
  });
});
