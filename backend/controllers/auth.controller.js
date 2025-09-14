const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const JWT_EXPIRES_IN = "7d";

function usernameValid(u) {
  return /^[A-Za-z0-9_]{6,16}$/.test(u);
}

exports.signup = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Missing fields" });
    if (!usernameValid(username) || !usernameValid(password)) {
      return res
        .status(400)
        .json({ message: "Invalid username or password format" });
    }

    const exists = await User.findOne({ where: { username } });
    if (exists)
      return res.status(409).json({ message: "Username already taken" });

    const passwordHash = await bcrypt.hash(password, 10);
    const avatarInitials = username.slice(0, 2).toUpperCase();
    const colors = [
      "#4f46e5",
      "#db2777",
      "#059669",
      "#b45309",
      "#7c3aed",
      "#0ea5e9",
    ];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const user = await User.create({
      username,
      passwordHash,
      avatarInitials,
      avatarColor,
    });
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatarInitials: user.avatarInitials,
        avatarColor: user.avatarColor,
        avatarImage: user.avatarImage,
        favoriteEmojis: user.favoriteEmojis,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Missing fields" });
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        avatarInitials: user.avatarInitials,
        avatarColor: user.avatarColor,
        avatarImage: user.avatarImage,
        favoriteEmojis: user.favoriteEmojis,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.me = async (req, res) => {
  try {
    const u = await User.findByPk(req.userId);
    if (!u) return res.status(404).json({ message: "Not found" });
    res.json({
      id: u.id,
      username: u.username,
      avatarInitials: u.avatarInitials,
      avatarColor: u.avatarColor,
      avatarImage: u.avatarImage,
      favoriteEmojis: u.favoriteEmojis,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Update profile (username)
exports.updateProfile = async (req, res) => {
  try {
    const { username, avatarImage } = req.body;
    if (!username || !usernameValid(username)) {
      return res.status(400).json({ message: "Invalid username format" });
    }
    // 確認使用者存在
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "Not found" });
    // 檢查使用者名稱是否被他人使用
    const exists = await User.findOne({ where: { username } });
    if (exists && String(exists.id) !== String(user.id)) {
      return res.status(409).json({ message: "Username already taken" });
    }
    user.username = username;
    user.avatarInitials = username.slice(0, 2).toUpperCase();
    if (avatarImage) user.avatarImage = avatarImage;
    await user.save();
    return res.json({
      id: user.id,
      username: user.username,
      avatarInitials: user.avatarInitials,
      avatarColor: user.avatarColor,
      avatarImage: user.avatarImage,
      favoriteEmojis: user.favoriteEmojis,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get emoji catalog (server side reference)
exports.emojiCatalog = async (_req, res) => {
  try {
    const file = path.resolve(__dirname, "../config/emoji.json");
    const json = fs.readFileSync(file, "utf-8");
    const data = JSON.parse(json);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Get/Update favorite emojis
exports.getFavorites = async (req, res) => {
  try {
    const u = await User.findByPk(req.userId);
    if (!u) return res.status(404).json({ message: "Not found" });
    res.json({ favoriteEmojis: u.favoriteEmojis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateFavorites = async (req, res) => {
  try {
    const { favoriteEmojis } = req.body;
    if (!Array.isArray(favoriteEmojis) || favoriteEmojis.length !== 6)
      return res.status(400).json({ message: "Invalid favorites" });
    const u = await User.findByPk(req.userId);
    if (!u) return res.status(404).json({ message: "Not found" });
    u.favoriteEmojis = favoriteEmojis.map((x) => String(x || "").slice(0, 4));
    await u.save();
    res.json({ favoriteEmojis: u.favoriteEmojis });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Missing fields" });
    }
    if (!usernameValid(newPassword)) {
      return res.status(400).json({ message: "Invalid password format" });
    }
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ message: "Not found" });
    const ok = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: "Password updated" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
