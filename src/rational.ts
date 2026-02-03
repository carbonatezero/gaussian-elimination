import type { Rational } from "./types";

function absBig(x: bigint): bigint {
  return x < 0n ? -x : x;
}

function gcd(a: bigint, b: bigint): bigint {
  a = absBig(a);
  b = absBig(b);
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a === 0n ? 1n : a;
}

export function normalize(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error("Denominator cannot be 0");
  if (n === 0n) return { n: 0n, d: 1n };
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}

export function rat(n: bigint | number, d: bigint | number = 1): Rational {
  const nn = typeof n === "number" ? BigInt(n) : n;
  const dd = typeof d === "number" ? BigInt(d) : d;
  return normalize(nn, dd);
}

export function isZero(a: Rational): boolean {
  return a.n === 0n;
}

export function add(a: Rational, b: Rational): Rational {
  return normalize(a.n * b.d + b.n * a.d, a.d * b.d);
}

export function sub(a: Rational, b: Rational): Rational {
  return normalize(a.n * b.d - b.n * a.d, a.d * b.d);
}

export function mul(a: Rational, b: Rational): Rational {
  return normalize(a.n * b.n, a.d * b.d);
}

export function div(a: Rational, b: Rational): Rational {
  if (b.n === 0n) throw new Error("Division by zero rational");
  return normalize(a.n * b.d, a.d * b.n);
}

export function neg(a: Rational): Rational {
  return { n: -a.n, d: a.d };
}

export function eq(a: Rational, b: Rational): boolean {
  return a.n === b.n && a.d === b.d;
}

export function toString(a: Rational): string {
  if (a.d === 1n) return a.n.toString();
  // Put minus sign only in numerator.
  return `${a.n.toString()}/${a.d.toString()}`;
}

export function toTeX(a: Rational): string {
  if (a.d === 1n) return a.n.toString();
  return `(${a.n.toString()}/${a.d.toString()})`;
}

export function parseRational(s: string): Rational {
  const t = s.trim();
  if (t === "") return rat(0);
  // Allow parentheses around fractions like (1/2)
  const u = t.replace(/^\((.*)\)$/,"$1").trim();
  // integer
  if (/^[+-]?\d+$/.test(u)) return rat(BigInt(u));
  // fraction a/b
  const m = u.match(/^([+-]?\d+)\s*\/\s*([+-]?\d+)$/);
  if (m) {
    const n = BigInt(m[1]);
    const d = BigInt(m[2]);
    return normalize(n, d);
  }
  throw new Error(`Invalid entry: "${s}". Use integers or reduced fractions like 3/2.`);
}

export function cloneMatrix(A: Rational[][]): Rational[][] {
  return A.map(row => row.map(x => ({ n: x.n, d: x.d })));
}

export function zeroMatrix(rows: number, cols: number): Rational[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => rat(0)));
}

export function isAllZeroRow(row: Rational[], uptoExclusive: number): boolean {
  for (let j = 0; j < uptoExclusive; j++) {
    if (!isZero(row[j])) return false;
  }
  return true;
}

export function signStr(a: Rational): "+" | "-" {
  return a.n < 0n ? "-" : "+";
}
