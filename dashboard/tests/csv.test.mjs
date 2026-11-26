import test from 'node:test';
import assert from 'node:assert/strict';
import { csvCell, csvRow } from '../lib/csv.js';

test('csv cells are quoted and formulas are neutralised', () => {
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('=HYPERLINK("x")'), `"'=HYPERLINK(""x"")"`);
  assert.equal(csvCell('-1+1'), "'-1+1");
  assert.equal(csvCell(null), '');
  assert.equal(csvCell(new Date(0)), '1970-01-01T00:00:00.000Z');
});

test('a row follows the column order', () => {
  const row = csvRow({ ts: new Date(0), line: 'line1', device: 'cira-01', result: 'FAIL', className: 'bad', confidence: 0.9, framesSeen: 5, votes: { pass: 1, fail: 4 }, eventId: 'e1' });
  assert.equal(row, '1970-01-01T00:00:00.000Z,line1,cira-01,FAIL,bad,0.9,5,1,4,e1');
});
