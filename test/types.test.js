const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_CONFIG } = require('../dist/types');

describe('DEFAULT_CONFIG', () => {
  it('has correct default values', () => {
    assert.equal(DEFAULT_CONFIG.refreshInterval, 1000);
    assert.equal(DEFAULT_CONFIG.historySize, 60);
    assert.equal(DEFAULT_CONFIG.patchHttp, true);
    assert.equal(DEFAULT_CONFIG.patchConsole, true);
    assert.equal(DEFAULT_CONFIG.showDashboard, true);
  });

  it('exports all expected config keys', () => {
    const keys = Object.keys(DEFAULT_CONFIG).sort();
    assert.deepEqual(keys, [
      'historySize',
      'patchConsole',
      'patchHttp',
      'refreshInterval',
      'showDashboard',
    ]);
  });
});
