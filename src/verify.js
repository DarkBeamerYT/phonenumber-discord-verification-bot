const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const db = require('./db');

const BUTTON_ID = 'verify_btn';
const MODAL_ID = 'verify_modal';
const INPUT_ID = 'phone_input';

async function postVerifyPanel(channel) {
  const embed = new EmbedBuilder()
    .setTitle('🔐 Server Verification')
    .setDescription(
      'To gain access to this server, click the button below and enter your registered phone number.\n\n' +
      '> Your number must be pre-approved by an admin.'
    )
    .setColor(0x5865F2)
    .setFooter({ text: 'One number per account.' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(BUTTON_ID)
      .setLabel('Verify Me')
      .setStyle(ButtonStyle.Primary)
      .setEmoji('📱')
  );

  return channel.send({ embeds: [embed], components: [row] });
}

async function handleInteraction(interaction, guild) {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  if (interaction.isButton() && interaction.customId === BUTTON_ID) {
    const existing = await db.getClaimedBy(interaction.user.id);
    if (existing) {
      return interaction.reply({
        content: `✅ You're already verified with \`${existing.phone}\`.`,
        ephemeral: true,
      });
    }

    const modal = new ModalBuilder()
      .setCustomId(MODAL_ID)
      .setTitle('Phone Verification');

    const phoneInput = new TextInputBuilder()
      .setCustomId(INPUT_ID)
      .setLabel('Your phone number')
      .setPlaceholder('+60123456789')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setMinLength(7)
      .setMaxLength(20);

    modal.addComponents(new ActionRowBuilder().addComponents(phoneInput));
    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === MODAL_ID) {
    const rawPhone = interaction.fields.getTextInputValue(INPUT_ID).trim();
    await interaction.deferReply({ ephemeral: true });

    const alreadyClaimed = await db.getClaimedBy(interaction.user.id);
    if (alreadyClaimed) {
      return interaction.editReply(`✅ You're already verified with \`${alreadyClaimed.phone}\`.`);
    }

    const record = await db.checkNumber(rawPhone);
    if (!record) {
      return interaction.editReply('❌ That number isn\'t in our system. Contact an admin if you think this is a mistake.');
    }
    if (record.discord_id) {
      return interaction.editReply('⚠️ That number is already linked to another account.');
    }

    await db.claimNumber(record.phone, interaction.user.id);

    const roleName = process.env.VERIFIED_ROLE || 'Verified';
    const verifiedRole = guild.roles.cache.find(r => r.name === roleName);
    if (verifiedRole) {
      const member = await guild.members.fetch(interaction.user.id);
      await member.roles.add(verifiedRole).catch(console.error);
    }

    return interaction.editReply('✅ Verified! Welcome to the server.');
  }
}

async function handleMemberLeave(member) {
  await db.freeByDiscordId(member.id);
}

module.exports = { postVerifyPanel, handleInteraction, handleMemberLeave };
