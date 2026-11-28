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

export const CSV_COLUMNS = ['ts', 'line', 'device', 'result', 'className', 'confidence', 'lengthCm', 'widthCm', 'heightCm', 'boxW', 'boxH', 'framesSeen', 'votesPass', 'votesFail', 'eventId'];

export function csvRow(d) {
  const s = d.size || {};
  const row = {
    ...d,
    votesPass: d.votes && d.votes.pass,
    votesFail: d.votes && d.votes.fail,
    lengthCm: s.lengthCm,
    widthCm: s.widthCm,
    heightCm: s.heightCm,
    boxW: s.w, // share of the camera frame
    boxH: s.h,
  };
  return CSV_COLUMNS.map((k) => csvCell(row[k])).join(',');
}
