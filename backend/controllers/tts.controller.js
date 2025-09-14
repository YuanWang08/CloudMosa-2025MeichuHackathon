const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const sdk = require("microsoft-cognitiveservices-speech-sdk");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

exports.synthesize = async (req, res) => {
  try {
    const { text, voice, messageId } = req.body || {};
    const content = (text || "").toString().trim();
    if (!content) return res.status(400).json({ error: "Text required" });

    const key = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    const defaultVoice = process.env.DEFAULT_VOICE || "en-US-JennyNeural";
    if (!key || !region)
      return res.status(500).json({ error: "Azure TTS not configured" });

    const outDir = path.join(__dirname, "..", "public", "tts");
    ensureDir(outDir);

    // Build a deterministic cache key based on content, voice and output format.
    const voiceName = voice || defaultVoice;
    const formatId = "16k-32kbit-mono-mp3"; // mirrors Audio16Khz32KBitRateMonoMp3
    const version = "v1"; // bump to invalidate cache strategy
    // Prefer messageId in hash (stable per message); fallback to content
    const base = messageId ? `mid:${messageId}` : `txt:${content}`;
    const keyStr = `${base}||${voiceName}||${formatId}||${version}`;
    const hash = crypto.createHash("sha1").update(keyStr).digest("hex");
    const fileName = `${hash}.mp3`;
    const filePath = path.join(outDir, fileName);

    // If file already exists, return immediately (cache hit)
    if (fs.existsSync(filePath)) {
      const url = `/tts/${fileName}`;
      return res.json({ url, file: fileName /*, cache: true*/ });
    }

    const speechConfig = sdk.SpeechConfig.fromSubscription(key, region);
    speechConfig.speechSynthesisOutputFormat =
      sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filePath);
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    if (voice || defaultVoice) {
      speechConfig.speechSynthesisVoiceName = voice || defaultVoice;
    }

    await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        content,
        (result) => {
          synthesizer.close();
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted)
            resolve(result);
          else reject(new Error("Synthesis failed"));
        },
        (err) => {
          synthesizer.close();
          reject(err);
        }
      );
    });

    const url = `/tts/${fileName}`;
    res.json({ url, file: fileName });
  } catch (e) {
    console.error("[TTS] synthesize error", e);
    res.status(500).json({ error: "TTS failed" });
  }
};
