const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { EventLoopCollector } = require('../dist/metrics/eventloop');

describe('EventLoopCollector', () => {
  it('returns valid EventLoopMetrics shape', () => {
    const collector = new EventLoopCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.delay, 'number');
    assert.equal(typeof metrics.p99, 'number');
    assert.equal(typeof metrics.min, 'number');
    assert.equal(typeof metrics.max, 'number');
    assert.equal(typeof metrics.utilization, 'number');
    assert.ok(Array.isArray(metrics.history));
    assert.ok(Array.isArray(metrics.eluHistory));

    collector.destroy();
  });

  it('utilization is between 0 and 1', () => {
    const collector = new EventLoopCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.utilization >= 0, `ELU ${metrics.utilization} should be >= 0`);
    assert.ok(metrics.utilization <= 1, `ELU ${metrics.utilization} should be <= 1`);

    collector.destroy();
  });

  it('delay values are non-negative', () => {
    const collector = new EventLoopCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.delay >= 0);
    assert.ok(metrics.p99 >= 0);
    assert.ok(metrics.min >= 0);
    assert.ok(metrics.max >= 0);

    collector.destroy();
  });

  it('tracks both delay and ELU history', () => {
    const collector = new EventLoopCollector(10);
    for (let i = 0; i < 3; i++) {
      collector.collect();
    }
    const metrics = collector.collect();
    assert.equal(metrics.history.length, 4);
    assert.equal(metrics.eluHistory.length, 4);

    collector.destroy();
  });
});
