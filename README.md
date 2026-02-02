# Gaussian Elimination Teaching App (React + TypeScript + Vite)

A projector-friendly, step-by-step Gaussian elimination teaching app with **exact rational arithmetic** and **strict textbook bookkeeping notation**:

- Row swap: `R_1 \leftrightarrow R_3`
- Row replacement: `R_2 - 3R_1 \to R_2`
- Row scaling: `(1/2)R_3 \to R_3`

## Local run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## GitHub Pages deployment

This repo is already configured to work as a **project site** under:

`https://<your-username>.github.io/gaussian-elimination/`

Steps:

1. Push this repository to GitHub (repo name must be `gaussian-elimination`).
2. In GitHub:
   - **Settings → Pages**
   - **Build and deployment → Source: GitHub Actions** (recommended) *or* **Deploy from a branch**.
3. If using “Deploy from a branch”:
   - Run locally: `npm install && npm run build`
   - Commit the generated `dist/` folder to a `gh-pages` branch (or use any standard Pages workflow).
4. Ensure Pages is set to serve the branch/folder you deploy.
5. Visit the project site URL.

> Note: `vite.config.ts` sets `base: "/gaussian-elimination/"` so the app works from the GitHub Pages subpath.

## Teacher notes (pedagogy)

- **Weak-student first**: Every step includes a plain-English explanation and highlights the exact row/entry being changed.
- **Strict bookkeeping**: Students must learn to *read and write* row operations. The app never uses informal arrow assignments.
- **Precomputed step list**: The app generates a complete list of steps *before* rendering, so students can go forward/backward and compare “before vs after”.
- **Cognitive load control**: The left panel shows the 6-part method and highlights the current phase, helping students map each micro-step to the overall plan.
- **Exact arithmetic**: Fractions stay exact and reduced; no floating-point drift.

