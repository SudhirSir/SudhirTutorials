/**
 * Flexible Answer Evaluator for Numerical & Short Answer Input Questions.
 * Handles variations in phrasing, math symbols (pi/pie/π), units (m^2/m square/sq m),
 * filler text ("area of circle is", "x = ", "answer is"), and numeric float equivalence.
 */

export function normalizeAnswerText(text: string): string {
  if (!text) return "";

  let str = text.toLowerCase().trim();

  // Remove common filler prefixes
  const fillerPrefixes = [
    /^area\s+of\s+(the\s+)?(circle|rectangle|square|triangle|trapezium|shape|figure|cylinder|cone|sphere)\s+(is|=)\s*/i,
    /^(the\s+)?answer\s+(is|=)\s*/i,
    /^(the\s+)?result\s+(is|=)\s*/i,
    /^(the\s+)?value\s+(of\s+\w+\s+)?(is|=)\s*/i,
    /^(the\s+)?si\s+unit\s+(of\s+\w+\s+)?(is|=)\s*/i,
    /^(x|y|z|a|b|c|r|h|v|k)\s*=\s*/i,
    /^ans(wer)?:\s*/i,
  ];

  for (const prefix of fillerPrefixes) {
    str = str.replace(prefix, "");
  }

  // Remove filler phrases if they appear anywhere
  str = str.replace(/\b(area\s+of\s+circle\s+is|area\s+is|answer\s+is|value\s+is|the\s+answer\s+is)\b/g, "");

  // Standardize math symbols and units
  str = str
    .replace(/\b(pie|pi|π)\b/g, "pi")
    .replace(/\\pi/g, "pi")
    .replace(/\b(sq\s*m|m\s*sq|m\s*square|meters\s*square|meter\s*square|m\^2|m²)\b/g, "m2")
    .replace(/\b(sq\s*cm|cm\s*sq|cm\s*square|centimeters\s*square|centimeter\s*square|cm\^2|cm²)\b/g, "cm2")
    .replace(/\b(sq\s*mm|mm\s*sq|mm\s*square|mm\^2|mm²)\b/g, "mm2")
    .replace(/\b(degree|degrees|°|deg)\b/g, "deg")
    .replace(/[\(\)\{\}\[\]\$\\\/\,\:\;\=\_\-\"\']/g, " ") // Remove punctuation & LaTeX delimiters
    .replace(/\s+/g, " ")
    .trim();

  return str;
}

export function isInputAnswerCorrect(
  studentInput: string | number | undefined | null,
  expectedInput: string | number | undefined | null
): boolean {
  if (studentInput === undefined || studentInput === null || String(studentInput).trim() === "") {
    return false;
  }
  if (expectedInput === undefined || expectedInput === null || String(expectedInput).trim() === "") {
    return false;
  }

  const rawStudent = String(studentInput).trim().toLowerCase();
  const rawExpected = String(expectedInput).trim().toLowerCase();

  // 1. Direct exact match (case-insensitive)
  if (rawStudent === rawExpected) return true;

  // 2. Normalized string match
  const normStudent = normalizeAnswerText(rawStudent);
  const normExpected = normalizeAnswerText(rawExpected);

  if (normStudent === normExpected && normStudent.length > 0) return true;

  // 3. Substring inclusion check (if normalized expected contains student answer or vice versa)
  if (normStudent.length > 0 && normExpected.length > 0) {
    if (normExpected.includes(normStudent) || normStudent.includes(normExpected)) {
      return true;
    }
  }

  // 4. Pure numeric equivalence (e.g. 4.0 vs 4, or 4.50 vs 4.5)
  const numStudent = parseFloat(normStudent);
  const numExpected = parseFloat(normExpected);
  if (!isNaN(numStudent) && !isNaN(numExpected) && Math.abs(numStudent - numExpected) < 0.0001) {
    return true;
  }

  return false;
}
