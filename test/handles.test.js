const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { HandleCollector } = require('../dist/metrics/handles');

describe('HandleCollector', () => {
  it('returns valid HandleMetrics shape', () => {
    const collector = new HandleCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.total, 'number');
    assert.equal(typeof metrics.byType, 'object');
    assert.ok(Array.isArray(metrics.history));
    assert.ok(['stable', 'rising', 'falling'].includes(metrics.trend));
  });

  it('total is non-negative', () => {
    const collector = new HandleCollector(10);
    const metrics = collector.collect();
    assert.ok(metrics.total >= 0);
  });

  it('byType values sum to total', () => {
    const collector = new HandleCollector(10);
    const metrics = collector.collect();
    const sum = Object.values(metrics.byType).reduce((a, b) => a + b, 0);
    assert.equal(sum, metrics.total);
  });

  it('trend starts as stable with few readings', () => {
    const collector = new HandleCollector(10);
    const metrics = collector.collect();
    assert.equal(metrics.trend, 'stable');
  });
});
