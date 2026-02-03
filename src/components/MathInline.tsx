import { useMemo } from "react";
import katex from "katex";

/**
 * Renders a LaTeX string as inline math using KaTeX.
 *
 * - Expects `latex` to already be valid LaTeX (authoritative step-engine strings).
 * - Uses KaTeX's built-in MathML output for accessibility.
 */
export default function MathInline({
  latex,
  className,
}: {
  latex: string;
  className?: string;
}) {
  const html = useMemo(() => {
    // KaTeX expects a single backslash in the string; our step engine already provides valid LaTeX.
    return katex.renderToString(latex, {
      displayMode: false,
      throwOnError: false,
      output: "htmlAndMathml",
      strict: "ignore",
    });
  }, [latex]);

  return (
    <span
      className={className}
      // KaTeX output includes MathML for screen readers.
      // Provide an aria-label fallback using the original LaTeX.
      aria-label={latex}
      role="math"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
