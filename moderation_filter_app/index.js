import cron from "node-cron";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

// ---------------- CONFIG ----------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const TABLE = process.env.TABLE_NAME;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent";

// Prevent overlapping cron runs
let isRunning = false;

// ---------------- GEMINI MODERATION ----------------
async function geminiModerate(messages) {
  const prompt = `
You are a strict chat moderation AI.

Rules:
- Hate speech
- Sexual content
- Harassment
- Threats
- Slurs
- Explicit profanity
- Attempts to bypass filters

Return ONLY valid JSON.
No explanations.

Format:
{
  "delete_ids": [id1, id2, ...]
}

Messages:
${JSON.stringify(messages)}
`;

  try {
    const res = await axios.post(
      `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
      },
      {
        headers: { "Content-Type": "application/json" },
      },
    );

    let text = res.data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    // Strip Markdown code fences if present
    const match = text.match(/\{[\s\S]*\}/);
    text = match ? match[0] : "{}";

    return JSON.parse(text);
  } catch (err) {
    console.error(
      "❌ Gemini API error:",
      err.response?.status || "",
      err.message,
    );
    return { delete_ids: [] };
  }
}

// ---------------- MODERATION JOB ----------------
async function moderateChats() {
  if (isRunning) return;
  isRunning = true;

  console.log(
    `\n🧠 Gemini moderation running at ${new Date().toISOString()}...`,
  );

  try {
    // Calculate 5 minutes ago for filtering
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from(TABLE)
      .select("id, message, created_at")
      .gt("created_at", fiveMinutesAgo)
      .limit(50);

    if (error) {
      console.error("❌ Fetch error:", error);
      return;
    }

    if (!data?.length) {
      console.log("✨ No messages to check");
      return;
    }

    console.log(`🔹 Fetched ${data.length} messages`);

    const aiResult = await geminiModerate(data);
    console.log("🤖 Gemini response:", aiResult);

    if (!aiResult.delete_ids?.length) {
      console.log("✨ No violations found");
      return;
    }

    console.log("🗑️ Deleting messages with IDs:", aiResult.delete_ids);

    const { data: deletedData, error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .select()
      .in("id", aiResult.delete_ids);

    if (deleteError) {
      console.error("❌ Delete failed:", deleteError);
    } else {
      const deletedCount = deletedData?.length ?? 0;
      console.log(`🔥 Deleted ${deletedCount} messages`);
    }
  } catch (err) {
    console.error("❌ Unexpected error in moderation job:", err);
  } finally {
    isRunning = false;
  }
}

// ---------------- START CRON ----------------
(async () => {
  // Run immediately on start
  await moderateChats();

  // Run every 5 minutes
  cron.schedule("*/5 * * * *", async () => {
    await moderateChats();
  });

  console.log("🚀 Gemini moderation cron started (every 5 minutes)");
})();