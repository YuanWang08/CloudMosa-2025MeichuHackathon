const { Op, fn, col, literal } = require("sequelize");
const { sequelize } = require("../config/database");
const {
  Channel,
  ChannelMembership,
  ChannelMessage,
  ChannelQuickReply,
  User,
} = require("../models/associations");

function genCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.create = async (req, res) => {
  try {
    const { title, allowJoin = true, quickReplies = [] } = req.body;
    if (!title) return res.status(400).json({ message: "Missing title" });
    let code = genCode();
    // 確保唯一
    for (let i = 0; i < 5; i++) {
      const exists = await Channel.findOne({ where: { code } });
      if (!exists) break;
      code = genCode();
    }
    const channel = await Channel.create({
      ownerId: req.userId,
      title,
      code,
      allowJoin,
    });
    await ChannelMembership.create({
      channelId: channel.id,
      userId: req.userId,
      lastReadAt: new Date(),
    });
    for (let i = 0; i < quickReplies.length; i++) {
      const idx = 7 + i;
      if (idx > 9) break;
      await ChannelQuickReply.create({
        channelId: channel.id,
        index: idx,
        text: quickReplies[i],
      });
    }
    res.status(201).json(channel);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.mine = async (req, res) => {
  try {
    const userId = req.userId;
    // 加上最後訊息時間與未讀數
    const rows = await Channel.findAll({
      where: { ownerId: userId },
      order: [
        [
          sequelize.literal(
            '(SELECT MAX("createdAt") FROM channel_messages m WHERE m."channelId" = "Channel"."id")'
          ),
          "DESC NULLS LAST",
        ],
      ],
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.joined = async (req, res) => {
  try {
    const userId = req.userId;
    const lastMsgTimeSql =
      '(SELECT MAX("createdAt") FROM channel_messages m WHERE m."channelId" = "Channel"."id")';
    const joinTimeSql = `(
      SELECT "createdAt" FROM channel_memberships ms
      WHERE ms."channelId" = "Channel"."id" AND ms."userId" = '${userId}'
      LIMIT 1
    )`;
    const unreadCountSql = `(
      SELECT COUNT(*) FROM channel_messages m
      WHERE m."channelId" = "Channel"."id"
        AND m."createdAt" > COALESCE((
          SELECT "lastReadAt" FROM channel_memberships cm
          WHERE cm."channelId" = "Channel"."id" AND cm."userId" = '${userId}'
          LIMIT 1
        ), '1970-01-01')
    )`;

    const rows = await Channel.findAll({
      attributes: {
        include: [[sequelize.literal(unreadCountSql), "unreadCount"]],
      },
      include: [
        { model: ChannelMembership, where: { userId }, required: true },
        {
          model: User,
          as: "owner",
          attributes: [
            "id",
            "username",
            "avatarImage",
            "avatarInitials",
            "avatarColor",
          ],
          required: false,
        },
      ],
      order: [
        [sequelize.literal(lastMsgTimeSql), "DESC NULLS LAST"],
        [sequelize.literal(joinTimeSql), "DESC NULLS LAST"],
      ],
    });
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.join = async (req, res) => {
  try {
    const { code } = req.body;
    const ch = await Channel.findOne({ where: { code } });
    if (!ch) return res.status(404).json({ message: "Channel not found" });
    if (!ch.allowJoin)
      return res.status(403).json({ message: "Join disabled" });
    await ChannelMembership.findOrCreate({
      where: { channelId: ch.id, userId: req.userId },
      defaults: { lastReadAt: new Date() },
    });
    res.json({ ok: true, channelId: ch.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.leave = async (req, res) => {
  try {
    const { id } = req.params;
    await ChannelMembership.destroy({
      where: { channelId: id, userId: req.userId },
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.details = async (req, res) => {
  try {
    const { id } = req.params;
    const ch = await Channel.findByPk(id, {
      include: [
        { model: ChannelQuickReply },
        {
          model: User,
          as: "owner",
          attributes: [
            "id",
            "username",
            "avatarImage",
            "avatarInitials",
            "avatarColor",
          ],
        },
      ],
    });
    if (!ch) return res.status(404).json({ message: "Not found" });
    res.json(ch);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, allowJoin, quickReplies } = req.body;
    const ch = await Channel.findByPk(id);
    if (!ch) return res.status(404).json({ message: "Not found" });
    if (ch.ownerId !== req.userId)
      return res.status(403).json({ message: "Forbidden" });
    if (title != null) ch.title = title;
    if (allowJoin != null) ch.allowJoin = !!allowJoin;
    await ch.save();
    if (Array.isArray(quickReplies)) {
      // 更新 7~9
      for (let i = 7; i <= 9; i++) {
        const text = quickReplies[i - 7];
        if (text == null) continue;
        await ChannelQuickReply.upsert({ channelId: ch.id, index: i, text });
      }
    }
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const ch = await Channel.findByPk(id);
    if (!ch) return res.status(404).json({ message: "Not found" });
    if (ch.ownerId !== req.userId)
      return res.status(403).json({ message: "Forbidden" });
    await sequelize.transaction(async (t) => {
      await ChannelQuickReply.destroy({
        where: { channelId: id },
        transaction: t,
      });
      await ChannelMessage.destroy({
        where: { channelId: id },
        transaction: t,
      });
      await ChannelMembership.destroy({
        where: { channelId: id },
        transaction: t,
      });
      await ch.destroy({ transaction: t });
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.listMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const msgs = await ChannelMessage.findAll({
      where: { channelId: id },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });
    res.json(msgs);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.postMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: "Missing content" });
    const msg = await ChannelMessage.create({
      channelId: id,
      authorId: req.userId,
      content,
    });
    res.status(201).json(msg);
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await ChannelMembership.update(
      { lastReadAt: new Date() },
      { where: { channelId: id, userId: req.userId } }
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};
