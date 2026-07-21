const { Pool } = require("pg");

function createRoomStore() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return {
      enabled: false,
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

  let initPromise;

  function init() {
    if (!initPromise) {
      initPromise = pool.query(`
        CREATE TABLE IF NOT EXISTS game_rooms (
          room_code TEXT PRIMARY KEY,
          state JSONB NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);
    }
    return initPromise;
  }

  return {
    enabled: true,
    async init() {
      await init();
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
      await init();
      const result = await pool.query(
        "SELECT 1 FROM game_rooms WHERE room_code = $1",
        [roomCode],
      );
      return result.rowCount > 0;
    },
    async set(roomCode, state) {
      await init();
      await pool.query(
        `INSERT INTO game_rooms (room_code, state, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (room_code)
         DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()`,
        [roomCode, JSON.stringify(state)],
      );
    },
    async delete(roomCode) {
      await init();
      await pool.query("DELETE FROM game_rooms WHERE room_code = $1", [roomCode]);
    },
  };
}

module.exports = createRoomStore;
