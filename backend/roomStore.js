const { Pool } = require("pg");

function createRoomStore() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      enabled: false,
      ready: false,
      async init() {},
      async get() { return null; },
      async has() { return false; },
      async set() {},
      async delete() {},
    };
  }

  const pool = new Pool({
    connectionString,
    ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false },
  });

  pool.on("error", (err) => {
    console.error("Unexpected PG pool error:", err);
  });

  let initPromise;
  let isReady = false;

  function init() {
    if (!initPromise) {
      initPromise = pool.query(`
        CREATE TABLE IF NOT EXISTS game_rooms (
          room_code TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `).then((res) => {
        isReady = true;
        return res;
      }).catch((err) => {
        initPromise = null;
        isReady = false;
        throw err;
      });
    }
    return initPromise;
  }

  return {
    enabled: true,
    get ready() { return isReady; },
    async init() {
      try {
        await init();
      } catch (err) {
        console.error("DB roomStore.init error:", err);
      }
    },
    async get(roomCode) {
      await init();
      const result = await pool.query(
        "SELECT state FROM game_rooms WHERE room_code = $1",
        [roomCode],
      );
      return result.rows[0]?.state || null;
    },
    async has(roomCode) {
      try {
        await init();
        const result = await pool.query(
          "SELECT 1 FROM game_rooms WHERE room_code = $1",
          [roomCode],
        );
        return result.rowCount > 0;
      } catch (err) {
        console.error(`DB roomStore.has error for ${roomCode}:`, err);
        return false;
      }
    },
    async set(roomCode, state) {
      try {
        await init();
        await pool.query(
          `INSERT INTO game_rooms (room_code, state, updated_at)
           VALUES ($1, $2::jsonb, NOW())
           ON CONFLICT (room_code)
           DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
          [roomCode, JSON.stringify(state)],
        );
      } catch (err) {
        console.error(`DB roomStore.set error for ${roomCode}:`, err);
      }
    },
    async delete(roomCode) {
      try {
        await init();
        await pool.query("DELETE FROM game_rooms WHERE room_code = $1", [roomCode]);
      } catch (err) {
        console.error(`DB roomStore.delete error for ${roomCode}:`, err);
      }
    },
  };
}

module.exports = createRoomStore;
