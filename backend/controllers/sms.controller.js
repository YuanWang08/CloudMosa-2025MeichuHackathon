const SmsSetting = require("../models/SmsSetting");
const { scheduleUserJobs } = require("../jobs/smsQueue");

exports.getSettings = async (req, res) => {
  try {
    const s = await SmsSetting.findOne({ where: { userId: req.userId } });
    if (!s)
      return res.json({
        enabled: false,
        phone: null,
        schedules: [],
        timezone: process.env.TZ || "Asia/Taipei",
      });
    // Reschedule jobs on update
    try {
      await scheduleUserJobs(
        req.userId,
        s.schedules || [],
        s.timezone || process.env.TZ || "Asia/Taipei"
      );
    } catch (e) {
      console.warn("[SMS] schedule error", e?.message || e);
    }
    res.json({
      enabled: !!s.enabled,
      phone: s.phone,
      schedules: s.schedules || [],
      timezone: s.timezone || process.env.TZ || "Asia/Taipei",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { enabled, phone, schedules, timezone } = req.body || {};
    if (enabled != null && typeof enabled !== "boolean")
      return res.status(400).json({ message: "Invalid enabled" });
    if (phone != null && typeof phone !== "string")
      return res.status(400).json({ message: "Invalid phone" });
    if (!Array.isArray(schedules) || schedules.length > 3)
      return res.status(400).json({ message: "Invalid schedules" });
    for (const sc of schedules) {
      if (!sc) return res.status(400).json({ message: "Invalid schedule" });
      if (typeof sc.hour !== "number" || sc.hour < 0 || sc.hour > 23)
        return res.status(400).json({ message: "Invalid schedule hour" });
      if (typeof sc.minute !== "number" || sc.minute < 0 || sc.minute > 59)
        return res.status(400).json({ message: "Invalid schedule minute" });
    }
    const [s, created] = await SmsSetting.findOrCreate({
      where: { userId: req.userId },
      defaults: {
        enabled: !!enabled,
        phone: phone || null,
        schedules: schedules || [],
        timezone: timezone || process.env.TZ || "Asia/Taipei",
      },
    });
    if (!created) {
      if (enabled != null) s.enabled = !!enabled;
      if (phone != null) s.phone = phone;
      if (schedules != null) s.schedules = schedules;
      if (timezone != null) s.timezone = timezone || null;
      await s.save();
    }
    try {
      await scheduleUserJobs(
        req.userId,
        s.schedules || [],
        s.timezone || process.env.TZ || "Asia/Taipei"
      );
    } catch (e) {
      console.warn("[SMS] schedule error", e?.message || e);
    }
    res.json({
      enabled: !!s.enabled,
      phone: s.phone,
      schedules: s.schedules || [],
      timezone: s.timezone || process.env.TZ || "Asia/Taipei",
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Server error" });
  }
};
