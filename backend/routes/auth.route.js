const express = require("express");
const router = express.Router();
const authCtrl = require("../controllers/auth.controller");
const auth = require("../middlewares/auth");

router.post("/signup", authCtrl.signup);
router.post("/login", authCtrl.login);
router.get("/me", auth, authCtrl.me);
router.put("/profile", auth, authCtrl.updateProfile);
router.put("/password", auth, authCtrl.changePassword);
// emoji
router.get("/emoji-catalog", auth, authCtrl.emojiCatalog);
router.get("/favorites", auth, authCtrl.getFavorites);
router.put("/favorites", auth, authCtrl.updateFavorites);

module.exports = router;
