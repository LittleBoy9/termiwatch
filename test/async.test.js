const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { AsyncCollector } = require('../dist/metrics/async');

describe('AsyncCollector', () => {
  it('returns valid AsyncMetrics shape', () => {
    const collector = new AsyncCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.activeHandles, 'number');
    assert.equal(typeof metrics.activeRequests, 'number');
    assert.ok(Array.isArray(metrics.handleHistory));
    assert.ok(Array.isArray(metrics.requestHistory));
  });

  it('values are non-negative', () => {
    const collector = new AsyncCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.activeHandles >= 0);
    assert.ok(metrics.activeRequests >= 0);
  });

  it('builds history over collections', () => {
    const collector = new AsyncCollector(10);
    for (let i = 0; i < 5; i++) {
      collector.collect();
    }
    const metrics = collector.collect();
    assert.equal(metrics.handleHistory.length, 6);
    assert.equal(metrics.requestHistory.length, 6);
  });

  it('respects historySize limit', () => {
    const collector = new AsyncCollector(3);
    for (let i = 0; i < 10; i++) {
      collector.collect();
    }
    const metrics = collector.collect();
    assert.ok(metrics.handleHistory.length <= 3);
    assert.ok(metrics.requestHistory.length <= 3);
  });
});
