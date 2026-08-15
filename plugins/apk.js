const { cmd } = require('../arslan');
const axios = require('axios');
const { sendBtns } = require('../lib/buttons');

cmd({
  pattern: "apk",
  alias: ["app", "playstore", "application"],
  react: "☺️",
  desc: "Download APK via Aptoide",
  category: "download",
  use: ".apk <name>",
  filename: __filename
}, async (conn, mek, m, { from, reply, q, prefix }) => {
  try {
    if (!q) return reply("*AP NE KOI APK DOWNLOAD KARNI HAI 🤔*\n*TO AP ESE LIKHO ☺️*\n\n*APK ❮APK NAME❯*\n\n*JAB AP ESE LIKHO GE 🤗 TO APKI APK DOWNLOAD KAR KE 😃 YAHA PER BHEJNDE JAYE GE 😍🌹*");

    const apiUrl = `http://ws75.aptoide.com/api/7/apps/search/query=${encodeURIComponent(q)}/limit=1`;
    const { data } = await axios.get(apiUrl);

    if (!data || !data.datalist || !data.datalist.list.length) {
      return reply("*APK NAHI MIL RAHI 😔*");
    }

    const app = data.datalist.list[0];
    const appSize = (app.size / 1048576).toFixed(2);

    let caption = `*╭━━━〔 👑 APK INFO 👑 〕━━━┈⊷*
*┃ 👑 NAME: ${app.name.toUpperCase()}*
*┃ 👑 SIZE :❯ ${appSize} MB*
*┃ 👑 PACK :❯ ${app.package.toUpperCase()}*
*┃ 👑 VER :❯ ${app.file.vername}*
*╰━━━━━━━━━━━━━━━┈⊷*

*👑 BY :❯ FAIZAN-MD 👑*`;

    // Single "DOWNLOADING" button as requested — the actual .apk file only
    // sends after the tap, via the hidden apkgrab handler.
    const downloadUrl = app.file.path || app.file.path_alt;
    try {
      await sendBtns(conn, from, {
        title: '☺️ APK',
        text: caption,
        image: { url: app.icon },
        buttons: [
          { display_text: '📥 DOWNLOADING', id: `${prefix}apkgrab ${downloadUrl}|${app.name.toUpperCase()}` }
        ]
      }, mek);
    } catch (e) {
      // Fallback: no buttons available -> send icon + apk file directly, as before.
      await conn.sendMessage(from, { image: { url: app.icon }, caption }, { quoted: mek });
      await conn.sendMessage(from, {
        document: { url: downloadUrl },
        mimetype: "application/vnd.android.package-archive",
        fileName: `${app.name.toUpperCase()}.apk`
      }, { quoted: mek });
    }

    await m.react("😍");
  } catch (err) {
    reply("*👑 ERROR :❯* TRY AGAIN!");
  }
});

// ============ HIDDEN: ACTUAL APK FILE SEND, TRIGGERED BY THE DOWNLOADING BUTTON ============
cmd({
  pattern: "apkgrab",
  dontAddCommandList: true,
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  if (!args.length) return;
  // args[0] is "downloadUrl|APP NAME" — '|' is safe as a separator since
  // neither a URL nor an app name legitimately contains it.
  const raw = args.join(' ');
  const sepIndex = raw.lastIndexOf('|');
  const downloadUrl = sepIndex === -1 ? raw : raw.slice(0, sepIndex);
  const appName = sepIndex === -1 ? 'APP' : raw.slice(sepIndex + 1);
  try {
    await conn.sendMessage(from, { react: { text: '📥', key: mek.key } });
    await conn.sendMessage(from, {
      document: { url: downloadUrl },
      mimetype: "application/vnd.android.package-archive",
      fileName: `${appName}.apk`
    }, { quoted: mek });
    await conn.sendMessage(from, { react: { text: '✅', key: mek.key } });
  } catch (err) {
    reply("*👑 ERROR :❯* TRY AGAIN!");
  }
});
