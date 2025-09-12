const express = require("express");
const createError = require("http-errors");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const path = require("path");
require("dotenv").config();
const cors = require("cors");
const indexRouter = require("./routes/index.route");

const port = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookieParser());
app.use(logger("dev"));
app.use(express.json());

app.use("/api", indexRouter);

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

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
