/**
 * CSV helpers for the report download.
 * Cells that start with = + - @ (or tab / CR) are prefixed with ' so Excel does not run them as formulas.
 */
export function csvCell(v) {
  if (v === null || v === undefined) return '';
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_COLUMNS = ['ts', 'line', 'device', 'result', 'className', 'confidence', 'framesSeen', 'votesPass', 'votesFail', 'eventId'];

export function csvRow(d) {
  const row = { ...d, votesPass: d.votes && d.votes.pass, votesFail: d.votes && d.votes.fail };
  return CSV_COLUMNS.map((k) => csvCell(row[k])).join(',');
}
