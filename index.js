require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { handleCommand } = require('./src/commands');
const { postVerifyPanel, handleInteraction, handleMemberLeave } = require('./src/verify');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

client.once('ready', () => {
  console.log(`[Bot] Logged in as ${client.user.tag}`);
  console.log('[Bot] To post the verify panel, run: !postpanel in a channel');
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  if (
    message.content === '!postpanel' &&
    message.member?.permissions.has('Administrator')
  ) {
    await postVerifyPanel(message.channel);
    await message.delete().catch(() => {});
    return;
  }

  await handleCommand(message);
});

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction, interaction.guild);
});

client.on('guildMemberRemove', async (member) => {
  await handleMemberLeave(member);
  console.log(`[Bot] ${member.user.tag} left — number freed.`);
});

client.login(process.env.DISCORD_TOKEN);
