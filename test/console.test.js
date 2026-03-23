const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { ConsolePatcher } = require('../dist/patch/console');

describe('ConsolePatcher', () => {
  it('captures stdout logs after patching', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();

    process.stdout.write('test log message\n');

    const logs = patcher.getLogs();
    assert.ok(logs.length > 0);
    const found = logs.find((l) => l.message === 'test log message');
    assert.ok(found, 'should capture stdout write');
    assert.equal(found.type, 'stdout');

    patcher.restore();
  });

  it('captures stderr logs', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();

    process.stderr.write('error message\n');

    const logs = patcher.getLogs();
    const found = logs.find((l) => l.message === 'error message');
    assert.ok(found);
    assert.equal(found.type, 'stderr');

    patcher.restore();
  });

  it('filters nodewatcher sentinel output', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();

    process.stdout.write('\x1b[nodewatcher]dashboard output');

    const logs = patcher.getLogs();
    const found = logs.find((l) => l.message.includes('dashboard output'));
    assert.equal(found, undefined, 'should not capture nodewatcher sentinel output');

    patcher.restore();
  });

  it('counts errors', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();

    process.stderr.write('err1\n');
    process.stderr.write('err2\n');

    assert.equal(patcher.getErrorCount(), 2);

    patcher.restore();
  });

  it('suppresses output when suppressOutput is true', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();

    patcher.suppressOutput = true;
    // Should not throw, still captures
    process.stdout.write('suppressed\n');

    const logs = patcher.getLogs();
    const found = logs.find((l) => l.message === 'suppressed');
    assert.ok(found, 'should still capture even when suppressed');

    patcher.suppressOutput = false;
    patcher.restore();
  });

  it('rawWrite bypasses capture', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();

    const before = patcher.getLogs().length;
    patcher.rawWrite('direct output');
    const after = patcher.getLogs().length;

    // rawWrite should not add to logs
    assert.equal(before, after);

    patcher.restore();
  });

  it('restore stops capturing logs', () => {
    const patcher = new ConsolePatcher(100);
    patcher.patch();
    patcher.restore();

    const countBefore = patcher.getLogs().length;
    process.stdout.write('after restore\n');
    const countAfter = patcher.getLogs().length;

    // After restore, new writes should not be captured
    assert.equal(countBefore, countAfter);
  });
});
