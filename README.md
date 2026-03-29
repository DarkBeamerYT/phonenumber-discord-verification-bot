# Discord Verify Bot

Phone number whitelist verification bot with optional WhatsApp group sync.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your DISCORD_TOKEN
   ```

3. **Discord Developer Portal** — your bot needs these:
   - Privileged intents: `Server Members Intent` + `Message Content Intent`
   - Permissions: `Manage Roles`, `Send Messages`, `Read Messages`

4. **Create a `Verified` role** in your server (or set a different name in `.env`)

5. **Run the bot**
   ```bash
   node index.js
   # or with PM2:
   pm2 start index.js --name verify-bot
   ```

6. **Post the verification panel** — in any channel, type:
   ```
   !postpanel
   ```

---

## Admin Commands

| Command | Description |
|---|---|
| `!addnum +60123456789` | Add a phone number to the whitelist |
| `!removenum +60123456789` | Remove a number |
| `!listnum` | List all numbers + who has claimed them |
| `!unverify @user` | Remove verification from a user and free their number |

### WhatsApp Sync

| Command | Description |
|---|---|
| `!waconnect` | Start WhatsApp — scan QR from **server console** |
| `!wagroups` | List all WA groups + their JIDs |
| `!wasync <groupJid>` | Bulk-import all member numbers from a group |

**WA sync flow:**
1. `!waconnect` → scan QR in console
2. `!wagroups` → copy the JID of your target group
3. `!wasync 120363xxxxxxx@g.us` → done

Auth is saved to `data/wa-auth/` so you only scan once.

---

## How Verification Works

1. User clicks **Verify Me** button in the panel channel
2. A modal pops up asking for their phone number
3. Bot checks if the number is in the DB and unclaimed
4. If yes → assigns `Verified` role and binds their Discord ID to that number
5. If the user leaves the server → number is automatically freed

One number = one account. No double-claiming.
