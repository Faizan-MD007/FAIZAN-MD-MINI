const { cmd } = require('../arslan');

cmd({
  pattern: "unblock",
  alias: ["unb", "unblk", "unblok", "enable"],
  react: "🥰",
  category: "owner",
  desc: "Unblock user from WhatsApp and bot",
  filename: __filename
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
  try {
    if (!isOwner) return reply("*YEH COMMAND SIRF OWNER KE LIYE HAI 😎*");

    let jid;
    if (m.quoted) jid = m.quoted.sender;
    else if (m.mentionedJid && m.mentionedJid[0]) jid = m.mentionedJid[0];
    else if (args[0]) {
        let num = args[0].replace(/[^0-9]/g, '');
        if (num.length >= 10) jid = num + '@s.whatsapp.net';
    }
    else if (from.endsWith("@s.whatsapp.net")) jid = from;

    if (!jid) return reply("*UNBLOCK KARNE KE LIYE KISI MESSAGE PAR REPLY KARO, TAG KARO YA NUMBER LIKHO ☺️*");

    // Unblock on WhatsApp
    try { await conn.updateBlockStatus(jid, "unblock"); } catch (e) {}
    
    // Unblock from bot (main-ban.js logic)
    const { unbanUser } = require('./main-ban');
    unbanUser(jid);

    await conn.sendMessage(from, { react: { text: "🥰", key: mek.key } });
    reply(`*MENE APKO UNBLOCK KAR DIYA HAI ☺️*`, { mentions: [jid] });

  } catch (e) {
    console.log("UNBLOCK ERROR:", e);
    reply("*❌ UNBLOCK NAHI HO PAYA 😔*");
  }
});

cmd({
  pattern: "block",
  alias: ["blk", "blok", "disable"],
  react: "🚫",
  category: "owner",
  desc: "Block user from WhatsApp and bot",
  filename: __filename
}, async (conn, mek, m, { from, args, reply, isOwner }) => {
  try {
    if (!isOwner) return reply("*YEH COMMAND SIRF OWNER KE LIYE HAI 😎*");

    let jid;
    if (m.quoted) jid = m.quoted.sender;
    else if (m.mentionedJid && m.mentionedJid[0]) jid = m.mentionedJid[0];
    else if (args[0]) {
        let num = args[0].replace(/[^0-9]/g, '');
        if (num.length >= 10) jid = num + '@s.whatsapp.net';
    }
    else if (from.endsWith("@s.whatsapp.net")) jid = from;

    if (!jid) return reply("*BLOCK KARNE KE LIYE KISI MESSAGE PAR REPLY KARO, TAG KARO YA NUMBER LIKHO 🚫*");

    const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
    if (jid === botNumber) return reply("*Bot ko block nahi kar sakte!*");

    // Block on WhatsApp
    try { await conn.updateBlockStatus(jid, "block"); } catch (e) {}
    
    // Block from bot (main-ban.js logic)
    const { banUser } = require('./main-ban');
    banUser(jid);

    await conn.sendMessage(from, { react: { text: "🚫", key: mek.key } });
    reply(`*MENE APKO BLOCK KAR DIYA HAI 🚫*`, { mentions: [jid] });

  } catch (e) {
    console.log("BLOCK ERROR:", e);
    reply("*❌ BLOCK NAHI HO PAYA 😔*");
  }
});
