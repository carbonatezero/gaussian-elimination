import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Rational, Step } from "./types";
import { toString } from "./rational";
import { parseMatrixStrings, resizeEditor, validateAugmentedShape, defaultExampleEditor, cloneEditor } from "./matrixUtils";
import { EXAMPLES } from "./examples";
import { generateSteps } from "./gaussian";

const METHOD = [
  {
    title: "Start with the Augmented Matrix",
    desc: "Write the system as an augmented matrix [A | b]. We will transform it using legal row operations.",
  },
  {
    title: "Find the Pivot",
    desc: "In the current column, find a nonzero entry at or below the current row. Swap rows if needed.",
  },
  {
    title: "Eliminate Entries Below the Pivot",
    desc: "Use row replacement to create zeros beneath the pivot. Keep fractions exact.",
  },
  {
    title: "Move to the Next Column",
    desc: "After cleaning below the pivot, move down one row and continue to the right.",
  },
  {
    title: "Row Echelon Form (REF)",
    desc: "In REF, each pivot is to the right of the pivot above it, and everything below pivots is 0.",
  },
  {
    title: "Back Substitution",
    desc: "Read the REF rows as equations and solve from the bottom pivot upward.",
  },
];

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

function buildEntrySet(entries?: [number, number][]): Set<string> {
  const s = new Set<string>();
  if (!entries) return s;
  for (const [r, c] of entries) s.add(`${r},${c}`);
  return s;
}

function MatrixView({ A, highlight, augmentedCol }: { A: Rational[][]; highlight: Step["highlight"]; augmentedCol: number }) {
  const rowsSet = useMemo(() => new Set(highlight.rows ?? []), [highlight.rows]);
  const colsSet = useMemo(() => new Set(highlight.cols ?? []), [highlight.cols]);
  const entrySet = useMemo(() => buildEntrySet(highlight.entries), [highlight.entries]);

  return (
    <div className="matrixWrap" aria-label="matrix-display">
      <table className="matrix">
        <tbody>
          {A.map((row, i) => (
            <tr key={i}>
              {row.map((x, j) => {
                const key = `${i},${j}`;
                const isAugSep = j === augmentedCol;
                const isEntry = entrySet.has(key);
                const isRow = rowsSet.has(i);
                const isCol = colsSet.has(j);
                const cls = [
                  isAugSep ? "augSep" : "",
                  isEntry ? "hl" : "",
                  !isEntry && (isRow || isCol) ? "hlg" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                return (
                  <td key={j} className={cls}>
                    {toString(x)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Editor({
  editor,
  setEditor,
  rows,
  cols,
  setRows,
  setCols,
}: {
  editor: string[][];
  setEditor: (e: string[][]) => void;
  rows: number;
  cols: number;
  setRows: (n: number) => void;
  setCols: (n: number) => void;
}) {
  return (
    <div className="card">
      <div className="cardTitle">
        <h3>Matrix input/editor</h3>
        <span>Use integers or fractions like <span className="kbd">-3/2</span></span>
      </div>

      <div className="controls" style={{ marginBottom: 10 }}>
        <span className="badge">Rows</span>
        <button className="btn" onClick={() => { const nr = clamp(rows - 1, 1, 8); setRows(nr); setEditor(resizeEditor(editor, nr, cols)); }}>-</button>
        <span className="badge"><b>{rows}</b></span>
        <button className="btn" onClick={() => { const nr = clamp(rows + 1, 1, 8); setRows(nr); setEditor(resizeEditor(editor, nr, cols)); }}>+</button>

        <span className="badge" style={{ marginLeft: 10 }}>Cols</span>
        <button className="btn" onClick={() => { const nc = clamp(cols - 1, 2, 10); setCols(nc); setEditor(resizeEditor(editor, rows, nc)); }}>-</button>
        <span className="badge"><b>{cols}</b></span>
        <button className="btn" onClick={() => { const nc = clamp(cols + 1, 2, 10); setCols(nc); setEditor(resizeEditor(editor, rows, nc)); }}>+</button>

        <span className="small" style={{ marginLeft: "auto" }}>
          Augmented column is the last column.
        </span>
      </div>

      <div style={{ overflow: "auto" }}>
        <table className="editorTable">
          <tbody>
            {editor.map((row, i) => (
              <tr key={i}>
                {row.map((val, j) => (
                  <td key={j}>
                    <input
                      value={val}
                      onChange={(e) => {
                        const next = cloneEditor(editor);
                        next[i][j] = e.target.value;
                        setEditor(next);
                      }}
                      aria-label={`entry-${i}-${j}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function App() {
  const [rows, setRows] = useState(2);
  const [cols, setCols] = useState(3); // augmented
  const [editor, setEditor] = useState<string[][]>(defaultExampleEditor());

  const [steps, setSteps] = useState<Step[] | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [autoRunning, setAutoRunning] = useState(false);
  const autoTimer = useRef<number | null>(null);

  const currentStep = steps ? steps[stepIndex] : null;
  const activeSection = currentStep ? currentStep.summarySection : 1;

  const canPrev = steps && stepIndex > 0;
  const canNext = steps && stepIndex < steps.length - 1;

  function stopAuto() {
    setAutoRunning(false);
    if (autoTimer.current !== null) {
      window.clearInterval(autoTimer.current);
      autoTimer.current = null;
    }
  }

  useEffect(() => {
    if (!autoRunning) return;
    if (!steps) { setAutoRunning(false); return; }
    if (autoTimer.current !== null) window.clearInterval(autoTimer.current);
    autoTimer.current = window.setInterval(() => {
      setStepIndex((i) => {
        if (!steps) return i;
        if (i >= steps.length - 1) {
          stopAuto();
          return i;
        }
        return i + 1;
      });
    }, 900);
    return () => stopAuto();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunning, steps]);

  function start() {
    stopAuto();
    setError(null);
    const shapeErr = validateAugmentedShape(rows, cols);
    if (shapeErr) { setError(shapeErr); return; }

    try {
      const A = parseMatrixStrings(editor);
      const { steps: s } = generateSteps(A);
      setSteps(s);
      setStepIndex(0);
    } catch (e: any) {
      setSteps(null);
      setStepIndex(0);
      setError(e?.message ?? "Failed to start.");
    }
  }

  function resetAll() {
    stopAuto();
    setSteps(null);
    setStepIndex(0);
    setError(null);
  }

  function loadExample(idx: number) {
    stopAuto();
    setSteps(null);
    setStepIndex(0);
    setError(null);
    const ex = EXAMPLES[idx];
    setRows(ex.matrix.length);
    setCols(ex.matrix[0].length);
    setEditor(ex.matrix.map(r => r.slice()));
  }

  const logItems = useMemo(() => {
    if (!steps) return [];
    // include only steps with a row operation text (non-empty)
    return steps
      .map((s, i) => ({ i, txt: s.rowOpText }))
      .filter(x => x.txt.trim().length > 0);
  }, [steps]);

  return (
    <div className="app">
      {/* Left panel */}
      <div className="panel">
        <div className="panelHeader">
          <div>
            <div className="title">Method of Gaussian Elimination</div>
            <div className="subtitle">6-part map; highlighted step-by-step</div>
          </div>
          <div className="badge">{steps ? `Step ${stepIndex + 1}/${steps.length}` : "Not started"}</div>
        </div>

        <div className="panelBody">
          <div className="methodList">
            {METHOD.map((m, i) => {
              const active = activeSection === i + 1;
              return (
                <div key={i} className={"methodItem " + (active ? "methodItemActive" : "")}>
                  <div className="methodIndex">SECTION {i + 1}</div>
                  <div className="methodTitle">{m.title}</div>
                  <div className="methodDesc">{m.desc}</div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14 }} className="small">
            Tip: The bookkeeping log uses strict notation like <span className="kbd">R_2 - (3/2)R_1 \to R_2</span>.
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="rightGrid">
        <div className="panel">
          <div className="panelHeader">
            <div>
              <div className="title">Gaussian elimination: step-by-step</div>
              <div className="subtitle">Exact fractions, every row operation shown</div>
            </div>
            <div className="small">
              Works on GitHub Pages subpath <span className="kbd">/gaussian-elimination/</span>
            </div>
          </div>

          <div className="panelBody">
            <div className="controls">
              <button className="btn btnPrimary" onClick={start}>Start</button>
              <button className="btn" onClick={() => steps && setStepIndex(i => clamp(i + 1, 0, steps.length - 1))} disabled={!canNext}>Next</button>
              <button className="btn" onClick={() => steps && setStepIndex(i => clamp(i - 1, 0, steps.length - 1))} disabled={!canPrev}>Previous</button>
              <button className="btn" onClick={() => setAutoRunning(v => !v)} disabled={!steps}>
                {autoRunning ? "Stop" : "Auto-run"}
              </button>
              <button className="btn btnDanger" onClick={() => { stopAuto(); resetAll(); }}>Reset</button>

              <select className="select" onChange={(e) => loadExample(Number(e.target.value))} defaultValue="-1">
                <option value="-1" disabled>Load example</option>
                {EXAMPLES.map((ex, i) => (
                  <option value={i} key={i}>{ex.name}</option>
                ))}
              </select>
            </div>

            {error && (
              <div style={{ marginTop: 10 }} className="card">
                <div className="cardTitle">
                  <h3 style={{ color: "var(--danger)" }}>Input error</h3>
                  <span>Fix the matrix entries and try again.</span>
                </div>
                <div className="explainer">{error}</div>
              </div>
            )}
          </div>
        </div>

        <div className="grid2" style={{ alignItems: "stretch" }}>
          <Editor
            editor={editor}
            setEditor={setEditor}
            rows={rows}
            cols={cols}
            setRows={setRows}
            setCols={setCols}
          />

          <div className="card">
            <div className="cardTitle">
              <h3>Current matrix</h3>
              <span>{steps ? "after the current step" : "press Start to generate steps"}</span>
            </div>

            {currentStep ? (
              <MatrixView A={currentStep.afterMatrix} highlight={currentStep.highlight} augmentedCol={cols - 1} />
            ) : (
              <div className="small">No steps generated yet.</div>
            )}

            {currentStep && (
              <div style={{ marginTop: 12 }} className="explainer">
                {currentStep.rowOpText.trim().length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    Row operation: <span className="op">{currentStep.rowOpText}</span>
                  </div>
                )}
                {currentStep.explanationText.split("\n").map((line, idx) => (
                  <div key={idx} style={{ marginBottom: idx === 0 ? 8 : 0 }}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <div className="title">Row-operation log (bookkeeping)</div>
              <div className="subtitle">Only actual row operations appear here</div>
            </div>
            <div className="small">Use <span className="kbd">Next</span>/<span className="kbd">Previous</span> to revisit steps</div>
          </div>

          <div className="panelBody">
            {!steps ? (
              <div className="small">Press Start to generate the full step list first.</div>
            ) : (
              <div className="log" aria-label="rowop-log">
                {logItems.map((it) => {
                  const s = steps[it.i];
                  const active = it.i === stepIndex;
                  return (
                    <div key={it.i} className={"logItem " + (active ? "logItemActive" : "")}>
                      <span className="small">Step {it.i + 1}:</span> <span className="op">{it.txt}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
