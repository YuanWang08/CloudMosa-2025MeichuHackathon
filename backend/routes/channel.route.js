const express = require("express");
const router = express.Router();
const auth = require("../middlewares/auth");
const ctrl = require("../controllers/channel.controller");

router.use(auth);

router.post("/", ctrl.create); // 建立頻道
router.get("/mine", ctrl.mine); // 我建立的頻道
router.get("/joined", ctrl.joined); // 我加入的頻道
router.post("/join", ctrl.join); // 透過 code 加入
router.delete("/:id/leave", ctrl.leave); // 退出
router.get("/:id", ctrl.details); // 詳細
router.patch("/:id", ctrl.update); // 更新
router.delete("/:id", ctrl.remove); // 刪除
router.get("/:id/messages", ctrl.listMessages); // 列訊息
router.post("/:id/messages", ctrl.postMessage); // 發送
router.post("/:id/read", ctrl.markRead); // 標記已讀

module.exports = router;
