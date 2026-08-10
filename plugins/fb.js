const { cmd } = require('../arslan');
const axios = require('axios');
const config = require('../config');

cmd({
  pattern: "fb",
  react: "☺️",
  alias: ["facebook", "fbdl"],
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, reply, prefix }) => {
  try {
    if (!q) return reply("*AP NE KOI FACEBOOK VIDEO DOWNLOAD KARNI HAI 🤔 TO AP US FACEBOOK VIDEO KA LINK COPY KAR LO 🤗*\n*PHIR ESE LIKHO ☺️*\n\n*FB ❮FACEBOOK VIDEO LINK❯*\n\n*JAB AP ESE LIKHO GE 😇 TO APKI FACEBOOK VIDEO DOWNLOAD KAR KE 😃 YAHA PER BHEJ DE JAYE GE 😍♥️*");

    await conn.sendMessage(from, { react: { text: '⏳', key: mek.key } });
    
    const apiUrl = `https://movanest.xyz/v2/fbdown?url=${encodeURIComponent(q)}`;
    const res = await axios.get(apiUrl);
    const data = res.data;

    if (data.status !== true || !data.results || data.results.length === 0) {
      return reply("❌ Video not found or API error. Please check the link.");
    }

    const result = data.results[0];
    const hd = result.hdQualityLink || "";
    const sd = result.normalQualityLink || "";

    if (!hd && !sd) return reply("❌ No download links found.");

    const listText = `
----------------------------
. | 🎹 SELECT VIDEO QUALITY
----------------------------
${config.BOT_NAME || 'FAIZAN-MD'} FACEBOOK DOWNLOADER
`;

    const rows = [];
    if (hd) {
      rows.push({title: "🎥 HD QUALITY", rowId: `${prefix}fb-dl ${hd}`, description: "Download in High Definition"});
    }
    if (sd) {
      rows.push({title: "📺 SD QUALITY", rowId: `${prefix}fb-dl ${sd}`, description: "Download in Standard Definition"});
    }

    const listMessage = {
      text: listText,
      footer: config.BOT_FOOTER,
      title: "👑 FACEBOOK DOWNLOADER 👑",
      buttonText: "SELECT QUALITY",
      sections: [{ title: "Select Quality", rows }]
    };

    await conn.sendMessage(from, listMessage, { quoted: mek });

  } catch (err) {
    reply("❌ Error occurred while processing Facebook video.");
  }
});

cmd({
  pattern: "fb-dl",
  dontAddCommandList: true,
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  if (!args.length) return;
  const videoUrl = args[0];
  try {
    await conn.sendMessage(from, { react: { text: "📥", key: mek.key } });
    await conn.sendMessage(
      from,
      {
        video: { url: videoUrl },
        mimetype: "video/mp4",
        caption: `*👑 FB VIDEO DOWNLOADED 👑*\n\n${config.BOT_FOOTER || '> *𝐏σωєяє∂ 𝐁у 𝐅αɪᴢαɴ-𝐌ᴅ⎯꯭̽🩷*'}`
      },
      { quoted: mek }
    );
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });
  } catch (e) {
    reply("❌ Failed to send video.");
  }
});
