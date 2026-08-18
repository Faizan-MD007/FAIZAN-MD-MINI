const { cmd } = require("../arslan")
const axios = require("axios")
const crypto = require("crypto")
const Buffer = require("buffer").Buffer
const { sendBtns } = require('../lib/buttons')

// ===== Encryption Keys =====
const KEY_MAP = {
  enc: "GJvE5RZIxrl9SuNrAtgsvCfWha3M7NGC",
  dec: "H3quWdWoHLX5bZSlyCYAnvDFara25FIu",
}

// ===== Crypto Processor =====
const cryptoProc = (type, data) => {
  const key = Buffer.from(KEY_MAP[type], "utf8")
  const iv = Buffer.from(KEY_MAP[type].slice(0, 16), "utf8")

  const cipher =
    type === "enc"
      ? crypto.createCipheriv("aes-256-cbc", key, iv)
      : crypto.createDecipheriv("aes-256-cbc", key, iv)

  let output =
    type === "enc"
      ? cipher.update(data, "utf8", "base64")
      : cipher.update(data, "base64", "utf8")

  output += cipher.final(type === "enc" ? "base64" : "utf8")
  return output
}

// ===== Savetik API =====
async function tiktokCrypto(url) {

  if (!/tiktok\.com/.test(url))
    throw new Error("Invalid TikTok URL")

  const encrypted = cryptoProc("enc", url)

  const { data } = await axios.post(
    "https://savetik.app/requests",
    { bdata: encrypted },
    {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
      },
      timeout: 25000,
    }
  )

  if (!data || data.status !== "success")
    throw new Error(data.message || "API Error")

  // `data.data` is savetik's primary (no-watermark) video field. A separate
  // watermarked variant isn't guaranteed by this API -- check the field names
  // it uses when present, otherwise the "MARK" button falls back to the same
  // no-watermark source (flagged in its caption rather than pretending).
  const decryptedVideo = cryptoProc("dec", data.data)
  const wmField = data.data_wm || data.wmplay || data.videoWm || data.play_wm
  const decryptedWmVideo = wmField ? cryptoProc("dec", wmField) : null

  return {
    title: data.title || "Unknown",
    author: data.username || "Unknown",
    thumbnail: data.thumbnailUrl || "",
    video: decryptedVideo,
    videoWm: decryptedWmVideo,
    audio: data.mp3 || null,
  }
}

// ===== Download Video Buffer =====
async function fetchPlayableVideo(url) {
  const res = await axios.get(url, {
    responseType: "arraybuffer",
    headers: { "User-Agent": "Mozilla/5.0" }
  })
  return Buffer.from(res.data)
}

// ===== MAIN COMMAND =====

cmd({
  pattern: "tiktok2",
  alias: ["tt2", "ttdl3"],
  desc: "Download TikTok Video (Encrypted)",
  category: "download",
  react: "🎬",
  filename: __filename
},
async (conn, mek, m, { from, reply, args, prefix }) => {

  try {

    if (!args[0] || !/tiktok\.com/.test(args[0])) {
      return reply(`
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_ ⊱┈─̇─̣╌*
*│❀ 🎬 𝐔𝐬𝐚𝐠𝐞:* .tiktok2 <url>
*│❀ 📌 𝐄𝐱𝐚𝐦𝐩𝐥𝐞:* .tt2 https://vt.tiktok.com/xxxx
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍
`)
    }

    const url = args[0]

    await reply("⏳ 𝐃𝐞𝐜𝐫𝐲𝐩𝐭𝐢𝐧𝐠 & 𝐏𝐫𝐞𝐩𝐚𝐫𝐢𝐧𝐠...")

    const result = await tiktokCrypto(url)

    const infoText = `
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_ ⊱┈─̇─̣╌*
*│❀ 🎬 𝐓𝐢𝐭𝐥𝐞:* ${result.title}
*│❀ 👤 𝐀𝐮𝐭𝐡𝐨𝐫:* @${result.author}
*│❀ 🔐 𝐌𝐨𝐝𝐞:* Encrypted API
*│❀ ⚙️ 𝐒𝐭𝐚𝐭𝐮𝐬:* Ready — pick an option below
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*

> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍
`

    // 3 buttons as requested: WITHOUT MARK / MARK / AUDIO, each routed to the
    // hidden tt2grab handler which re-runs the decrypt (button taps carry the
    // original URL, not the raw decrypted media link).
    try {
      await sendBtns(conn, from, {
        title: '🎬 TIKTOK',
        text: infoText,
        ...(result.thumbnail ? { image: { url: result.thumbnail } } : {}),
        buttons: [
          { display_text: '🚫 𝐖ιтнσυт 𝐌αяк', id: `${prefix}tt2grab ${url} nomark` },
          { display_text: '💧 𝐌αяк', id: `${prefix}tt2grab ${url} mark` },
          { display_text: '🎵 𝐀υ∂ιο', id: `${prefix}tt2grab ${url} audio` }
        ]
      }, mek)
    } catch (e) {
      // Fallback: no buttons available -> send video (+ audio if present), as before.
      const videoBuffer = await fetchPlayableVideo(result.video)
      await conn.sendMessage(from, { video: videoBuffer, mimetype: "video/mp4", caption: infoText }, { quoted: mek })
      if (result.audio) {
        await conn.sendMessage(from, { audio: { url: result.audio }, mimetype: "audio/mpeg", fileName: "tiktok_audio.mp3" }, { quoted: mek })
      }
    }

  } catch (err) {

    console.error("TT2 ERROR:", err.message)

    reply(`
*╭ׂ┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
*│ ╌─̇─̣⊰ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 _⁸⁷³_ ⊱┈─̇─̣╌*
*│❌ 𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝 𝐅𝐚𝐢𝐥𝐞𝐝*
*│❀ 𝐄𝐫𝐫𝐨𝐫:* ${err.message}
*╰┄─̣┄─̇─̣┄─̇─̣┄─̇─̣┄─̇─̣─̇─̣─᛭*
> ᴘᴏᴡᴇʀᴇᴅ ʙʏ 𝐅𝐀𝐈𝐙𝐀𝐍-𝐌𝐃 🤍
`)
  }

})

// ============ HIDDEN: ACTUAL DOWNLOAD, TRIGGERED BY BUTTON TAP ============
cmd({
  pattern: "tt2grab",
  dontAddCommandList: true,
  filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
  if (args.length < 2) return
  const mode = args[args.length - 1].toLowerCase()
  const url = args.slice(0, -1).join(' ')
  try {
    const result = await tiktokCrypto(url)

    if (mode === 'audio') {
      if (!result.audio) throw new Error('No audio track found for this video')
      await conn.sendMessage(from, {
        audio: { url: result.audio },
        mimetype: "audio/mpeg",
        fileName: "tiktok_audio.mp3"
      }, { quoted: mek })
      return
    }

    const wantMark = mode === 'mark'
    const sourceUrl = wantMark && result.videoWm ? result.videoWm : result.video
    const videoBuffer = await fetchPlayableVideo(sourceUrl)
    const note = (wantMark && !result.videoWm)
      ? '\n*│❀ ⚠️ 𝐍𝐨𝐭𝐞:* No separate watermarked source from this API — sent without mark.'
      : ''

    await conn.sendMessage(from, {
      video: videoBuffer,
      mimetype: "video/mp4",
      caption: `*🎬 ${result.title}*\n*👤 @${result.author}*${note}`
    }, { quoted: mek })

  } catch (err) {
    reply(`❌ Download Failed: ${err.message}`)
  }
})
