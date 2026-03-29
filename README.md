# Discord Verify Bot

Phone number whitelist verification bot for Discord, with WhatsApp group sync via your existing WA bot.

## Directory Structure
```
/home/julius/discord-verify/    ← Discord bot
├── index.js
├── package.json
├── .env
├── data/
│   └── verify.db               ← auto-created on first run
└── src/
    ├── db.js
    ├── verify.js
    └── commands.js

/home/julius/wa-bot/            ← your existing WA bot
└── plugins/
    └── wa-verify.js            ← only file you add here
```

## Discord Bot Setup

1. Install dependencies
```bash
cd /home/julius/discord-verify
npm install discord.js sql.js dotenv
```

2. Create your `.env` file
```
DISCORD_TOKEN=your_bot_token_here
VERIFIED_ROLE=Verified
```

3. In the Discord Developer Portal, enable these privileged intents:
   - Server Members Intent
   - Message Content Intent

   And make sure the bot has these permissions:
   - Manage Roles
   - Send Messages
   - Read Messages

4. Create a role called `Verified` in your server (or set a different name in `.env`)

5. Run the bot
```bash
node index.js
# or with PM2:
pm2 start index.js --name verify-bot
```

6. In any Discord channel, type `!postpanel` — this posts the verification button. Then you can delete your message; the panel stays.

## WA Bot Setup

1. Install sql.js in your WA bot directory
```bash
cd /home/julius/wa-bot
npm install sql.js
```

2. Drop `wa-verify.js` into your `plugins/` folder

3. Open `wa-verify.js` and update the DB path at the top to match your Discord bot location:
```js
const DB_PATH = '/home/julius/discord-verify/data/verify.db'
```

4. Restart your WA bot — the commands are auto-loaded

## How Verification Works

1. User clicks **Verify Me** in the Discord panel
2. A popup asks for their phone number
3. Bot checks if the number is in the database and unclaimed
4. If yes → assigns the `Verified` role and locks that number to their account
5. If the user leaves the server → number is automatically freed for someone else

One number = one Discord account. No double-claiming.

## Discord Admin Commands

| Command | Description |
|---|---|
| `!postpanel` | Post the verification button in the current channel |
| `!addnum +60123456789` | Add a number to the whitelist |
| `!removenum +60123456789` | Remove a number |
| `!listnum` | List all numbers and who has claimed them |
| `!unverify @user` | Remove verification from a user and free their number |

## WA Commands (owner/admin only)

| Command | Description |
|---|---|
| `!wasync` | Sync all members of the current group into the DB |
| `!walist` | List all numbers in the DB |
| `!waadd +60123456789` | Manually add a number |
| `!waremove +60123456789` | Manually remove a number |

> `!wasync` must be run inside the WhatsApp group you want to pull members from.
