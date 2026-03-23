const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { MemoryCollector } = require('../dist/metrics/memory');

describe('MemoryCollector', () => {
  it('returns valid MemoryMetrics shape', () => {
    const collector = new MemoryCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.rss, 'number');
    assert.equal(typeof metrics.heapUsed, 'number');
    assert.equal(typeof metrics.heapTotal, 'number');
    assert.equal(typeof metrics.external, 'number');
    assert.equal(typeof metrics.arrayBuffers, 'number');
    assert.ok(Array.isArray(metrics.history));
  });

  it('memory values are positive', () => {
    const collector = new MemoryCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.rss > 0);
    assert.ok(metrics.heapUsed > 0);
    assert.ok(metrics.heapTotal > 0);
  });

  it('heapUsed <= heapTotal <= rss', () => {
    const collector = new MemoryCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.heapUsed <= metrics.heapTotal, 'heapUsed should be <= heapTotal');
    assert.ok(metrics.heapTotal <= metrics.rss, 'heapTotal should be <= rss');
  });

  it('history tracks heapUsed', () => {
    const collector = new MemoryCollector(10);
    const metrics = collector.collect();
    assert.equal(metrics.history.length, 1);
    assert.equal(metrics.history[0], metrics.heapUsed);
  });

  it('respects historySize limit', () => {
    const collector = new MemoryCollector(3);
    for (let i = 0; i < 10; i++) {
      collector.collect();
    }
    const metrics = collector.collect();
    assert.ok(metrics.history.length <= 3);
  });
});
