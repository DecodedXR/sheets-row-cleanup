---
title: How to automatically move or delete rows in Google Sheets based on a cell value (free)
description: Move a row to another tab when its status is Done, delete rows with blank or zero values, or archive old rows nightly. A free Apps Script with simple rules.
image: https://decodedxr.github.io/sheets-row-cleanup/assets/cover.png
---
{% raw %}

# How to automatically move or delete rows in Google Sheets based on a cell value (free)

Two jobs come up in almost every shared tracker:

- **Move finished rows out of the way:** when a task's Status becomes "Done", move the whole row to a Done tab.
- **Clean up:** delete rows where a column is blank or 0, or archive rows older than a few months.

Google Sheets can filter these rows, but it can't move or delete them on its own. This guide sets up [Row Cleanup](https://github.com/DecodedXR/sheets-row-cleanup), a free, MIT-licensed Apps Script that does both from a short list of rules.

## Step 1: Add the script

1. **Make a copy of your sheet to test on** (**File → Make a copy**). The script deletes rows, so test before pointing it at real data.
2. In the copy: **Extensions → Apps Script**. Replace `Code.gs` with [this `Code.gs`](https://github.com/DecodedXR/sheets-row-cleanup/blob/main/Code.gs).

## Step 2: Write your rules

At the top of the script is a `RULES` list. Each rule names a tab, a column, a condition, and what to do:

```js
const RULES = [
  { tab: 'Tasks', column: 'D', when: 'equals:Done', action: 'move:Done' },
];
```

That rule reads: on the **Tasks** tab, when column **D** equals "Done", move the row to the **Done** tab. (If there's no Done tab, it's created with your header row.)

| Condition | Matches |
|---|---|
| `blank` | an empty cell |
| `zero` | the number 0 |
| `checked` | a ticked checkbox |
| `equals:Done` | exactly "Done", ignoring case and extra spaces |
| `contains:test` | any text containing "test" |
| `older than:90` | a date more than 90 days ago |
| `always` | every row (menu and nightly run only) |

The action is `delete`, `move:Tab name`, or `clear:B:F`, which empties columns B to F of the row but keeps the row, its formatting and its checkboxes. Click **Save** when you're done.

## Step 3: Run it

- **Instantly:** rules with `equals`, `contains` or `checked` run the moment someone edits that column. Set a task to Done and watch the row move.
- **From the menu:** reload the sheet, then **🧹 Cleanup → Run Cleanup Now** runs every rule over the whole tab.
- **Every night:** **🧹 Cleanup → Run Daily** runs every rule around 2 AM. Good for `blank`, `zero` and `older than` rules.

The first time you use the menu, approve Google's prompt ("Google hasn't verified this app" → **Advanced → Go to (your project name) → Allow**). It's your own script.

## Recipes

```js
// Done tasks to a Done tab, the moment they're marked
{ tab: 'Tasks', column: 'D', when: 'equals:Done', action: 'move:Done' },
// Tick a checkbox in column A to archive the row
{ tab: 'Orders', column: 'A', when: 'checked', action: 'move:Archive' },
// Delete rows with no email
{ tab: 'Leads', column: 'C', when: 'blank', action: 'delete' },
// Delete zero-quantity lines
{ tab: 'Stock', column: 'E', when: 'zero', action: 'delete' },
// Archive log entries older than 90 days, nightly
{ tab: 'Log', column: 'A', when: 'older than:90', action: 'move:Archive' },
// Reset a daily checklist every night: untick column B and clear notes in C
{ tab: 'Checklist', column: 'A', when: 'always', action: 'clear:B:C' },
// Tick a "Reset" checkbox in column F to clear that row's entries
{ tab: 'Orders', column: 'F', when: 'checked', action: 'clear:B:F' },
```

## FAQ

**Why didn't my `blank` rule delete a row when I cleared a cell?** On purpose: clearing a cell to retype it shouldn't delete the row. `blank` and `zero` rules run from the menu and the nightly run only.

**Do moved rows keep formatting?** They keep values. Formatting, checkboxes and data validation aren't copied, and formulas arrive as their results.

**Can I undo?** Yes, with **Edit → Undo** right after, or **File → Version history** later.

**Does it work with Google Forms responses?** Form submissions don't trigger the instant mode, but the nightly run handles them. Rules on the Form Responses tab work like any other tab.

---

[Get the script on GitHub](https://github.com/DecodedXR/sheets-row-cleanup) · [More free Google Sheets scripts](https://decodedxr.github.io/free-google-sheets-scripts/)
{% endraw %}
