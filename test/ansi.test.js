const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  sparkline,
  brailleSparkline,
  progressBar,
  stackedBar,
  formatBytes,
  formatUptime,
  formatTime,
  stripAnsi,
  visibleLength,
  fitWidth,
  drawBox,
  color,
} = require('../dist/ui/ansi');

describe('sparkline', () => {
  it('returns string of correct width', () => {
    const result = sparkline([1, 2, 3, 4, 5], 10);
    assert.equal(result.length, 10);
  });

  it('returns spaces for empty data', () => {
    const result = sparkline([], 5);
    assert.equal(result, '     ');
  });

  it('uses block characters', () => {
    const result = sparkline([0, 50, 100], 3);
    assert.ok(result.includes('▁') || result.includes('█'));
  });
});

describe('brailleSparkline', () => {
  it('returns array of height lines', () => {
    const result = brailleSparkline([1, 2, 3, 4], 5, 2);
    assert.equal(result.length, 2);
  });

  it('returns spaces for empty data', () => {
    const result = brailleSparkline([], 5, 1);
    assert.equal(result.length, 1);
    assert.equal(result[0], '     ');
  });

  it('each line has correct width', () => {
    const result = brailleSparkline([1, 2, 3, 4, 5, 6, 7, 8], 4, 1);
    assert.equal(result[0].length, 4);
  });
});

describe('progressBar', () => {
  it('full bar at max value', () => {
    const result = progressBar(100, 100, 10);
    const stripped = stripAnsi(result);
    assert.equal(stripped, '██████████');
  });

  it('empty bar at zero', () => {
    const result = progressBar(0, 100, 10);
    const stripped = stripAnsi(result);
    assert.equal(stripped, '░░░░░░░░░░');
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    assert.equal(formatBytes(500), '500 B');
  });

  it('formats kilobytes', () => {
    assert.equal(formatBytes(1536), '1.5 KB');
  });

  it('formats megabytes', () => {
    assert.equal(formatBytes(1048576), '1.0 MB');
  });

  it('formats gigabytes', () => {
    assert.equal(formatBytes(1073741824), '1.0 GB');
  });
});

describe('formatUptime', () => {
  it('formats seconds', () => {
    assert.equal(formatUptime(45), '45s');
  });

  it('formats minutes and seconds', () => {
    assert.equal(formatUptime(125), '2m 5s');
  });

  it('formats hours', () => {
    assert.equal(formatUptime(3661), '1h 1m 1s');
  });

  it('formats days', () => {
    assert.equal(formatUptime(90000), '1d 1h 0m');
  });
});

describe('stripAnsi', () => {
  it('removes ANSI codes', () => {
    const result = stripAnsi('\x1b[31mhello\x1b[0m');
    assert.equal(result, 'hello');
  });

  it('returns plain string unchanged', () => {
    assert.equal(stripAnsi('hello'), 'hello');
  });
});

describe('visibleLength', () => {
  it('ignores ANSI codes in length', () => {
    const len = visibleLength('\x1b[31mhi\x1b[0m');
    assert.equal(len, 2);
  });
});

describe('fitWidth', () => {
  it('pads short strings', () => {
    const result = fitWidth('hi', 5);
    assert.equal(visibleLength(result), 5);
  });

  it('truncates long strings with ellipsis', () => {
    const result = fitWidth('hello world', 5);
    assert.ok(visibleLength(result) <= 5);
  });
});

describe('drawBox', () => {
  it('returns correct number of lines', () => {
    const lines = drawBox('Test', ['line1', 'line2'], 20, 5);
    assert.equal(lines.length, 5);
  });

  it('includes title in top border', () => {
    const lines = drawBox('MyTitle', ['content'], 30, 4);
    assert.ok(stripAnsi(lines[0]).includes('MyTitle'));
  });
});
