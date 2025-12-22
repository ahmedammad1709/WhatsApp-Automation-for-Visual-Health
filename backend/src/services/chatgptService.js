import OpenAI from "openai";
import "dotenv/config";

/* =========================
   OpenAI Client Init (v5)
========================= */

const apiKey = (process.env.OPENAI_API_KEY || "").trim();
let client = null;

if (!apiKey) {
  console.warn("[ChatGPT] WARNING: OPENAI_API_KEY is not set. Falling back.");
} else {
  try {
    client = new OpenAI({ apiKey });
    console.log("[ChatGPT] OpenAI client initialized");
    console.log("[ChatGPT] API Key prefix:", apiKey.substring(0, 7));
  } catch (err) {
    console.error("[ChatGPT] Failed to initialize OpenAI client:", err);
    client = null;
  }
}

/* =========================
   System Prompt
========================= */

const SYSTEM_PROMPT = `
You are a smart, empathetic, and professional assistant for "Instituto Luz no Caminho", a visual health clinic.
Your goal is to help users book appointments via WhatsApp.
You must be polite, concise, and helpful.
You act as a middleware to interpret user intent and clean data.
`;

/* =========================
   Analyze Input
========================= */
/**
 * @param {string} text
 * @param {string} step
 * @returns {Promise<{classification: 'valid'|'restart'|'off_topic', cleaned_value: string|null, reply: string|null}>}
 */
async function analyzeInput(text, step) {
  if (!client) {
    // Fallback: continue flow without AI
    return { classification: "valid", cleaned_value: text, reply: null };
  }

  const prompt = `
Current Step: ${step}
User Input: "${text}"

Task:
- Classify the input as "valid", "restart" or "off_topic".
- If "valid", extract the clean value requested by the step.
- If "off_topic", provide a short reply and keep the user in the same step.

Output JSON ONLY:
{
  "classification": "valid" | "restart" | "off_topic",
  "cleaned_value": "string or null",
  "reply": "string or null"
}
`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    if (!completion?.choices?.length) {
      console.error(
        "[ChatGPT] Invalid response structure:",
        JSON.stringify(completion, null, 2)
      );
      throw new Error("Invalid response structure from OpenAI API");
    }

    const content = completion.choices[0].message?.content;
    if (!content) {
      throw new Error("No content in OpenAI API response");
    }

    const clean = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (error) {
    console.error("[ChatGPT] Analysis failed:", error);
    return { classification: "valid", cleaned_value: text, reply: null };
  }
}

/* =========================
   Extract Patient Data
========================= */
/**
 * @param {Array<{direction: 'in'|'out', message: string}>} history
 * @returns {Promise<{full_name: string|null, preferred_name: string|null, neighborhood: string|null, reason_for_visit: string|null}>}
 */
async function extractPatientData(history) {
  if (!client) {
    return {
      full_name: null,
      preferred_name: null,
      neighborhood: null,
      reason_for_visit: null,
    };
  }

  const conversationText = history
    .map((h) => `${h.direction === "in" ? "User" : "Bot"}: ${h.message}`)
    .join("\n");

  const prompt = `
Conversation:
${conversationText}

Extract patient info as JSON ONLY:
{
  "full_name": string | null,
  "preferred_name": string | null,
  "neighborhood": string | null,
  "reason_for_visit": string | null
}
`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    });

    if (!completion?.choices?.length) {
      console.error(
        "[ChatGPT] Invalid response structure:",
        JSON.stringify(completion, null, 2)
      );
      throw new Error("Invalid response structure from OpenAI API");
    }

    const content = completion.choices[0].message?.content;
    if (!content) {
      throw new Error("No content in OpenAI API response");
    }

    const clean = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch (error) {
    console.error("[ChatGPT] Extraction failed:", error);
    return {
      full_name: null,
      preferred_name: null,
      neighborhood: null,
      reason_for_visit: null,
    };
  }
}

export { analyzeInput, extractPatientData };


