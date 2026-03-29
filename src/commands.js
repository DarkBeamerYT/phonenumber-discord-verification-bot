const { EmbedBuilder } = require('discord.js');
const db = require('./db');

const PREFIX = '!';
const ADMIN_ROLE = 'Admin'; // change if your admin role has a different name

function isAdmin(member) {
  return member.permissions.has('Administrator') ||
    member.roles.cache.some(r => r.name === ADMIN_ROLE);
}

async function handleCommand(message) {
  if (!message.content.startsWith(PREFIX)) return;
  if (message.author.bot) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  if (!isAdmin(message.member)) return;

  if (cmd === 'addnum') {
    if (!args[1]) return message.reply('Usage: `!addnum <phone>`');
    const result = await db.addNumber(args[1], message.author.id);
    if (!result.success) return message.reply(`⚠️ \`${args[1]}\` is already in the list.`);
    return message.reply(`✅ Added \`${result.phone}\``);
  }

  if (cmd === 'removenum') {
    if (!args[1]) return message.reply('Usage: `!removenum <phone>`');
    await db.removeNumber(args[1]);
    return message.reply(`🗑️ Removed \`${db.normalizePhone(args[1])}\` (if it existed).`);
  }

  if (cmd === 'listnum') {
    const rows = await db.listNumbers();
    if (!rows.length) return message.reply('No numbers in the database yet.');
    const lines = rows.map(r => {
      const status = r.discord_id ? `✅ <@${r.discord_id}>` : '⬜ unclaimed';
      return `\`${r.phone}\` — ${status}`;
    });
    const embed = new EmbedBuilder()
      .setTitle(`📋 Verified Numbers (${rows.length})`)
      .setDescription(lines.join('\n'))
      .setColor(0x5865F2);
    return message.reply({ embeds: [embed] });
  }

  if (cmd === 'unverify') {
    const target = message.mentions.members.first();
    if (!target) return message.reply('Usage: `!unverify @user`');
    const roleName = process.env.VERIFIED_ROLE || 'Verified';
    const verifiedRole = message.guild.roles.cache.find(r => r.name === roleName);
    if (verifiedRole) await target.roles.remove(verifiedRole).catch(() => {});
    await db.freeByDiscordId(target.id);
    return message.reply(`🔓 Unverified ${target} and freed their number.`);
  }
}

module.exports = { handleCommand };
```

---

**.env**
```
DISCORD_TOKEN=your_bot_token_here
VERIFIED_ROLE=Verified
