const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING(32),
      unique: true,
      allowNull: false,
      validate: {
        is: /^[A-Za-z0-9_]{6,16}$/,
      },
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    avatarInitials: {
      type: DataTypes.STRING(2),
      allowNull: false,
      defaultValue: "U",
    },
    avatarColor: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: "#4f46e5",
    },
    avatarImage: {
      // 檔名（例如 "01.png"），前端使用 /avatars/{檔名} 取圖
      type: DataTypes.STRING(128),
      allowNull: true,
    },
    favoriteEmojis: {
      // 使用者自訂常用表情（長度 6）
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ["✅", "❌", "⏰", "📢", "👍", "😢"],
    },
  },
  {
    tableName: "users",
    indexes: [{ unique: true, fields: ["username"] }],
  }
);

module.exports = User;
