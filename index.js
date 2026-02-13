require("dotenv").config();

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const { LavalinkManager } = require("lavalink-client");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates
  ]
});

/* ================= LAVALINK ================= */

const manager = new LavalinkManager({
  nodes: [
    {
      host: "YOUR_LAVALINK_HOST",
      port: 2333,
      authorization: "youshallnotpass",
      secure: false
    }
  ],
  sendToShard: (guildId, payload) => {
    const guild = client.guilds.cache.get(guildId);
    if (guild) guild.shard.send(payload);
  }
});

client.on("raw", (d) => manager.updateVoiceState(d));

client.once("ready", async () => {
  console.log(`Logged in as ${client.user.tag}`);

  await manager.init({
    user: client.user.id,
    shards: 1
  });

  console.log("Lavalink connected");
});

/* ================= SLASH COMMAND ================= */

const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play a song from YouTube")
    .addStringOption(option =>
      option
        .setName("song")
        .setDescription("Song name or YouTube link")
        .setRequired(true)
    )
    .toJSON()
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );
  console.log("Slash command registered");
})();

/* ================= PLAY LOGIC ================= */

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "play") {
    const query = interaction.options.getString("song");
    const voice = interaction.member.voice.channel;

    if (!voice) {
      return interaction.reply({
        content: "Join a voice channel first.",
        ephemeral: true
      });
    }

    await interaction.deferReply();

    let player = manager.players.get(interaction.guildId);

    if (!player) {
      player = manager.createPlayer({
        guildId: interaction.guildId,
        voiceChannelId: voice.id,
        textChannelId: interaction.channelId
      });
    }

    await player.connect();

    const result = await manager.search(query, {
      requester: interaction.user
    });

    if (!result || !result.tracks.length) {
      return interaction.editReply("No results found.");
    }

    player.queue.add(result.tracks[0]);

    if (!player.playing && !player.paused) {
      await player.play();
    }

    interaction.editReply(`Now playing: **${result.tracks[0].info.title}**`);
  }
});

client.login(process.env_TOKEN);





