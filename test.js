// Self-check for conditions, row blocks and the move/delete flow: node test.js
const vm = require('vm'), fs = require('fs'), assert = require('assert');
const ctx = {}; vm.runInNewContext(fs.readFileSync(__dirname + '/Code.gs', 'utf8'), ctx);
const now = new Date('2026-10-19T12:00:00Z');
const m = (w, v) => ctx.matches_(w, v, now);
assert.ok(m('blank', '')); assert.ok(!m('blank', 0));
assert.ok(m('zero', 0)); assert.ok(!m('zero', ''));
assert.ok(m('checked', true)); assert.ok(!m('checked', 'TRUE'));
assert.ok(m('equals:Done', ' done ')); assert.ok(!m('equals:Done', 'Not done'));
assert.ok(m('contains:test', 'A Test row')); assert.ok(m('equals:a:b', 'A:B'));
assert.ok(m('older than:90', new Date('2026-06-01'))); assert.ok(!m('older than:90', new Date('2026-10-01')));
assert.ok(!m('older than:90', 'yesterday'));
assert.throws(() => m('bogus', 1), /Unknown condition/);
assert.deepEqual(JSON.parse(JSON.stringify(ctx.blocks_([2, 3, 4, 7, 9, 10]))), [[9, 2], [7, 1], [2, 3]]);
assert.equal(ctx.colNumber_('d'), 4);

// Move flow with a fake sheet: rows 2 and 4 are Done → appended to Done, deleted bottom-up.
const grid = [['Task', 'Status'], ['a', 'Done'], ['b', 'Open'], ['c', 'done']];
const appended = [], deleted = [];
const target = { getLastRow: () => 1, getRange: (r, c, h, w) => ({ setValues: v => appended.push({ r, v }) }) };
const sheet = {
  getParent: () => ({ getSheetByName: () => target }), getLastColumn: () => 2, getLastRow: () => grid.length,
  getMaxRows: () => 1000, getFrozenRows: () => 1,
  getRange: () => ({ getValues: () => grid }), deleteRows: (s, n) => deleted.push([s, n]),
};
ctx.apply_(sheet, { action: 'move:Done' }, [4, 2]);
assert.deepEqual(JSON.parse(JSON.stringify(appended)), [{ r: 2, v: [['a', 'Done'], ['c', 'done']] }]);
assert.deepEqual(deleted, [[4, 1], [2, 1]]);
// Deleting every data row under a frozen header first adds a spare row.
let inserted = 0; const tiny = { ...sheet, getMaxRows: () => 3, insertRowsAfter: () => inserted++ };
ctx.apply_(tiny, { action: 'delete' }, [2, 3]); assert.equal(inserted, 1);
console.log('ok');
