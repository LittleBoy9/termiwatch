const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { NetworkCollector } = require('../dist/metrics/network');

describe('NetworkCollector', () => {
  it('returns valid NetworkMetrics shape', () => {
    const collector = new NetworkCollector(10);
    const metrics = collector.collect();

    assert.equal(typeof metrics.activeSockets, 'number');
    assert.equal(typeof metrics.totalBytesRead, 'number');
    assert.equal(typeof metrics.totalBytesWritten, 'number');
    assert.ok(Array.isArray(metrics.sockets));
    assert.ok(Array.isArray(metrics.recentDns));
    assert.equal(typeof metrics.avgDnsTime, 'number');
    assert.ok(Array.isArray(metrics.bytesReadHistory));
    assert.ok(Array.isArray(metrics.bytesWrittenHistory));

    collector.destroy();
  });

  it('values are non-negative', () => {
    const collector = new NetworkCollector(10);
    const metrics = collector.collect();

    assert.ok(metrics.activeSockets >= 0);
    assert.ok(metrics.totalBytesRead >= 0);
    assert.ok(metrics.totalBytesWritten >= 0);

    collector.destroy();
  });

  it('sockets limited to top 10', () => {
    const collector = new NetworkCollector(10);
    const metrics = collector.collect();
    assert.ok(metrics.sockets.length <= 10);

    collector.destroy();
  });
});
