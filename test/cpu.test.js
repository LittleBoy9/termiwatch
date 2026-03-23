const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { CpuCollector } = require('../dist/metrics/cpu');

describe('CpuCollector', () => {
  it('returns valid CpuMetrics shape', () => {
    const collector = new CpuCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.usage, 'number');
    assert.equal(typeof metrics.user, 'number');
    assert.equal(typeof metrics.system, 'number');
    assert.ok(Array.isArray(metrics.history));
  });

  it('usage is between 0 and 100', () => {
    const collector = new CpuCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.usage >= 0, `usage ${metrics.usage} should be >= 0`);
    assert.ok(metrics.usage <= 100, `usage ${metrics.usage} should be <= 100`);
  });

  it('builds history over multiple collections', () => {
    const collector = new CpuCollector(5);
    for (let i = 0; i < 3; i++) {
      collector.collect();
    }
    const metrics = collector.collect();
    assert.equal(metrics.history.length, 4);
  });

  it('respects historySize limit', () => {
    const collector = new CpuCollector(3);
    for (let i = 0; i < 10; i++) {
      collector.collect();
    }
    const metrics = collector.collect();
    assert.ok(metrics.history.length <= 3);
  });

  it('returns copies of history array', () => {
    const collector = new CpuCollector(10);
    const m1 = collector.collect();
    const m2 = collector.collect();
    assert.notEqual(m1.history, m2.history);
  });
});
