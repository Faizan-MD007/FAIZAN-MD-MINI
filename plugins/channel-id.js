const { cmd } = require("../arslan");
const { sendBtns } = require('../lib/buttons');

cmd({
  pattern: "cid",
  alias: ["newsletter", "id"],
  react: "📡",
  desc: "Get WhatsApp Channel info from link",
  category: "whatsapp",
  filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
  try {
    if (!q) {
      return reply(
`╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭
│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³ ⊱┈─̇─̣╌
│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣
│❌ Channel link missing
│✎ Example:
│ .cid https://whatsapp.com/channel/xxxx
╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭`
      );
    }

    const match = q.match(/whatsapp\.com\/channel\/([\w-]+)/);
    if (!match) {
      return reply(
`╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭
│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³ ⊱┈─̇─̣╌
│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣
│⚠️ Invalid channel link
│✔ Use proper WhatsApp
│  channel URL
╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭`
      );
    }

    const inviteId = match[1];

    let metadata;
    try {
      metadata = await conn.newsletterMetadata("invite", inviteId);
    } catch (e) {
      return reply(
`╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭
│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³ ⊱┈─̇─̣╌
│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣
│❌ Failed to fetch channel
│🔒 Link may be expired
╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭`
      );
    }

    if (!metadata || !metadata.id) {
      return reply(
`╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭
│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³ ⊱┈─̇─̣╌
│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣
│❌ Channel not found
│⏳ Try again later
╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭`
      );
    }

    const infoText =
`╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭
│ ╌─̇─̣⊰ 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐈𝐍𝐅𝐎 ⊱┈─̇─̣╌
│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣
│❀ 🆔 ID:
│ ${metadata.id}
│
│❀ 📌 Name:
│ ${metadata.name}
│
│❀ 👥 Followers:
│ ${metadata.subscribers?.toLocaleString() || "N/A"}
│
│❀ 📅 Created:
│ ${metadata.creation_time
  ? new Date(metadata.creation_time * 1000).toLocaleString()
  : "Unknown"}
╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³`;

    // Single "copy jid" button — the ask was specifically the channel ID, not
    // the whole info block, so it's a copy_code CTA rather than a quick reply.
    try {
      await sendBtns(conn, from, {
        title: '📡 CHANNEL INFO',
        text: infoText,
        ...(metadata.preview ? { image: { url: `https://pps.whatsapp.net${metadata.preview}` } } : {}),
        buttons: [
          { display_text: '📋 COPY JID', copy_code: metadata.id }
        ]
      }, m);
    } catch (e) {
      if (metadata.preview) {
        await conn.sendMessage(from, {
          image: { url: `https://pps.whatsapp.net${metadata.preview}` },
          caption: infoText
        }, { quoted: m });
      } else {
        await reply(infoText);
      }
    }

  } catch (error) {
    console.error("CID ERROR:", error);
    reply(
`╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭
│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³ ⊱┈─̇─̣╌
│─̇─̣┄┄┄┄┄┄┄┄┄┄┄┄┄─̇─̣
│❌ Unexpected Error
│⏳ Try again later
╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭`
    );
  }
});
