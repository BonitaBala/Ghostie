rrequire("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  REST,
  Routes,
  Events
} = require("discord.js");

const { LavalinkManager } = require("lavalink-client");

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

// ===== LAVALINK MANAGER =====
const manager = new LavalinkManager({
  nodes: [
    {
      id: "main",
      host: "localhost",
      port: 2333,
      authorization: "youshallnotpass",
      secure: false
    }
  ],

  // ✅ THIS is what was missing
  sendToShard: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  }
});

// ===== READY =====
client.once(Events.ClientReady, async () => {
  console.log(`✅ Logged in as ${client.user.tag}`);

  await manager.init(client.user.id);

  // Register slash command
  const commands = [
    new SlashCommandBuilder()
      .setName("play")
      .setDescription("Play a YouTube track")
      .addStringOption(option =>
        option.setName("url")
          .setDescription("YouTube URL")
          .setRequired(true)
      )
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );

  console.log("✅ Slash command registered.");
});

// ===== INTERACTION =====
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {
    await interaction.deferReply();

    const url = interaction.options.getString("url");
    const member = interaction.member;

    if (!member.voice.channel) {
      return interaction.editReply("❌ Join a voice channel first.");
    }

    const player = manager.createPlayer({
      guildId: interaction.guildId,
      voiceChannelId: member.voice.channel.id,
      textChannelId: interaction.channelId,
      selfDeaf: true
    });

    await player.connect();

    const result = await player.search({
      query: url,
      source: "youtube"
    }, interaction.user);

    if (!result || !result.tracks.length) {
      return interaction.editReply("❌ No results found.");
    }

    const track = result.tracks[0];

    await player.queue.add(track);

    if (!player.playing) {
      await player.play();
    }

    interaction.editReply(`🎵 Now playing: **${track.info.title}**`);
  }
});

// ===== VOICE STATE =====
client.on("raw", d => manager.updateVoiceState(d));

// ===== LOGIN =====
client.login(process.env.TOKEN);




