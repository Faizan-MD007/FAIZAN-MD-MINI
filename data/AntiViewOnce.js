const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

/**
 * Storage for the antiviewonce toggle.
 *
 * Mongo is the primary store (same as Antidelete), but the toggle must keep
 * working when Mongo is unreachable — otherwise `.antiviewonce on` reports
 * success and the setting is gone on the next message. So every write is
 * mirrored to a local JSON file, and reads fall back to it.
 */
const antiViewOnceSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    status: { type: Boolean, default: true }
});

const AntiViewOnce = mongoose.models.AntiViewOnce || mongoose.model('AntiViewOnce', antiViewOnceSchema);

const LOCAL_FILE = path.join(__dirname, 'antiviewonce.json');
const GLOBAL_KEY = 'global';

const readLocal = () => {
    try {
        if (!fs.existsSync(LOCAL_FILE)) return {};
        return JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8') || '{}');
    } catch (e) {
        console.error('[antiviewonce] local read failed:', e.message);
        return {};
    }
};

const writeLocal = (data) => {
    try {
        fs.writeFileSync(LOCAL_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (e) {
        console.error('[antiviewonce] local write failed:', e.message);
        return false;
    }
};

const mongoReady = () => mongoose.connection && mongoose.connection.readyState === 1;

const getAntiViewOnceStatus = async (chatId = GLOBAL_KEY) => {
    if (mongoReady()) {
        try {
            const data = await AntiViewOnce.findOne({ chatId });
            if (data) return !!data.status;
        } catch (e) {
            console.error('[antiviewonce] mongo read failed:', e.message);
        }
    }
    const local = readLocal();
    return !!local[chatId];
};

const setAntiViewOnceStatus = async (chatId = GLOBAL_KEY, status = false) => {
    const local = readLocal();
    local[chatId] = !!status;
    const localOk = writeLocal(local);

    let mongoOk = false;
    if (mongoReady()) {
        try {
            await AntiViewOnce.findOneAndUpdate({ chatId }, { status: !!status }, { upsert: true, new: true });
            mongoOk = true;
        } catch (e) {
            console.error('[antiviewonce] mongo write failed:', e.message);
        }
    }
    // Loud on total failure: the caller must not report success when nothing persisted.
    if (!localOk && !mongoOk) throw new Error('antiviewonce setting could not be saved (mongo + local both failed)');
    return true;
};

module.exports = { AntiViewOnce, getAntiViewOnceStatus, setAntiViewOnceStatus, GLOBAL_KEY };
