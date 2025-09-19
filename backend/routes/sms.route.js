const router = require("express").Router();
const auth = require("../middlewares/auth");
const {
  getSettings,
  updateSettings,
} = require("../controllers/sms.controller");

router.get("/settings", auth, getSettings);
router.put("/settings", auth, updateSettings);

module.exports = router;
