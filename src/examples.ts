export type Example = {
  name: string;
  description: string;
  matrix: string[][]; // augmented matrix entries as strings
};

export const EXAMPLES: Example[] = [
  {
    name: "1) Simple 2×2 (unique solution)",
    description: "A small system with a unique solution; good for first exposure.",
    matrix: [
      ["1", "2", "5"],
      ["3", "4", "11"],
    ],
  },
  {
    name: "2) 3×3 requiring a row swap",
    description: "The first pivot is 0, so we must swap rows before eliminating.",
    matrix: [
      ["0", "1", "1", "4"],
      ["2", "1", "-1", "1"],
      ["-2", "2", "3", "7"],
    ],
  },
  {
    name: "3) Infinite solutions",
    description: "One equation is a multiple of another; there will be at least one free variable.",
    matrix: [
      ["1", "2", "-1", "1"],
      ["2", "4", "-2", "2"],
      ["1", "1", "1", "3"],
    ],
  },
  {
    name: "4) No solution (inconsistent)",
    description: "Elimination produces a row 0 = 1, so the system is inconsistent.",
    matrix: [
      ["1", "1", "2"],
      ["2", "2", "5"],
    ],
  },
  {
    name: "5) Underdetermined system",
    description: "More variables than equations; expect free variables and infinitely many solutions.",
    matrix: [
      ["1", "2", "1", "0"],
      ["0", "1", "-1", "2"],
    ],
  },
];
