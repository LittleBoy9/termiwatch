const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { HeapCollector } = require('../dist/metrics/heap');

describe('HeapCollector', () => {
  it('returns valid HeapSpaceMetrics shape', () => {
    const collector = new HeapCollector();
    const metrics = collector.collect();

    assert.ok(Array.isArray(metrics.spaces));
    assert.equal(typeof metrics.totalHeapSize, 'number');
    assert.equal(typeof metrics.totalHeapSizeExecutable, 'number');
    assert.equal(typeof metrics.totalPhysicalSize, 'number');
    assert.equal(typeof metrics.heapSizeLimit, 'number');
    assert.equal(typeof metrics.mallocedMemory, 'number');
    assert.equal(typeof metrics.doesZapGarbage, 'boolean');
  });

  it('has at least one heap space', () => {
    const collector = new HeapCollector();
    const metrics = collector.collect();
    assert.ok(metrics.spaces.length > 0);
  });

  it('each space has correct shape', () => {
    const collector = new HeapCollector();
    const metrics = collector.collect();

    for (const space of metrics.spaces) {
      assert.equal(typeof space.name, 'string');
      assert.equal(typeof space.size, 'number');
      assert.equal(typeof space.used, 'number');
      assert.equal(typeof space.available, 'number');
      assert.equal(typeof space.utilization, 'number');
      assert.ok(space.utilization >= 0 && space.utilization <= 100);
    }
  });

  it('heapSizeLimit is positive', () => {
    const collector = new HeapCollector();
    const metrics = collector.collect();
    assert.ok(metrics.heapSizeLimit > 0);
  });
});
