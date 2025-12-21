const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

// Initialize OpenAI client with error handling
let openai = null;
let initializationError = null;

try {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[ChatGPT] WARNING: OPENAI_API_KEY is not set in environment variables. ChatGPT features will be disabled.');
    initializationError = new Error('OPENAI_API_KEY is not set');
  } else {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    openai = new OpenAIApi(configuration);
    
    // Verify initialization
    if (!openai || typeof openai.createChatCompletion !== 'function') {
      console.error('[ChatGPT] ERROR: OpenAI client failed to initialize properly');
      initializationError = new Error('OpenAI client initialization failed');
      openai = null;
    } else {
      console.log('[ChatGPT] OpenAI client initialized successfully');
    }
  }
} catch (error) {
  console.error('[ChatGPT] ERROR: Failed to initialize OpenAI client:', error.message);
  console.error('[ChatGPT] Stack trace:', error.stack);
  initializationError = error;
  openai = null;
}

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
    // Check if OpenAI is properly initialized
    if (initializationError || !openai) {
      console.warn('[ChatGPT] OpenAI not available, using fallback for input analysis');
      return { classification: "valid", cleaned_value: text, reply: null };
    }

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

    // Validate OpenAI client is available
    if (!openai || typeof openai.createChatCompletion !== 'function') {
      throw new Error('OpenAI client is not properly initialized');
    }

    const completion = await openai.createChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
    });

    // Validate response structure
    if (!completion || !completion.data || !completion.data.choices || !Array.isArray(completion.data.choices) || completion.data.choices.length === 0) {
      throw new Error('Invalid response structure from OpenAI API');
    }

    const content = completion.data.choices[0].message?.content;
    if (!content) {
      throw new Error('No content in OpenAI API response');
    }

    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanContent);

  } catch (error) {
    console.error("[ChatGPT] Analysis failed:", error);
    console.error("[ChatGPT] Error details:", {
      message: error.message,
      stack: error.stack,
      apiKeySet: !!process.env.OPENAI_API_KEY,
      apiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0
    });
    // Return fallback response - treat as valid input to continue flow
    return { classification: "valid", cleaned_value: text, reply: null };
  }
}

/**
 * Extracts structured patient data from conversation history.
 * @param {Array<{direction: 'in'|'out', message: string}>} history 
 * @returns {Promise<{full_name: string, preferred_name: string, neighborhood: string, reason_for_visit: string}>}
 */
async function extractPatientData(history) {
  try {
    // Check if OpenAI is properly initialized
    if (initializationError || !openai) {
      console.warn('[ChatGPT] OpenAI not available, using fallback for data extraction');
      return { full_name: null, preferred_name: null, neighborhood: null, reason_for_visit: null };
    }

    const conversationText = history.map(h => `${h.direction === "in" ? "User" : "Bot"}: ${h.message}`).join("\n");

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

    // Validate OpenAI client is available
    if (!openai || typeof openai.createChatCompletion !== 'function') {
      throw new Error('OpenAI client is not properly initialized');
    }

    const completion = await openai.createChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-3.5-turbo',
      temperature: 0.1,
    });

    // Validate response structure
    if (!completion || !completion.data || !completion.data.choices || !Array.isArray(completion.data.choices) || completion.data.choices.length === 0) {
      throw new Error('Invalid response structure from OpenAI API');
    }

    const content = completion.data.choices[0].message?.content;
    if (!content) {
      throw new Error('No content in OpenAI API response');
    }

    const cleanContent = content.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanContent);

  } catch (error) {
    console.error("[ChatGPT] Extraction failed:", error);
    console.error("[ChatGPT] Error details:", {
      message: error.message,
      stack: error.stack,
      apiKeySet: !!process.env.OPENAI_API_KEY
    });
    return { full_name: null, preferred_name: null, neighborhood: null, reason_for_visit: null };
  }
}

module.exports = { analyzeInput, extractPatientData };