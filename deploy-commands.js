require("dotenv").config();
const { REST, Routes } = require("discord.js");

const commands = [
  {
    name: "play",
    description: "Play a track (YouTube/URL/search depends on Lavalink sources)",
    options: [
      {
        name: "query",
        description: "Song name or URL",
        type: 3,
        required: true,
      },
    ],
  },
  { name: "skip", description: "Skip current track" },
  { name: "stop", description: "Stop playback and leave" },
  { name: "queue", description: "Show the queue" },
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("Deploying slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands deployed!");
  } catch (e) {
    console.error(e);
  }
})();
