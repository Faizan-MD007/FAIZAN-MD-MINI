const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * Storage for the antilink toggle + warning counts, per group.
 *
 * Previously this lived only in an in-memory Map inside anti-link.js: every
 * restart silently reset every group back to OFF and dropped all warning
 * counts, with no error and no way to tell it had happened. Mirrors the
 * AntiViewOnce store: Mongo primary, local JSON fallback so a Mongo outage
 * doesn't make `.antilink on` report success while saving nothing.
 */
const antiLinkSchema = new mongoose.Schema({
    groupId: { type: String, required: true, unique: true },
    enabled: { type: Boolean, default: true }
});
const AntiLink = mongoose.models.AntiLink || mongoose.model('AntiLink', antiLinkSchema);

const LOCAL_FILE = path.join(__dirname, 'antilink.json');
const WARN_FILE = path.join(__dirname, 'antilink-warnings.json');

const readJson = (file) => {
    try {
        if (!fs.existsSync(file)) return {};
        return JSON.parse(fs.readFileSync(file, 'utf8') || '{}');
    } catch (e) {
        console.error(`[antilink] local read failed (${file}):`, e.message);
        return {};
    }
};

const writeJson = (file, data) => {
    try {
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error(`[antilink] local write failed (${file}):`, e.message);
        return false;
    }
};

const mongoReady = () => mongoose.connection && mongoose.connection.readyState === 1;

const getAntiLinkStatus = async (groupId) => {
    if (mongoReady()) {
        try {
            const doc = await AntiLink.findOne({ groupId });
            if (doc) return !!doc.enabled;
        } catch (e) {
            console.error('[antilink] mongo read failed:', e.message);
        }
    }
    return !!readJson(LOCAL_FILE)[groupId];
};

const setAntiLinkStatus = async (groupId, enabled) => {
    const local = readJson(LOCAL_FILE);
    local[groupId] = !!enabled;
    const localOk = writeJson(LOCAL_FILE, local);

    let mongoOk = false;
    if (mongoReady()) {
        try {
            await AntiLink.findOneAndUpdate({ groupId }, { enabled: !!enabled }, { upsert: true, new: true });
            mongoOk = true;
        } catch (e) {
            console.error('[antilink] mongo write failed:', e.message);
        }
    }
    if (!localOk && !mongoOk) throw new Error('antilink setting could not be saved (mongo + local both failed)');
    return true;
};

// Warning counts stay local-JSON only (cheap, resets are harmless) so a Mongo
// blip never blocks the on/off toggle above, which is the part that matters.
const getWarnings = (key) => readJson(WARN_FILE)[key] || 0;
const setWarnings = (key, count) => {
    const data = readJson(WARN_FILE);
    if (count > 0) data[key] = count; else delete data[key];
    writeJson(WARN_FILE, data);
};
const clearWarningsForGroup = (groupId) => {
    const data = readJson(WARN_FILE);
    let changed = false;
    for (const key of Object.keys(data)) {
        if (key.startsWith(groupId + ':')) { delete data[key]; changed = true; }
    }
    if (changed) writeJson(WARN_FILE, data);
};

module.exports = { getAntiLinkStatus, setAntiLinkStatus, getWarnings, setWarnings, clearWarningsForGroup };
