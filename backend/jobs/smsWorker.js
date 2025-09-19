const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const twilio = require("twilio");
const {
  Channel,
  ChannelMembership,
  ChannelMessage,
  User,
  SmsSetting,
} = require("../models/associations");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_FROM;
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

async function buildUnreadDigest(userId) {
  const settings = await SmsSetting.findOne({ where: { userId } });
  if (!settings || !settings.enabled || !settings.phone) return null;
  const userIdStr = String(userId);
  const memberships = await ChannelMembership.findAll({ where: { userId } });
  if (memberships.length === 0) return null;
  // For each membership, count unread messages since lastReadAt
  const lines = [];
  for (const ms of memberships) {
    const ch = await Channel.findByPk(ms.channelId);
    if (!ch) continue;
    const unread = await ChannelMessage.count({
      where: {
        channelId: ch.id,
        createdAt: {
          [require("sequelize").Op.gt]: ms.lastReadAt || new Date(0),
        },
      },
    });
    if (unread > 0) {
      const owner = await User.findByPk(ch.ownerId);
      lines.push(
        `${ch.title} (${owner ? owner.username : "owner"}) – ${unread} new`
      );
    }
  }
  if (lines.length === 0) return null;
  // SMS length constraints: keep concise
  const head = `Unread summary:`;
  const body = [head, ...lines].slice(0, 10).join("\n");
  return { to: settings.phone, body };
}

const worker = new Worker(
  "sms-push",
  async (job) => {
    if (!client) return;
    const { userId } = job.data || {};
    const payload = await buildUnreadDigest(userId);
    if (!payload) return;
    await client.messages.create({
      from: fromNumber,
      to: payload.to,
      body: payload.body,
    });
  },
  { connection }
);

worker.on("ready", () => console.log("[SMS] worker ready"));
worker.on("failed", (job, err) =>
  console.error("[SMS] job failed", job?.id, err)
);

module.exports = { worker };
