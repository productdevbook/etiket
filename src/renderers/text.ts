/**
 * Terminal/text output for QR codes
 * Uses UTF-8 block characters for compact display
 */

export interface TextRenderOptions {
  /** Dark module character (default: '██') */
  dark?: string;
  /** Light module character (default: '  ') */
  light?: string;
  /** Use compact mode with half-height blocks (default: true) */
  compact?: boolean;
  /** Margin in modules (default: 2) */
  margin?: number;
  /** Invert colors (default: false) */
  invert?: boolean;
}

/**
 * Render a QR code matrix as terminal-printable string
 */
export function renderText(matrix: boolean[][], options: TextRenderOptions = {}): string {
  const { compact = true, margin = 2, invert = false } = options;

  const size = matrix.length;

  if (compact) {
    return renderCompact(matrix, size, margin, invert);
  }

  const dark = options.dark ?? "██";
  const light = options.light ?? "  ";

  const d = invert ? light : dark;
  const l = invert ? dark : light;

  const lines: string[] = [];

  // Top margin
  for (let m = 0; m < margin; m++) {
    lines.push(l.repeat(size + margin * 2));
  }

  for (let r = 0; r < size; r++) {
    let line = l.repeat(margin);
    for (let c = 0; c < size; c++) {
      line += matrix[r]![c] ? d : l;
    }
    line += l.repeat(margin);
    lines.push(line);
  }

  // Bottom margin
  for (let m = 0; m < margin; m++) {
    lines.push(l.repeat(size + margin * 2));
  }

  return lines.join("\n");
}

/**
 * Compact rendering using Unicode half-block characters
 * Each character represents 2 rows of modules
 * ▀ (upper half), ▄ (lower half), █ (full block), ' ' (empty)
 */
function renderCompact(matrix: boolean[][], size: number, margin: number, invert: boolean): string {
  const lines: string[] = [];
  // const totalWidth = size + margin * 2;

  // Process 2 rows at a time
  for (let r = -margin; r < size + margin; r += 2) {
    let line = "";
    for (let c = -margin; c < size + margin; c++) {
      const top = getModule(matrix, r, c, size) !== invert;
      const bottom = getModule(matrix, r + 1, c, size) !== invert;

      if (top && bottom) line += "█";
      else if (top && !bottom) line += "▀";
      else if (!top && bottom) line += "▄";
      else line += " ";
    }
    lines.push(line);
  }

  return lines.join("\n");
}

function getModule(matrix: boolean[][], r: number, c: number, size: number): boolean {
  if (r < 0 || r >= size || c < 0 || c >= size) return false;
  return !!matrix[r]![c];
}
