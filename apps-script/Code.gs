const RAW_SHEET_NAME = 'RemiScoreBackup';
// Optional: paste a spreadsheet ID here to force a specific spreadsheet.
// Leave empty to auto-resolve (uses the script's container sheet, or finds/creates "RemiScoreBackup" in Drive).
const OVERRIDE_SPREADSHEET_ID = '';

const TABLE_DEFS = {
  Circles: ['id', 'name', 'created_at'],
  Players: ['id', 'name', 'circle_id', 'created_at'],
  Sessions: ['id', 'circle_id', 'label', 'status', 'created_at', 'completed_at'],
  Rounds: ['id', 'session_id', 'round_number', 'timestamp'],
  Scores: ['id', 'round_id', 'player_id', 'score_change', 'cumulative_total'],
  SessionPlayers: ['session_id', 'player_id', 'is_active'],
};

const TABLE_KEYS = {
  Circles: 'circles',
  Players: 'players',
  Sessions: 'sessions',
  Rounds: 'rounds',
  Scores: 'scores',
  SessionPlayers: 'session_players',
};

function getSpreadsheet_() {
  const props = PropertiesService.getScriptProperties();

  if (OVERRIDE_SPREADSHEET_ID !== '') {
    const ss = SpreadsheetApp.openById(OVERRIDE_SPREADSHEET_ID);
    props.setProperty('SPREADSHEET_ID', ss.getId());
    return ss;
  }

  const stored = props.getProperty('SPREADSHEET_ID');
  if (stored) return SpreadsheetApp.openById(stored);

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    props.setProperty('SPREADSHEET_ID', active.getId());
    return active;
  }

  const files = DriveApp.getFilesByName(RAW_SHEET_NAME);
  const ss = files.hasNext() ? SpreadsheetApp.openById(files.next().getId()) : SpreadsheetApp.create(RAW_SHEET_NAME);
  props.setProperty('SPREADSHEET_ID', ss.getId());
  return ss;
}

function doPost(e) {
  const ss = getSpreadsheet_();
  const data = JSON.parse(e.postData.contents);

  const raw = ss.getSheetByName(RAW_SHEET_NAME) || ss.insertSheet(RAW_SHEET_NAME);
  raw.clearContents();
  raw.getRange(1, 1).setValue(JSON.stringify(data));
  raw.hideSheet();

  writeTables_(ss, (data && data.tables) || {});

  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  const ss = getSpreadsheet_();
  const raw = ss.getSheetByName(RAW_SHEET_NAME);
  if (!raw) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'no backup' })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(raw.getRange(1, 1).getValue()).setMimeType(ContentService.MimeType.JSON);
}

function writeTables_(ss, tables) {
  for (const [title, cols] of Object.entries(TABLE_DEFS)) {
    const rows = ((tables[TABLE_KEYS[title]] || [])).map((row) => cols.map((c) => (row[c] === null || row[c] === undefined ? '' : row[c])));

    const sheet = ss.getSheetByName(title) || ss.insertSheet(title);
    sheet.clearContents();
    const values = [cols, ...rows];
    sheet.getRange(1, 1, values.length, cols.length).setValues(values);

    sheet.setFrozenRows(1);
    const header = sheet.getRange(1, 1, 1, cols.length);
    header.setFontWeight('bold').setFontColor('#ffffff').setBackground('#6d5dfc');
    sheet.setColumnWidths(1, cols.length, 180);
  }
}

function test() {
  const e = { postData: { contents: JSON.stringify({ test: true, at: new Date().toISOString(), tables: {} }) } };
  Logger.log('POST -> ' + doPost(e).getContent());
  Logger.log('GET  -> ' + doGet().getContent());
}
