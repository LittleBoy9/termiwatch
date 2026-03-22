/** Zero-dependency ANSI terminal rendering primitives */

// Colors
export const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',

  // Foreground
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',

  // Bright foreground
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  bgGray: '\x1b[100m',
};

// Cursor control
export const cursor = {
  hide: '\x1b[?25l',
  show: '\x1b[?25h',
  moveTo: (row: number, col: number) => `\x1b[${row};${col}H`,
  moveUp: (n: number) => `\x1b[${n}A`,
  clear: '\x1b[2J',
  clearLine: '\x1b[2K',
  altScreenOn: '\x1b[?1049h',
  altScreenOff: '\x1b[?1049l',
};

// Box-drawing characters (single line)
export const box = {
  topLeft: '┌',
  topRight: '┐',
  bottomLeft: '└',
  bottomRight: '┘',
  horizontal: '─',
  vertical: '│',
  teeRight: '├',
  teeLeft: '┤',
  teeDown: '┬',
  teeUp: '┴',
  cross: '┼',
};

// Sparkline characters (8 levels) — classic block mode
const SPARK_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

export function sparkline(data: number[], width: number): string {
  if (data.length === 0) return ' '.repeat(width);

  const slice = data.slice(-width);
  const max = Math.max(...slice, 0.001);
  const min = Math.min(...slice, 0);
  const range = max - min || 1;

  let result = '';
  for (const val of slice) {
    const normalized = (val - min) / range;
    const idx = Math.min(Math.floor(normalized * 7), 7);
    result += SPARK_CHARS[idx];
  }

  return result.padStart(width, ' ');
}

/**
 * Braille sparkline — 2x horizontal, 4x vertical resolution.
 *
 * Unicode braille characters (U+2800–U+28FF) encode a 2×4 dot grid:
 *   col0  col1
 *   0x01  0x08   row 0 (top)
 *   0x02  0x10   row 1
 *   0x04  0x20   row 2
 *   0x40  0x80   row 3 (bottom)
 *
 * Each character column maps 2 data points at 4-level vertical resolution,
 * giving 8× the detail of block sparklines.
 */
const BRAILLE_ROWS = 4;
const BRAILLE_COL_BITS = [
  [0x01, 0x02, 0x04, 0x40], // left column, rows top→bottom
  [0x08, 0x10, 0x20, 0x80], // right column
];

export function brailleSparkline(
  data: number[],
  width: number,
  height: number = 1
): string[] {
  if (data.length === 0) {
    return Array(height).fill(' '.repeat(width));
  }

  // Each char column encodes 2 data points
  const dataWidth = width * 2;
  const slice = data.slice(-dataWidth);
  const max = Math.max(...slice, 0.001);
  const min = Math.min(...slice, 0);
  const range = max - min || 1;

  const totalRows = height * BRAILLE_ROWS; // vertical resolution

  // Normalize all values to row indices (0 = bottom, totalRows-1 = top)
  const normalized = slice.map((v) => {
    const n = (v - min) / range;
    return Math.min(Math.floor(n * totalRows), totalRows - 1);
  });

  // Build a grid of braille characters: height rows × width cols
  const lines: string[] = [];

  for (let row = 0; row < height; row++) {
    let line = '';
    // This row covers vertical indices: [(height-1-row)*4 .. (height-1-row)*4+3]
    const rowBase = (height - 1 - row) * BRAILLE_ROWS;

    for (let col = 0; col < width; col++) {
      let bits = 0;

      for (let subCol = 0; subCol < 2; subCol++) {
        const dataIdx = col * 2 + subCol;
        // Pad missing data as empty
        const padOffset = dataWidth - slice.length;
        const actualIdx = dataIdx - padOffset;

        if (actualIdx < 0 || actualIdx >= normalized.length) continue;

        const val = normalized[actualIdx];

        // Light up dots from the bottom up to the value level
        for (let dotRow = 0; dotRow < BRAILLE_ROWS; dotRow++) {
          const absoluteRow = rowBase + (BRAILLE_ROWS - 1 - dotRow);
          if (absoluteRow <= val) {
            bits |= BRAILLE_COL_BITS[subCol][dotRow];
          }
        }
      }

      line += String.fromCharCode(0x2800 + bits);
    }

    lines.push(line);
  }

  return lines;
}

// Horizontal stacked bar for heap spaces
export function stackedBar(
  segments: { value: number; color: string }[],
  width: number
): string {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return color.gray + '░'.repeat(width) + color.reset;

  let result = '';
  let usedWidth = 0;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const isLast = i === segments.length - 1;
    const segWidth = isLast
      ? width - usedWidth
      : Math.round((seg.value / total) * width);

    if (segWidth > 0) {
      result += seg.color + '█'.repeat(segWidth);
      usedWidth += segWidth;
    }
  }

  return result + color.reset;
}

// Gauge — semicircle-style percentage display
export function gauge(value: number, max: number, label: string): string {
  const ratio = Math.min(value / (max || 1), 1);
  const percent = Math.round(ratio * 100);
  const gaugeColor =
    percent > 80
      ? color.brightRed
      : percent > 60
      ? color.brightYellow
      : color.brightGreen;

  return `${gaugeColor}${color.bold}${percent}%${color.reset} ${color.dim}${label}${color.reset}`;
}

// Progress bar
export function progressBar(
  value: number,
  max: number,
  width: number,
  filledColor: string = color.green,
  emptyColor: string = color.gray
): string {
  const ratio = Math.min(value / (max || 1), 1);
  const filled = Math.round(ratio * width);
  const empty = width - filled;

  return (
    filledColor +
    '█'.repeat(filled) +
    emptyColor +
    '░'.repeat(empty) +
    color.reset
  );
}

// Strip ANSI codes for length calculation
export function stripAnsi(str: string): string {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// Visible length of string (excluding ANSI codes)
export function visibleLength(str: string): number {
  return stripAnsi(str).length;
}

// Pad/truncate to exact visible width
export function fitWidth(str: string, width: number): string {
  const vLen = visibleLength(str);
  if (vLen > width) {
    // Truncate - need to be careful with ANSI codes
    let visible = 0;
    let i = 0;
    while (i < str.length && visible < width - 1) {
      if (str[i] === '\x1b') {
        const end = str.indexOf('m', i);
        if (end !== -1) {
          i = end + 1;
          continue;
        }
      }
      visible++;
      i++;
    }
    return str.slice(0, i) + '…' + color.reset;
  }
  return str + ' '.repeat(width - vLen);
}

// Draw a box with title
export function drawBox(
  title: string,
  content: string[],
  width: number,
  height: number,
  titleColor: string = color.cyan
): string[] {
  const innerWidth = width - 2;
  const lines: string[] = [];

  // Top border with title
  const titleStr = title ? ` ${title} ` : '';
  const titleVisLen = visibleLength(titleStr);
  const remainingWidth = innerWidth - titleVisLen;
  const leftBar = Math.floor(remainingWidth / 2);
  const rightBar = remainingWidth - leftBar;

  lines.push(
    color.gray +
      box.topLeft +
      box.horizontal.repeat(leftBar) +
      titleColor +
      color.bold +
      titleStr +
      color.reset +
      color.gray +
      box.horizontal.repeat(rightBar) +
      box.topRight +
      color.reset
  );

  // Content lines
  for (let i = 0; i < height - 2; i++) {
    const line = i < content.length ? content[i] : '';
    lines.push(
      color.gray +
        box.vertical +
        color.reset +
        ' ' +
        fitWidth(line, innerWidth - 2) +
        ' ' +
        color.gray +
        box.vertical +
        color.reset
    );
  }

  // Bottom border
  lines.push(
    color.gray +
      box.bottomLeft +
      box.horizontal.repeat(innerWidth) +
      box.bottomRight +
      color.reset
  );

  return lines;
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

// Format duration
export function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Format timestamp
export function formatTime(ts: number): string {
  const d = new Date(ts);
  return (
    String(d.getHours()).padStart(2, '0') +
    ':' +
    String(d.getMinutes()).padStart(2, '0') +
    ':' +
    String(d.getSeconds()).padStart(2, '0')
  );
}
