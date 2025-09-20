const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const SmsSetting = sequelize.define(
  "SmsSetting",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: { type: DataTypes.UUID, allowNull: false, unique: true },
    enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    phone: { type: DataTypes.STRING(32), allowNull: true },
    // schedules: daily times only: [{ hour: 0-23, minute: 0-59 }]
    schedules: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    timezone: { type: DataTypes.STRING(64), allowNull: true },
  },
  { tableName: "sms_settings" }
);

module.exports = SmsSetting;
