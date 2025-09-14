const express = require("express");
const router = express.Router();
const { synthesize } = require("../controllers/tts.controller");
const auth = require("../middlewares/auth");

// Protect TTS if needed; using verifyToken so only signed-in users can synthesize
router.post("/", auth, synthesize);

module.exports = router;
