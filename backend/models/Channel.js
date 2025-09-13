const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const Channel = sequelize.define(
  "Channel",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    ownerId: { type: DataTypes.UUID, allowNull: false },
    title: { type: DataTypes.STRING(80), allowNull: false },
    code: { type: DataTypes.STRING(6), allowNull: false, unique: true }, // 6-digit code
    allowJoin: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  { tableName: "channels" }
);

module.exports = Channel;
