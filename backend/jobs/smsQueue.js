const { Queue, Worker } = require("bullmq");
const IORedis = require("ioredis");
const path = require("path");

const connection = new IORedis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

const queueName = "sms-push";
const smsQueue = new Queue(queueName, { connection });

async function scheduleUserJobs(userId, schedules, tz) {
  // Remove previous jobs for this user (simplify)
  const jobs = await smsQueue.getRepeatableJobs();
  await Promise.all(
    jobs
      .filter((j) => j.id && j.id.startsWith(`u:${userId}:`))
      .map((j) => smsQueue.removeRepeatableByKey(j.key))
  );
  // Add new repeatable jobs
  const timezone = tz || process.env.TZ || "Asia/Taipei";
  for (let i = 0; i < schedules.length; i++) {
    const sc = schedules[i];
    // Daily cron: m h * * *
    const cron = `${sc.minute} ${sc.hour} * * *`;
    await smsQueue.add(
      "digest",
      { userId },
      { repeat: { cron, tz: timezone }, jobId: `u:${userId}:s${i}` }
    );
  }
}

module.exports = { smsQueue, scheduleUserJobs, connection };
