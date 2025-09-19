const User = require("./User");
const Channel = require("./Channel");
const ChannelMembership = require("./ChannelMembership");
const ChannelMessage = require("./ChannelMessage");
const ChannelQuickReply = require("./ChannelQuickReply");
const SmsSetting = require("./SmsSetting");

// Ownership
Channel.belongsTo(User, { as: "owner", foreignKey: "ownerId" });
User.hasMany(Channel, { as: "ownedChannels", foreignKey: "ownerId" });

// Memberships
ChannelMembership.belongsTo(User, { foreignKey: "userId" });
ChannelMembership.belongsTo(Channel, { foreignKey: "channelId" });
User.hasMany(ChannelMembership, { foreignKey: "userId" });
Channel.hasMany(ChannelMembership, { foreignKey: "channelId" });

// Messages
ChannelMessage.belongsTo(Channel, { foreignKey: "channelId" });
ChannelMessage.belongsTo(User, { as: "author", foreignKey: "authorId" });
Channel.hasMany(ChannelMessage, { foreignKey: "channelId" });
User.hasMany(ChannelMessage, {
  as: "authoredMessages",
  foreignKey: "authorId",
});

// Quick Replies
ChannelQuickReply.belongsTo(Channel, { foreignKey: "channelId" });
Channel.hasMany(ChannelQuickReply, { foreignKey: "channelId" });

module.exports = {
  User,
  Channel,
  ChannelMembership,
  ChannelMessage,
  ChannelQuickReply,
  SmsSetting,
};
