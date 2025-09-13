const { Sequelize } = require("sequelize");
const dotenv = require("dotenv");
const path = require("path");

// 先讀取 backend/.env（若存在）
dotenv.config();
// 再嘗試讀取根目錄 .env（docker-compose 使用的環境變數在這）
dotenv.config({ path: path.resolve(__dirname, "../../.env"), override: true });

const DB_NAME = process.env.POSTGRES_DB || "myapp_db";
const DB_USER = process.env.POSTGRES_USER || "root";
const DB_PASS = process.env.POSTGRES_PASSWORD || "root1234";
const DB_HOST = process.env.POSTGRES_HOST || "127.0.0.1";
const DB_PORT = process.env.POSTGRES_PORT || "1234";

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "postgres",
  logging: false,
});

async function initDb(retries = 8, delayMs = 1500) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log("DB connected");
      return;
    } catch (err) {
      lastErr = err;
      console.warn(
        `DB connect failed (attempt ${i + 1}/${retries}): ${
          err?.code || err?.message
        }`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  console.error("Unable to connect to DB after retries:", lastErr);
  throw lastErr;
}

module.exports = {
  sequelize,
  initDb,
};
