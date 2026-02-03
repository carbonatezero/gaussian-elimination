import type { Rational } from "./types";
import { parseRational, cloneMatrix } from "./rational";

export function parseMatrixStrings(mat: string[][]): Rational[][] {
  if (mat.length === 0) return [];
  const cols = mat[0].length;
  for (const row of mat) {
    if (row.length !== cols) throw new Error("All rows must have the same number of columns.");
  }
  return mat.map(row => row.map(parseRational));
}

export function matrixToStrings(A: Rational[][]): string[][] {
  return A.map(row => row.map(x => (x.d === 1n ? x.n.toString() : `${x.n.toString()}/${x.d.toString()}`)));
}

export function ensureRectangular(A: string[][]): string[][] {
  if (A.length === 0) return [];
  const c = A[0].length;
  return A.map(r => {
    const rr = r.slice(0, c);
    while (rr.length < c) rr.push("0");
    return rr;
  });
}

export function makeDefaultEditor(rows: number, cols: number): string[][] {
  const out: string[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: string[] = [];
    for (let j = 0; j < cols; j++) row.push("0");
    out.push(row);
  }
  return out;
}

export function resizeEditor(current: string[][], newRows: number, newCols: number): string[][] {
  const out = makeDefaultEditor(newRows, newCols);
  for (let i = 0; i < Math.min(newRows, current.length); i++) {
    for (let j = 0; j < Math.min(newCols, current[0]?.length ?? 0); j++) out[i][j] = current[i][j] ?? "0";
  }
  return out;
}

export function cloneEditor(E: string[][]): string[][] {
  return E.map(r => r.slice());
}

export function safeRatMatrix(A: Rational[][]): Rational[][] {
  return cloneMatrix(A);
}

export function defaultExampleEditor(): string[][] {
  return [
    ["1", "2", "5"],
    ["3", "4", "11"],
  ];
}

export function validateAugmentedShape(rows: number, cols: number): string | null {
  if (rows < 1) return "Need at least 1 row.";
  if (cols < 2) return "Augmented matrix must have at least 2 columns (at least 1 variable + 1 RHS).";
  return null;
}
