const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

module.exports = async function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // 確認使用者是否仍存在於資料庫（避免 DB 重建後舊 token 繼續使用）
    const user = await User.findByPk(payload.sub);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    req.userId = String(user.id);
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
