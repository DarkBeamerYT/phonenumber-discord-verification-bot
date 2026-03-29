import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'

// Change this to the absolute path of your discord bot's verify.db
const DB_PATH = '/home/julius/discord-verify/data/verify.db'

let _db = null

async function getDb() {
   if (_db) return _db
   const SQL = await initSqlJs()
   if (fs.existsSync(DB_PATH)) {
      _db = new SQL.Database(fs.readFileSync(DB_PATH))
   } else {
      _db = new SQL.Database()
   }
   _db.run(`
      CREATE TABLE IF NOT EXISTS numbers (
         phone      TEXT PRIMARY KEY,
         discord_id TEXT DEFAULT NULL,
         added_by   TEXT NOT NULL,
         added_at   INTEGER NOT NULL
      )
   `)
   saveDb()
   return _db
}

function saveDb() {
   if (!_db) return
   fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
   fs.writeFileSync(DB_PATH, Buffer.from(_db.export()))
}

function normalizePhone(raw) {
   const stripped = raw.replace(/[^\d+]/g, '').replace(/(?!^\+)\+/g, '')
   return stripped.startsWith('+') ? stripped : '+' + stripped
}

async function addNumber(phone, addedBy) {
   const db = await getDb()
   const norm = normalizePhone(phone)
   try {
      db.run(`INSERT INTO numbers (phone, added_by, added_at) VALUES (?, ?, ?)`, [norm, addedBy, Date.now()])
      saveDb()
      return { ok: true, phone: norm }
   } catch (e) {
      if (e.message.includes('UNIQUE')) return { ok: false, reason: 'exists', phone: norm }
      throw e
   }
}

async function removeNumber(phone) {
   const db = await getDb()
   const norm = normalizePhone(phone)
   db.run(`DELETE FROM numbers WHERE phone = ?`, [norm])
   saveDb()
   return norm
}

async function listNumbers() {
   const db = await getDb()
   const stmt = db.prepare(`SELECT * FROM numbers ORDER BY added_at DESC`)
   const rows = []
   while (stmt.step()) rows.push(stmt.getAsObject())
   stmt.free()
   return rows
}

async function bulkAdd(phones, addedBy) {
   const db = await getDb()
   let added = 0, skipped = 0
   for (const raw of phones) {
      const norm = normalizePhone(raw)
      if (!norm || norm === '+') continue
      try {
         db.run(`INSERT OR IGNORE INTO numbers (phone, added_by, added_at) VALUES (?, ?, ?)`, [norm, addedBy, Date.now()])
         if (db.getRowsModified() > 0) added++; else skipped++
      } catch { skipped++ }
   }
   saveDb()
   return { added, skipped }
}

export const run = {
   usage: ['wasync', 'walist', 'waadd', 'waremove'],
   use: '',
   category: 'owner',
   async: async (m, { client, text, command, isOwner, isAdmin, Utils }) => {
      try {
         if (!isOwner && !isAdmin) {
            return client.reply(m.chat, '❌ Owner/admin only.', m)
         }

         if (command === 'wasync') {
            if (!m.isGroup) return client.reply(m.chat, '❌ Run this inside the group you want to sync.', m)
            await client.reply(m.chat, '⏳ Syncing group members...', m)
            const meta = await client.sock.groupMetadata(m.chat)
            const phones = meta.participants.map(p => '+' + p.id.split('@')[0])
            const result = await bulkAdd(phones, m.sender)
            return client.reply(m.chat, `✅ Sync complete!\n\n• Added: *${result.added}*\n• Already existed: *${result.skipped}*\n• Total in group: *${phones.length}*`, m)
         }

         if (command === 'walist') {
            const rows = await listNumbers()
            if (!rows.length) return client.reply(m.chat, '📋 No numbers in the database yet.', m)
            const lines = rows.map((r, i) => `${i + 1}. ${r.phone} — ${r.discord_id ? '✅ linked' : '⬜ unclaimed'}`)
            return client.reply(m.chat, `📋 *Verified Numbers (${rows.length})*\n\n${lines.join('\n')}`, m)
         }

         if (command === 'waadd') {
            if (!text) return client.reply(m.chat, '• Usage: !waadd +60123456789', m)
            const result = await addNumber(text.trim(), m.sender)
            if (!result.ok) return client.reply(m.chat, `⚠️ ${result.phone} is already in the list.`, m)
            return client.reply(m.chat, `✅ Added ${result.phone}`, m)
         }

         if (command === 'waremove') {
            if (!text) return client.reply(m.chat, '• Usage: !waremove +60123456789', m)
            const norm = await removeNumber(text.trim())
            return client.reply(m.chat, `🗑️ Removed ${norm} (if it existed).`, m)
         }

      } catch (e) {
         console.error(e)
         return client.reply(m.chat, Utils.jsonFormat(e), m)
      }
   },
   error: false,
   limit: false,
   owner: true
}
