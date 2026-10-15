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
      async deleteOlderThan() { return 0; },
    };
  }

  const poolOptions = {
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  };
  if (!connectionString.includes("sslmode=")) {
    poolOptions.ssl = process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false };
  }

  const pool = new Pool(poolOptions);

  pool.on("error", (err) => {
    console.error("Unexpected PG pool error:", err);
  });

  let initPromise;
  let isReady = false;

  async function queryWithRetry(sql, params) {
    try {
      return await pool.query(sql, params);
    } catch (err) {
      console.warn("DB query failed, retrying in 500ms:", err.message || err);
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        return await pool.query(sql, params);
      } catch (retryErr) {
        console.error("DB query retry failed, giving up:", retryErr);
        throw retryErr;
      }
    }
  }

  function init() {
    if (!initPromise) {
      initPromise = queryWithRetry(`
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
      const result = await queryWithRetry(
        "SELECT state FROM game_rooms WHERE room_code = $1",
        [roomCode],
      );
      return result.rows[0]?.state || null;
    },
    async has(roomCode) {
      try {
        await init();
        const result = await queryWithRetry(
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
        await queryWithRetry(
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
        await queryWithRetry("DELETE FROM game_rooms WHERE room_code = $1", [roomCode]);
      } catch (err) {
        console.error(`DB roomStore.delete error for ${roomCode}:`, err);
      }
    },
    async deleteOlderThan(hours) {
      try {
        await init();
        const result = await queryWithRetry(
          "DELETE FROM game_rooms WHERE updated_at < NOW() - make_interval(hours => $1)",
          [hours]
        );
        return result.rowCount;
      } catch (err) {
        console.error("DB roomStore.deleteOlderThan error:", err);
        return 0;
      }
    },
  };
}

module.exports = createRoomStore;
