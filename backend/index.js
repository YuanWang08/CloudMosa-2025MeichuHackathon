const express = require("express");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
require("dotenv").config();
const cors = require("cors");
const indexRouter = require("./routes/index.route");
const authRouter = require("./routes/auth.route");
const channelRouter = require("./routes/channel.route");
const { initDb, sequelize } = require("./config/database");
const ttsRouter = require("./routes/tts.route");
const smsRouter = require("./routes/sms.route");
require("./models/associations");
require("./jobs/smsWorker");

const port = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(logger("dev"));
app.use(express.json());

app.use("/api", indexRouter);
app.use("/api/auth", authRouter);
app.use("/api/channels", channelRouter);
app.use("/api/tts", ttsRouter);
app.use("/api/sms", smsRouter);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "x-access-token, Origin, Content-Type, Authorization"
  );
  next();
});

async function start() {
  await initDb();
  const force = process.env.DB_SYNC_FORCE === "1";
  const alter = process.env.DB_SYNC_ALTER !== "0"; // default to alter unless explicitly disabled
  if (force) {
    console.warn(
      "[DB] sequelize.sync({ force: true }) – dropping and recreating tables"
    );
    await sequelize.sync({ force: true });
  } else if (alter) {
    console.warn(
      "[DB] sequelize.sync({ alter: true }) – attempting to alter tables"
    );
    await sequelize.sync({ alter: true });
  } else {
    await sequelize.sync({ alter: true });
  }
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });
}

start();
