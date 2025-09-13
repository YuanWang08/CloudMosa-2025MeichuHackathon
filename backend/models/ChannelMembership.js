const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const ChannelMembership = sequelize.define(
  "ChannelMembership",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    channelId: { type: DataTypes.UUID, allowNull: false },
    userId: { type: DataTypes.UUID, allowNull: false },
    lastReadAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "channel_memberships",
    indexes: [{ unique: true, fields: ["channelId", "userId"] }],
  }
);

module.exports = ChannelMembership;
