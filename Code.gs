/** @OnlyCurrentDoc */ // asks Google for access to this spreadsheet only, not all your sheets

/**
 * Row Cleanup for Google Sheets: delete rows, or move them to another tab, when a column matches
 * a condition. Move finished tasks to "Done" the moment they're marked Done, clear out blank rows,
 * archive anything older than 90 days.
 *
 * Edit RULES below, then use 🧹 Cleanup → Run Cleanup Now, or Run Daily to do it every night.
 * Conditions (in `when`):
 *   'blank'            the cell is empty          'zero'           the cell is 0
 *   'checked'          a checkbox is ticked       'equals:Done'    the cell is "Done" (any case)
 *   'contains:test'    the cell contains "test"   'older than:90'  a date more than 90 days ago
 * Actions (in `action`): 'delete', or 'move:Tab name' to move the row to the bottom of that tab.
 */

const RULES = [
  // tab        column   when               action
  { tab: 'Tasks', column: 'D', when: 'equals:Done', action: 'move:Done' },
];
const HEADER_ROWS = 1;        // rows at the top that are never touched
const ON_EDIT = true;         // also apply equals/contains/checked rules the moment someone edits that column

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🧹 Cleanup')
    .addItem('Run Cleanup Now', 'cleanupMenu')
    .addItem('Run Daily (overnight)', 'runDaily')
    .addItem('Stop Daily Run', 'stopDaily')
    .addToUi();
}

function cleanupMenu() {
  const n = cleanup_();
  SpreadsheetApp.getUi().alert(n.moved + ' row(s) moved, ' + n.deleted + ' row(s) deleted.');
}

function runDaily() {
  stopTriggers_();
  ScriptApp.newTrigger('cleanupScheduled').timeBased().everyDays(1).atHour(2).create();
  SpreadsheetApp.getUi().alert('Cleanup will run every night around 2 AM (' + Session.getScriptTimeZone() + ').');
}

function stopDaily() {
  stopTriggers_();
  SpreadsheetApp.getUi().alert('Daily cleanup is off.');
}

function cleanupScheduled() { cleanup_(); }

function onEdit(e) {
  if (!ON_EDIT || e.range.getNumRows() !== 1 || e.range.getRow() <= HEADER_ROWS) return;
  const sheet = e.range.getSheet();
  // Never on 'blank' or 'zero': clearing a cell to retype it must not delete the row.
  RULES.filter(r => r.tab === sheet.getName() && colNumber_(r.column) === e.range.getColumn() && /^(equals|contains|checked)/i.test(r.when)).some(r => {
    if (!matches_(r.when, e.range.getValue(), new Date())) return false;
    apply_(sheet, r, [e.range.getRow()]);
    return true; // the row is gone; later rules can't see it
  });
}

function cleanup_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const total = { moved: 0, deleted: 0 };
  RULES.forEach(rule => {
    const sheet = ss.getSheetByName(rule.tab);
    if (!sheet || sheet.getLastRow() <= HEADER_ROWS) return;
    const values = sheet.getRange(HEADER_ROWS + 1, colNumber_(rule.column), sheet.getLastRow() - HEADER_ROWS, 1).getValues();
    const now = new Date();
    const rows = values.map((v, i) => matches_(rule.when, v[0], now) ? i + HEADER_ROWS + 1 : 0).filter(Boolean);
    if (!rows.length) return;
    apply_(sheet, rule, rows);
    total[isMove_(rule) ? 'moved' : 'deleted'] += rows.length;
  });
  return total;
}

/** Copy the rows to the target tab (if moving), then delete them, bottom-up in contiguous blocks. */
function apply_(sheet, rule, rows) {
  if (isMove_(rule)) {
    const ss = sheet.getParent();
    const name = rule.action.slice(5).trim();
    let target = ss.getSheetByName(name);
    if (!target) {
      target = ss.insertSheet(name);
      if (HEADER_ROWS) sheet.getRange(1, 1, HEADER_ROWS, sheet.getLastColumn()).copyTo(target.getRange(1, 1));
    }
    const width = sheet.getLastColumn();
    const all = sheet.getRange(1, 1, sheet.getLastRow(), width).getValues();
    const data = [...rows].sort((a, b) => a - b).map(r => all[r - 1]);
    target.getRange(target.getLastRow() + 1, 1, data.length, width).setValues(data);
  }
  // Sheets refuses to delete every row below the frozen ones, so keep a spare empty row.
  if (sheet.getMaxRows() - rows.length <= sheet.getFrozenRows()) sheet.insertRowsAfter(sheet.getMaxRows(), 1);
  blocks_(rows).forEach(([start, count]) => sheet.deleteRows(start, count));
}

function isMove_(rule) { return /^move:/i.test(rule.action); }

/** Does one cell value meet a condition like 'equals:Done' or 'older than:90'? */
function matches_(when, value, now) {
  const [kind, ...rest] = String(when).split(':');
  const arg = rest.join(':').trim().toLowerCase();
  const text = String(value).trim().toLowerCase();
  switch (kind.trim().toLowerCase()) {
    case 'blank': return value === '' || value === null;
    case 'zero': return value === 0;
    case 'checked': return value === true;
    case 'equals': return text === arg;
    case 'contains': return text.includes(arg);
    case 'older than': return Object.prototype.toString.call(value) === '[object Date]' && now - value > Number(arg) * 86400000;
    default: throw new Error('Unknown condition: ' + when);
  }
}

/** Row numbers → [[start, count], …] for contiguous runs, bottom-most first so deleting doesn't shift the rest. */
function blocks_(rows) {
  const sorted = [...rows].sort((a, b) => b - a);
  const out = [];
  sorted.forEach(r => {
    const last = out[out.length - 1];
    if (last && last[0] - 1 === r) { last[0] = r; last[1]++; } else out.push([r, 1]);
  });
  return out;
}

/** 'D' → 4, 'AA' → 27. */
function colNumber_(letters) {
  return String(letters).toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0);
}

function stopTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'cleanupScheduled')
    .forEach(t => ScriptApp.deleteTrigger(t));
}
