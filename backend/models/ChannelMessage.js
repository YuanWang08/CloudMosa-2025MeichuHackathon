const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ChannelMessage = sequelize.define(
  "ChannelMessage",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: { type: DataTypes.UUID, allowNull: false },
    authorId: { type: DataTypes.UUID, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
  },
  { tableName: "channel_messages" }
);

module.exports = ChannelMessage;
