const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { HttpPatcher } = require('../dist/patch/http');

describe('HttpPatcher', () => {
  it('returns valid HttpMetrics shape', () => {
    const patcher = new HttpPatcher(10);
    const metrics = patcher.collect();

    assert.equal(typeof metrics.totalRequests, 'number');
    assert.equal(typeof metrics.requestsPerSecond, 'number');
    assert.equal(typeof metrics.activeRequests, 'number');
    assert.equal(typeof metrics.avgResponseTime, 'number');
    assert.equal(typeof metrics.statusCodes, 'object');
    assert.ok(Array.isArray(metrics.history));
  });

  it('starts with zero requests', () => {
    const patcher = new HttpPatcher(10);
    const metrics = patcher.collect();

    assert.equal(metrics.totalRequests, 0);
    assert.equal(metrics.activeRequests, 0);
    assert.equal(metrics.avgResponseTime, 0);
  });

  it('builds rps history', () => {
    const patcher = new HttpPatcher(10);
    for (let i = 0; i < 5; i++) {
      patcher.collect();
    }
    const metrics = patcher.collect();
    assert.equal(metrics.history.length, 6);
  });
});
