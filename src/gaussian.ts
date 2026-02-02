import type { Rational, Step, HighlightSpec } from "./types";
import {
  add, sub, mul, div, rat, isZero, toString, toTeX, cloneMatrix, normalize, neg, isAllZeroRow
} from "./rational";

/**
 * Bookkeeping text format (STRICT):
 * - Swap: R_1 \leftrightarrow R_3
 * - Replacement: R_2 - 3R_1 \to R_2
 * - Scaling: (1/2)R_3 \to R_3
 *
 * NOTE: row indices in display are 1-based; internal are 0-based.
 */

function hl(rows?: number[], cols?: number[], entries?: [number, number][]): HighlightSpec {
  const out: HighlightSpec = {};
  if (rows && rows.length) out.rows = rows;
  if (cols && cols.length) out.cols = cols;
  if (entries && entries.length) out.entries = entries;
  return out;
}

function rowSwapText(i: number, k: number): string {
  return `R_${i + 1} \\leftrightarrow R_${k + 1}`;
}

function rowScaleText(i: number, c: Rational): string {
  // (1/2)R_3 \to R_3
  return `${toTeX(c)}R_${i + 1} \\to R_${i + 1}`;
}

function rowReplaceText(target: number, pivot: number, factor: Rational, op: "add" | "sub"): string {
  // target row gets: R_t - factor R_p -> R_t  (or + ...)
  const fStr = toTeX(factor);
  const sign = op === "sub" ? "-" : "+";
  return `R_${target + 1} ${sign} ${fStr}R_${pivot + 1} \\to R_${target + 1}`;
}

function matrixToEquationRow(row: Rational[], nVars: number): string {
  // e.g., 2x_1 + (1/2)x_2 - x_3 = 7
  const terms: string[] = [];
  for (let j = 0; j < nVars; j++) {
    const a = row[j];
    if (isZero(a)) continue;
    const coeff = toString(a);
    const sign = a.n < 0n ? "-" : "+";
    const abs = a.n < 0n ? normalize(-a.n, a.d) : a;
    const absStr = toString(abs);
    const x = `x_${j + 1}`;
    let piece = "";
    if (absStr === "1") piece = x;
    else piece = `${absStr}${x}`;
    if (terms.length === 0) {
      piece = (sign === "-" ? "-" : "") + piece;
    } else {
      piece = ` ${sign} ${piece}`;
    }
    terms.push(piece);
  }
  if (terms.length === 0) terms.push("0");
  return `${terms.join("")} = ${toString(row[nVars])}`;
}

export type SolveResult =
  | { kind: "unique"; solution: Rational[]; summary: string }
  | { kind: "infinite"; summary: string }
  | { kind: "none"; summary: string };

function findPivotRow(A: Rational[][], startRow: number, col: number): number {
  for (let r = startRow; r < A.length; r++) {
    if (!isZero(A[r][col])) return r;
  }
  return -1;
}

function swapRows(A: Rational[][], i: number, k: number) {
  const tmp = A[i];
  A[i] = A[k];
  A[k] = tmp;
}

function scaleRow(A: Rational[][], i: number, c: Rational) {
  for (let j = 0; j < A[i].length; j++) A[i][j] = mul(c, A[i][j]);
}

function addRowMultiple(A: Rational[][], target: number, pivot: number, factor: Rational, op: "add" | "sub") {
  // target <- target +/- factor*pivot
  for (let j = 0; j < A[target].length; j++) {
    const term = mul(factor, A[pivot][j]);
    A[target][j] = op === "add" ? add(A[target][j], term) : sub(A[target][j], term);
  }
}

function isInconsistentRow(row: Rational[], nVars: number): boolean {
  // 0 0 ... 0 | b with b != 0
  return isAllZeroRow(row, nVars) && !isZero(row[nVars]);
}

function pivotPositionsREF(A: Rational[][], nVars: number): { pivots: Array<{ r: number; c: number }>; rank: number } {
  const pivots: Array<{ r: number; c: number }> = [];
  for (let r = 0; r < A.length; r++) {
    // find first nonzero among vars
    let c = -1;
    for (let j = 0; j < nVars; j++) {
      if (!isZero(A[r][j])) { c = j; break; }
    }
    if (c >= 0) pivots.push({ r, c });
  }
  return { pivots, rank: pivots.length };
}

function backSubstitutionSummary(A: Rational[][], nVars: number): SolveResult {
  // If any inconsistent row -> none
  for (const row of A) {
    if (isInconsistentRow(row, nVars)) {
      return { kind: "none", summary: "Inconsistent system: elimination produced a row of the form 0 = nonzero. Therefore there is **no solution**." };
    }
  }

  const { pivots, rank } = pivotPositionsREF(A, nVars);

  if (rank === nVars) {
    // Unique solution (square/overdetermined but full pivot columns)
    const sol: Rational[] = Array.from({ length: nVars }, () => rat(0));
    // Work from bottom pivot row upward
    for (let idx = pivots.length - 1; idx >= 0; idx--) {
      const { r, c } = pivots[idx];
      // a_rc x_c + sum_{j>c} a_rj x_j = b
      let rhs = A[r][nVars];
      for (let j = c + 1; j < nVars; j++) {
        rhs = sub(rhs, mul(A[r][j], sol[j]));
      }
      sol[c] = div(rhs, A[r][c]);
    }
    const parts = sol.map((v, j) => `x_${j + 1} = ${toString(v)}`);
    return { kind: "unique", solution: sol, summary: `Unique solution found by back substitution:\n\n${parts.join(", ")}` };
  }

  // Infinite solutions: build param description
  const pivotCols = new Set(pivots.map(p => p.c));
  const freeCols: number[] = [];
  for (let j = 0; j < nVars; j++) if (!pivotCols.has(j)) freeCols.push(j);

  // Express pivot variables in terms of free variables (symbolic strings).
  // Use parameters t_1, t_2, ...
  const tNames = freeCols.map((_, i) => `t_${i + 1}`);
  // Build equations from bottom to top
  const expr: string[] = Array.from({ length: nVars }, (_, j) => (pivotCols.has(j) ? "" : tNames[freeCols.indexOf(j)]));

  // We'll do a simple linear expression string builder:
  // x_c = (b - sum a_j x_j)/a_c, with x_j already either parameter or expression.
  for (let idx = pivots.length - 1; idx >= 0; idx--) {
    const { r, c } = pivots[idx];
    // Start with b/a_c
    const a_cc = A[r][c];
    let pieces: string[] = [];
    // constant term
    const constTerm = div(A[r][nVars], a_cc);
    if (!isZero(constTerm)) pieces.push(`${toString(constTerm)}`);
    // contributions from j>c
    for (let j = c + 1; j < nVars; j++) {
      if (isZero(A[r][j])) continue;
      const coeff = div(neg(A[r][j]), a_cc); // move to RHS: -(a_rj/a_cc)
      const varExpr = expr[j] || `x_${j + 1}`;
      const coeffStr = toString(coeff);
      if (coeffStr === "1") pieces.push(`${varExpr}`);
      else if (coeffStr === "-1") pieces.push(`-${varExpr}`);
      else pieces.push(`${coeffStr}(${varExpr})`);
    }
    if (pieces.length === 0) pieces = ["0"];
    expr[c] = pieces.join(" + ").replace(/\+ -/g, "- ");
  }

  const lines = [];
  for (let j = 0; j < nVars; j++) {
    lines.push(`x_${j + 1} = ${expr[j] || "0"}`);
  }
  const freeLine = freeCols.map((c, i) => `x_${c + 1} = ${tNames[i]} (free)`).join("; ");
  return {
    kind: "infinite",
    summary:
      `Infinitely many solutions: there are free variables.\n\nFree variables: ${freeLine}\n\nOne parametrization:\n\n${lines.join("\n")}`,
  };
}

export function generateSteps(initial: Rational[][]): { steps: Step[]; result: SolveResult } {
  const steps: Step[] = [];
  const A = cloneMatrix(initial);
  const m = A.length;
  const n = A[0]?.length ?? 0;
  const nVars = Math.max(0, n - 1);

  // Step 1: Start with augmented matrix
  steps.push({
    type: "start",
    summarySection: 1,
    beforeMatrix: cloneMatrix(A),
    afterMatrix: cloneMatrix(A),
    rowOpText: "",
    explanationText:
      "Start with the augmented matrix. The goal is to use row operations to create zeros below each pivot (leading entry).",
    highlight: hl(undefined, undefined, undefined),
  });

  let pivotRow = 0;
  for (let col = 0; col < nVars && pivotRow < m; col++) {
    // Section 2: Find pivot
    const beforeFind = cloneMatrix(A);
    const pr = findPivotRow(A, pivotRow, col);
    if (pr === -1) {
      // Move to next column
      steps.push({
        type: "noPivotInColumn",
        summarySection: 4,
        beforeMatrix: beforeFind,
        afterMatrix: cloneMatrix(A),
        rowOpText: "",
        explanationText:
          `Column ${col + 1} has no nonzero entries at or below row ${pivotRow + 1}. We cannot place a pivot here, so we move to the next column.`,
        highlight: hl([pivotRow], [col], undefined),
      });
      continue;
    }

    steps.push({
      type: "findPivot",
      summarySection: 2,
      beforeMatrix: beforeFind,
      afterMatrix: cloneMatrix(A),
      rowOpText: "",
      explanationText:
        `Find a pivot in column ${col + 1}, starting from row ${pivotRow + 1}. A pivot must be nonzero.`,
      highlight: hl([pr], [col], [[pr, col]]),
    });

    // If pivot row needs swap
    if (pr !== pivotRow) {
      const beforeSwap = cloneMatrix(A);
      swapRows(A, pr, pivotRow);
      steps.push({
        type: "rowSwap",
        summarySection: 2,
        beforeMatrix: beforeSwap,
        afterMatrix: cloneMatrix(A),
        rowOpText: rowSwapText(pr, pivotRow),
        explanationText:
          `The pivot position at row ${pivotRow + 1}, column ${col + 1} is currently 0. We swap rows to bring a nonzero pivot into place.`,
        highlight: hl([pr, pivotRow], [col], [[pivotRow, col]]),
      });
    }

    // Section 3: Eliminate below pivot
    // (Optional) scale pivot to 1 for readability
    const pivotVal = A[pivotRow][col];
    if (!isZero(pivotVal) && !(pivotVal.n === pivotVal.d)) {
      const beforeScale = cloneMatrix(A);
      const scale = div(rat(1), pivotVal);
      scaleRow(A, pivotRow, scale);
      steps.push({
        type: "rowScale",
        summarySection: 3,
        beforeMatrix: beforeScale,
        afterMatrix: cloneMatrix(A),
        rowOpText: rowScaleText(pivotRow, scale),
        explanationText:
          `Scale the pivot row so that the pivot becomes 1. This keeps arithmetic simpler and reduces mistakes.`,
        highlight: hl([pivotRow], [col], [[pivotRow, col]]),
      });
    }

    for (let r = pivotRow + 1; r < m; r++) {
      if (isZero(A[r][col])) continue;
      const beforeElim = cloneMatrix(A);
      // factor = entry under pivot (since pivot is 1 if we scaled; otherwise divide by pivot)
      const pivotNow = A[pivotRow][col];
      const factor = div(A[r][col], pivotNow); // exact
      // operation: R_r - factor R_p -> R_r
      addRowMultiple(A, r, pivotRow, factor, "sub");
      steps.push({
        type: "eliminateBelow",
        summarySection: 3,
        beforeMatrix: beforeElim,
        afterMatrix: cloneMatrix(A),
        rowOpText: rowReplaceText(r, pivotRow, factor, "sub"),
        explanationText:
          `Eliminate the entry below the pivot in column ${col + 1}. We subtract a multiple of the pivot row so that the new entry becomes 0.`,
        highlight: hl([pivotRow, r], [col], [[r, col], [pivotRow, col]]),
      });
    }

    // Section 4: Move to next column (advance pivot row)
    steps.push({
      type: "advancePivotRow",
      summarySection: 4,
      beforeMatrix: cloneMatrix(A),
      afterMatrix: cloneMatrix(A),
      rowOpText: "",
      explanationText:
        `Column ${col + 1} is now cleaned below the pivot. Move down to the next row and continue to the next column.`,
      highlight: hl([pivotRow], [col], [[pivotRow, col]]),
    });

    pivotRow++;
  }

  // Section 5: REF reached (or as far as possible)
  steps.push({
    type: "refReached",
    summarySection: 5,
    beforeMatrix: cloneMatrix(A),
    afterMatrix: cloneMatrix(A),
    rowOpText: "",
    explanationText:
      "We have reached Row Echelon Form (REF): pivots move to the right as you go down, and everything below each pivot is 0.",
    highlight: hl(undefined, undefined, undefined),
  });

  // Check for inconsistency and create a step if found
  let inconsistentAt = -1;
  for (let r = 0; r < m; r++) {
    if (isInconsistentRow(A[r], nVars)) { inconsistentAt = r; break; }
  }
  if (inconsistentAt >= 0) {
    steps.push({
      type: "inconsistent",
      summarySection: 6,
      beforeMatrix: cloneMatrix(A),
      afterMatrix: cloneMatrix(A),
      rowOpText: "",
      explanationText:
        `This row means 0 = ${toString(A[inconsistentAt][nVars])}, which is impossible. Therefore the system has no solution.`,
      highlight: hl([inconsistentAt], [nVars], [[inconsistentAt, nVars]]),
    });
    const result = backSubstitutionSummary(A, nVars);
    return { steps, result };
  }

  // Section 6: Back substitution steps
  const { pivots } = pivotPositionsREF(A, nVars);

  if (pivots.length === 0) {
    steps.push({
      type: "backSubstitutionNone",
      summarySection: 6,
      beforeMatrix: cloneMatrix(A),
      afterMatrix: cloneMatrix(A),
      rowOpText: "",
      explanationText:
        "There are no pivots in the coefficient columns. This means all variables are free (infinitely many solutions), unless a contradiction exists (which it does not here).",
      highlight: hl(undefined, undefined, undefined),
    });
  } else {
    // Add narrative steps per pivot row
    for (let idx = pivots.length - 1; idx >= 0; idx--) {
      const { r, c } = pivots[idx];
      const eq = matrixToEquationRow(A[r], nVars);
      steps.push({
        type: "backSubstitution",
        summarySection: 6,
        beforeMatrix: cloneMatrix(A),
        afterMatrix: cloneMatrix(A),
        rowOpText: "",
        explanationText:
          `Back substitution: read row ${r + 1} as an equation and solve for the pivot variable.\n\nEquation: ${eq}`,
        highlight: hl([r], [c], [[r, c]]),
      });
    }
  }

  const result = backSubstitutionSummary(A, nVars);
  steps.push({
    type: "solutionSummary",
    summarySection: 6,
    beforeMatrix: cloneMatrix(A),
    afterMatrix: cloneMatrix(A),
    rowOpText: "",
    explanationText: result.summary,
    highlight: hl(undefined, undefined, undefined),
  });

  return { steps, result };
}
