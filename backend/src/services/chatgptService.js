const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a smart, empathetic, and professional assistant for "Instituto Luz no Caminho", a visual health clinic.
Your goal is to help users book appointments via WhatsApp.
You must be polite, concise, and helpful.
You act as a middleware to interpret user intent and clean data.
`;

/**
 * Analyzes user input based on the current step.
 * @param {string} text - User's raw input.
 * @param {string} step - Current flow step (ASK_NAME, ASK_CITY, ASK_NEIGHBORHOOD, ASK_REASON).
 * @returns {Promise<{classification: 'valid'|'restart'|'off_topic', cleaned_value: string|null, reply: string|null}>}
 */
async function analyzeInput(text, step) {
  try {
    const prompt = `
      Current Step: ${step}
      User Input: "${text}"

      Task:
      1. Classify the input:
         - 'valid': If the input provides the information requested by the step (even if mixed with other words).
         - 'restart': If the user wants to start over (e.g., "start", "restart", "cancel").
         - 'off_topic': If the user asks questions ("who are you?", "help") or says something unrelated ("bye", "idk").
      
      2. If 'valid':
         - Extract the CLEAN value requested by the step.
         - For ASK_NAME: Extract the full name properly capitalized (e.g. "my name is ammad" -> "Ammad").
         - For ASK_NEIGHBORHOOD: Extract the neighborhood name.
         - For ASK_REASON: Extract the core reason (e.g. "I need glasses" -> "Need glasses").
         - If the input is valid but ambiguous, do your best to extract the core info.
      
      3. If 'off_topic':
         - Generate a polite, short reply (max 1 sentence) answering their query or acknowledging their statement, and then gently nudging them back to the task.
      
      Output JSON ONLY:
      {
        "classification": "valid" | "restart" | "off_topic",
        "cleaned_value": "extracted string or null",
        "reply": "reply string if off_topic or null"
      }
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const result = JSON.parse(cleanContent);
    return result;

  } catch (error) {
    console.error('[ChatGPT] Analysis failed:', error);
    // Fallback: assume valid text if GPT fails, to avoid blocking flow
    return { classification: 'valid', cleaned_value: text, reply: null };
  }
}

/**
 * Extracts structured patient data from conversation history.
 * @param {Array<{direction: 'in'|'out', message: string}>} history 
 * @returns {Promise<{full_name: string, preferred_name: string, neighborhood: string, reason_for_visit: string}>}
 */
async function extractPatientData(history) {
  try {
    const conversationText = history.map(h => `${h.direction === 'in' ? 'User' : 'Bot'}: ${h.message}`).join('\n');
    
    const prompt = `
      Analyze the following WhatsApp conversation history for an appointment booking:
      
      ${conversationText}

      Task:
      Extract the following patient details into strict JSON:
      - full_name: The user's legal/full name.
      - preferred_name: If they explicitly asked to be called something else (otherwise null).
      - neighborhood: The neighborhood they live in.
      - reason_for_visit: The medical reason for the appointment.

      Rules:
      - Clean up the data (Capitalize names, remove filler words).
      - If a field is missing, use null.
      - Infer from context if needed (e.g., if they selected a city earlier, context might help, but focus on their text inputs).

      Output JSON ONLY.
    `;

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = completion.choices[0].message.content;
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanContent);

  } catch (error) {
    console.error('[ChatGPT] Extraction failed:', error);
    return { full_name: null, preferred_name: null, neighborhood: null, reason_for_visit: null };
  }
}

module.exports = { analyzeInput, extractPatientData };
