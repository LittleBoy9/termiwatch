const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { GcCollector } = require('../dist/metrics/gc');

describe('GcCollector', () => {
  it('returns valid GcMetrics shape', () => {
    const collector = new GcCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.totalPauses, 'number');
    assert.equal(typeof metrics.totalPauseMs, 'number');
    assert.equal(typeof metrics.lastPauseMs, 'number');
    assert.equal(typeof metrics.lastKind, 'string');
    assert.equal(typeof metrics.avgPauseMs, 'number');
    assert.equal(typeof metrics.maxPauseMs, 'number');
    assert.equal(typeof metrics.pausesPerSecond, 'number');
    assert.ok(Array.isArray(metrics.history));
    assert.equal(typeof metrics.kindCounts, 'object');

    collector.destroy();
  });

  it('starts with zero pauses', () => {
    const collector = new GcCollector(10);
    const metrics = collector.collect();

    assert.equal(metrics.totalPauses, 0);
    assert.equal(metrics.lastKind, 'none');

    collector.destroy();
  });

  it('values are non-negative', () => {
    const collector = new GcCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.totalPauses >= 0);
    assert.ok(metrics.totalPauseMs >= 0);
    assert.ok(metrics.avgPauseMs >= 0);
    assert.ok(metrics.maxPauseMs >= 0);
    assert.ok(metrics.pausesPerSecond >= 0);

    collector.destroy();
  });
});
