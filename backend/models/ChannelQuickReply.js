const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ChannelQuickReply = sequelize.define(
  "ChannelQuickReply",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: { type: DataTypes.UUID, allowNull: false },
    index: { type: DataTypes.INTEGER, allowNull: false }, // 7,8,9
    text: { type: DataTypes.STRING(140), allowNull: false },
  },
  {
    tableName: "channel_quick_replies",
    indexes: [{ unique: true, fields: ["channelId", "index"] }],
  }
);

module.exports = ChannelQuickReply;
