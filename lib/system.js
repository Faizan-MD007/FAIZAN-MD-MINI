'use strict';

/**
 * Compatibility hook retained for the connection-open lifecycle.
 *
 * The active message store and socket listeners are initialized in main.js,
 * so this helper intentionally performs no duplicate setup. Keeping the
 * async function preserves the existing `await arslanmd(conn)` call without
 * changing connection behavior.
 */
async function arslanmd(conn) {
    return conn;
}

module.exports = { arslanmd };
