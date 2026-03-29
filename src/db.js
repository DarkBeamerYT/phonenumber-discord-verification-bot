const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../data/verify.db');

let db;

async function getDb() {
  if (db) return db;
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS numbers (
      phone TEXT PRIMARY KEY,
      discord_id TEXT DEFAULT NULL,
      added_by TEXT NOT NULL,
      added_at INTEGER NOT NULL
    )
  `);
  save();
  return db;
}

function save() {
  if (!db) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function normalizePhone(raw) {
  const stripped = raw.replace(/[^\d+]/g, '').replace(/(?!^\+)\+/g, '');
  return stripped.startsWith('+') ? stripped : '+' + stripped;
}

async function addNumber(phone, addedBy) {
  const db = await getDb();
  const norm = normalizePhone(phone);
  try {
    db.run(`INSERT INTO numbers (phone, added_by, added_at) VALUES (?, ?, ?)`, [norm, addedBy, Date.now()]);
    save();
    return { success: true, phone: norm };
  } catch (e) {
    if (e.message.includes('UNIQUE')) return { success: false, reason: 'exists' };
    throw e;
  }
}

async function removeNumber(phone) {
  const db = await getDb();
  db.run(`DELETE FROM numbers WHERE phone = ?`, [normalizePhone(phone)]);
  save();
}

async function checkNumber(phone) {
  const db = await getDb();
  const norm = normalizePhone(phone);
  const stmt = db.prepare(`SELECT * FROM numbers WHERE phone = ?`);
  stmt.bind([norm]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

async function claimNumber(phone, discordId) {
  const db = await getDb();
  db.run(`UPDATE numbers SET discord_id = ? WHERE phone = ?`, [discordId, normalizePhone(phone)]);
  save();
}

async function freeByDiscordId(discordId) {
  const db = await getDb();
  db.run(`UPDATE numbers SET discord_id = NULL WHERE discord_id = ?`, [discordId]);
  save();
}

async function getClaimedBy(discordId) {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM numbers WHERE discord_id = ?`);
  stmt.bind([discordId]);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

async function listNumbers() {
  const db = await getDb();
  const stmt = db.prepare(`SELECT * FROM numbers ORDER BY added_at DESC`);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

async function bulkAddNumbers(phones, addedBy) {
  const db = await getDb();
  let added = 0, skipped = 0;
  for (const raw of phones) {
    const norm = normalizePhone(raw);
    if (!norm) continue;
    try {
      db.run(`INSERT OR IGNORE INTO numbers (phone, added_by, added_at) VALUES (?, ?, ?)`, [norm, addedBy, Date.now()]);
      if (db.getRowsModified() > 0) added++; else skipped++;
    } catch { skipped++; }
  }
  save();
  return { added, skipped };
}

module.exports = {
  addNumber, removeNumber, checkNumber,
  claimNumber, freeByDiscordId, getClaimedBy,
  listNumbers, bulkAddNumbers, normalizePhone
};
