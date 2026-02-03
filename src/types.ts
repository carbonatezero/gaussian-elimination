export type EntryPos = [number, number];

export type HighlightSpec = {
  rows?: number[];
  cols?: number[];
  entries?: EntryPos[];
};

export type Rational = {
  n: bigint; // numerator
  d: bigint; // denominator > 0
};

export type Step = {
  type: string;
  summarySection: number; // 1–6
  beforeMatrix: Rational[][];
  afterMatrix: Rational[][];
  rowOpText: string;
  explanationText: string;
  highlight: HighlightSpec;
};
