export function renderLatex(text: string): string {
  if (!text) return '';
  try {
    const katex = typeof window !== 'undefined' ? (window as any).katex : null;

    const parseFallbackMath = (str: string) => {
      return str
        .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '<span style="display:inline-flex;flex-direction:column;vertical-align:middle;text-align:center;padding:0 3px;line-height:1.1"><span style="border-bottom:1.5px solid currentColor;padding-bottom:1px;font-weight:700">$1</span><span style="font-weight:700">$2</span></span>')
        .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
        .replace(/\\neq\s*0/g, '≠ 0')
        .replace(/\\neq/g, '≠')
        .replace(/\\implies/g, '⇒')
        .replace(/\\times/g, '×')
        .replace(/\\div/g, '÷')
        .replace(/\\pm/g, '±')
        .replace(/\\pi/g, 'π')
        .replace(/\\Delta/g, 'Δ')
        .replace(/\\angle/g, '∠')
        .replace(/\\\^\circ/g, '°')
        .replace(/\^2/g, '²')
        .replace(/\^3/g, '³')
        .replace(/\\text\{([^}]+)\}/g, '$1');
    };

    // Delimiters: \(...\), \[...\], $$...$$, or single $...$
    const mathRegex = /(?:\x5C\(|\x5C\[|\$\$|\$)([\s\S]*?)(?:\x5C\)|\x5C\]|\$\$|\$)/g;

    let hasMatches = false;
    const result = text.replace(mathRegex, (match, formula) => {
      if (!formula || !formula.trim()) return match;
      hasMatches = true;
      const cleanFormula = formula.trim();
      if (katex) {
        try {
          return katex.renderToString(cleanFormula, { displayMode: false, throwOnError: false });
        } catch (e) {
          return parseFallbackMath(cleanFormula);
        }
      }
      return parseFallbackMath(cleanFormula);
    });

    if (!hasMatches) {
      if (/\\(frac|sqrt|neq|implies|times|div|pm|pi|Delta|angle|text|\^)/.test(text)) {
        if (katex) {
          try {
            return katex.renderToString(text, { displayMode: false, throwOnError: false });
          } catch (e) {
            return parseFallbackMath(text);
          }
        }
        return parseFallbackMath(text);
      }
      return text;
    }

    return result;
  } catch (e) {
    return text;
  }
}
