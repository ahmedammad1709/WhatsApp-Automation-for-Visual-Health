import OpenAI from "openai";
import "dotenv/config";
import pool from '../config/db.js';

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
   System Prompt Builder
========================= */

/**
 * Builds a comprehensive system prompt with current context (cities, events, time slots)
 */
async function buildSystemPrompt() {
  // Fetch available cities and events from database
  let citiesInfo = [];
  let eventsInfo = [];
  let timeSlotsInfo = [];
  
  try {
    const [cities] = await pool.query('SELECT id, name, state FROM cities ORDER BY name ASC');
    citiesInfo = cities.map(c => `${c.name}${c.state ? ` (${c.state})` : ''}`).join(', ');
    
    const [events] = await pool.query(`
      SELECT e.id, e.location, e.start_date, e.end_date, c.name AS city_name
      FROM events e
      JOIN cities c ON e.city_id = c.id
      ORDER BY e.start_date ASC
    `);
    
    eventsInfo = events.map(e => {
      const startDate = new Date(e.start_date).toLocaleDateString('pt-BR');
      const endDate = new Date(e.end_date).toLocaleDateString('pt-BR');
      return `- ${e.location} em ${e.city_name} (${startDate} a ${endDate})`;
    }).join('\n');

    // Fetch available time slots (next 20 available slots)
    const [slots] = await pool.query(`
      SELECT ts.slot_date, ts.slot_time, e.location, c.name AS city_name
      FROM time_slots ts
      JOIN events e ON ts.event_id = e.id
      JOIN cities c ON e.city_id = c.id
      WHERE ts.reserved_count < ts.max_per_slot
        AND ts.slot_date >= CURDATE()
      ORDER BY ts.slot_date ASC, ts.slot_time ASC
      LIMIT 20
    `);

    if (slots.length > 0) {
      const slotsByEvent = {};
      slots.forEach(slot => {
        const key = `${slot.location} - ${slot.city_name}`;
        if (!slotsByEvent[key]) {
          slotsByEvent[key] = [];
        }
        const dateStr = new Date(slot.slot_date).toLocaleDateString('pt-BR');
        const timeStr = slot.slot_time.substring(0, 5);
        slotsByEvent[key].push(`${dateStr} às ${timeStr}`);
      });

      timeSlotsInfo = Object.entries(slotsByEvent).map(([event, times]) => {
        return `  ${event}:\n    ${times.slice(0, 5).join(', ')}${times.length > 5 ? '...' : ''}`;
      }).join('\n');
    }
  } catch (error) {
    console.error('[ChatGPT] Error fetching context data:', error);
  }

  const systemPrompt = `Você é uma assistente inteligente, empática e profissional do "Instituto Luz no Caminho", uma clínica de saúde visual.

SUA PERSONALIDADE:
- Seja natural, calorosa e humana - nunca soe robótica ou repetitiva
- Comunique-se em português brasileiro de forma clara e amigável
- Seja educada, calma e tranquilizadora
- Mostre empatia quando o usuário expressar sintomas ou preocupações
- Adapte seu tom ao contexto da conversa

SEU OBJETIVO PRINCIPAL:
Ajudar o usuário a agendar uma consulta, mas de forma natural e conversacional. Você também pode:
- Responder perguntas aleatórias sobre a clínica
- Explicar serviços oferecidos
- Listar cidades ou eventos disponíveis
- Esclarecer dúvidas sobre saúde visual
- Responder com empatia a sintomas ou preocupações

INFORMAÇÕES NECESSÁRIAS (coletar naturalmente, em qualquer ordem):
Você precisa coletar gradualmente estas informações durante a conversa:
1. **full_name**: Nome completo do usuário
2. **reason_for_visit**: Motivo da consulta (sintomas ou serviço desejado)
3. **city**: Cidade onde o usuário deseja ser atendido
4. **neighborhood**: Bairro onde o usuário mora
5. **event**: Local/evento selecionado (se aplicável)
6. **date**: Data preferida para a consulta
7. **time_slot**: Horário preferido

REGRAS IMPORTANTES:
- Você decide o que perguntar a seguir - não siga uma ordem rígida
- Se o usuário fizer uma pergunta aleatória ou expressar emoções, responda adequadamente e depois retorne suavemente ao agendamento
- Se o usuário já forneceu uma informação anteriormente, lembre-se e não pergunte novamente
- Seja um guia, não um interrogador
- Se o usuário disser "start" ou quiser recomeçar, comece do zero

CIDADES DISPONÍVEIS:
${citiesInfo || 'Nenhuma cidade configurada no momento.'}

EVENTOS DISPONÍVEIS:
${eventsInfo || 'Nenhum evento agendado no momento.'}

HORÁRIOS DISPONÍVEIS (próximos):
${timeSlotsInfo || 'Nenhum horário disponível no momento.'}

NOTA: Quando o usuário mencionar uma data/horário, você pode sugerir horários disponíveis da lista acima. Se o usuário escolher um horário específico, use o formato exato (data: YYYY-MM-DD, horário: HH:MM).

QUANDO TODAS AS INFORMAÇÕES ESTIVEREM COMPLETAS:
Você só deve outputar o JSON quando:
1. Você coletou TODAS as 7 informações necessárias (nome, motivo, cidade, bairro, evento, data, horário)
2. O usuário confirmou explicitamente que quer agendar (ex: "sim", "confirmo", "quero agendar", "pode confirmar", etc.)

Quando essas condições forem atendidas:
1. Responda ao usuário com uma mensagem natural de confirmação em português (ex: "Perfeito! Vou confirmar seu agendamento...")
2. NO FINAL da sua resposta, após uma linha em branco, adicione um objeto JSON válido com os dados coletados

Formato do JSON final (OBRIGATÓRIO - todos os campos devem estar preenchidos):
{
  "full_name": "Nome Completo do Usuário",
  "reason_for_visit": "Motivo da consulta ou sintomas",
  "city": "Nome Exato da Cidade",
  "neighborhood": "Nome do Bairro",
  "event": "Local/Evento selecionado",
  "date": "YYYY-MM-DD",
  "time_slot": "HH:MM"
}

IMPORTANTE SOBRE O JSON:
- O JSON deve estar em uma linha separada, após sua resposta natural
- Use apenas quando tiver TODAS as 7 informações e o usuário confirmar
- A data deve estar no formato YYYY-MM-DD (ex: 2025-12-15)
- O horário deve estar no formato HH:MM (ex: 14:30)
- Use os nomes exatos de cidade e evento como aparecem nas listas acima
- NUNCA outpute JSON se faltar alguma informação ou se o usuário não confirmou`;

  return systemPrompt;
}

/* =========================
   Conversation Handler
========================= */

/**
 * Processes a user message with full conversation history
 * @param {string} userMessage - The current user message
 * @param {Array<{direction: 'in'|'out', message: string}>} conversationHistory - Full conversation history
 * @returns {Promise<{reply: string, bookingData: object|null}>}
 */
async function processConversation(userMessage, conversationHistory) {
  if (!client) {
    // Fallback response if OpenAI is not available
    return {
      reply: "Desculpe, estou temporariamente indisponível. Por favor, tente novamente mais tarde.",
      bookingData: null
    };
  }

  try {
    // Build system prompt with current context
    const systemPrompt = await buildSystemPrompt();

    // Convert conversation history to OpenAI message format
    const messages = [
      { role: "system", content: systemPrompt }
    ];

    // Add conversation history (last 30 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-30);
    for (const entry of recentHistory) {
      if (entry.direction === 'in') {
        messages.push({ role: "user", content: entry.message });
      } else if (entry.direction === 'out') {
        messages.push({ role: "assistant", content: entry.message });
      }
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

    console.log(`[ChatGPT] Processing conversation with ${messages.length} messages`);

    // Call OpenAI API
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7, // Higher temperature for more natural, varied responses
      messages: messages,
    });

    if (!completion?.choices?.length) {
      throw new Error("Invalid response structure from OpenAI API");
    }

    const content = completion.choices[0].message?.content;
    if (!content) {
      throw new Error("No content in OpenAI API response");
    }

    // Try to extract JSON from the response
    const bookingData = extractBookingData(content);
    
    // Remove JSON from the reply if present
    const reply = cleanReplyFromJson(content);

    return {
      reply: reply.trim(),
      bookingData: bookingData
    };

  } catch (error) {
    console.error("[ChatGPT] Conversation processing failed:", error);
    return {
      reply: "Desculpe, ocorreu um erro ao processar sua mensagem. Poderia repetir, por favor?",
      bookingData: null
    };
  }
}

/* =========================
   JSON Extraction Helper
========================= */

/**
 * Extracts booking JSON from ChatGPT response
 * @param {string} content - Full ChatGPT response
 * @returns {object|null} - Extracted booking data or null
 */
function extractBookingData(content) {
  try {
    // Try multiple patterns to find JSON
    // Pattern 1: JSON object with full_name
    let jsonMatch = content.match(/\{[\s\S]*?"full_name"[\s\S]*?\}/);
    
    // Pattern 2: JSON in code blocks
    if (!jsonMatch) {
      jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonMatch = [jsonMatch[1]];
      }
    }
    
    // Pattern 3: JSON at the end of the message
    if (!jsonMatch) {
      const lines = content.split('\n');
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].trim().startsWith('{')) {
          const potentialJson = lines.slice(i).join('\n').trim();
          if (potentialJson.includes('"full_name"')) {
            jsonMatch = [potentialJson];
            break;
          }
        }
      }
    }
    
    if (jsonMatch) {
      let jsonStr = jsonMatch[0]
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      // Remove any trailing text after closing brace
      const braceIndex = jsonStr.lastIndexOf('}');
      if (braceIndex > 0) {
        jsonStr = jsonStr.substring(0, braceIndex + 1);
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // Validate that it has all required fields and they're not empty
      const requiredFields = ['full_name', 'reason_for_visit', 'city', 'neighborhood', 'event', 'date', 'time_slot'];
      const hasAllFields = requiredFields.every(field => 
        parsed[field] && typeof parsed[field] === 'string' && parsed[field].trim().length > 0
      );
      
      if (hasAllFields) {
        // Clean and normalize the data
        const cleaned = {
          full_name: parsed.full_name.trim(),
          reason_for_visit: parsed.reason_for_visit.trim(),
          city: parsed.city.trim(),
          neighborhood: parsed.neighborhood.trim(),
          event: parsed.event.trim(),
          date: parsed.date.trim(),
          time_slot: parsed.time_slot.trim()
        };
        
        console.log('[ChatGPT] Extracted booking data:', cleaned);
        return cleaned;
      } else {
        console.log('[ChatGPT] JSON found but missing required fields:', Object.keys(parsed));
      }
    }
    
    return null;
  } catch (error) {
    console.error('[ChatGPT] Failed to extract booking data:', error);
    return null;
  }
}

/**
 * Removes JSON from reply text
 * @param {string} content - Full ChatGPT response
 * @returns {string} - Clean reply without JSON
 */
function cleanReplyFromJson(content) {
  // Remove JSON object if present
  return content.replace(/\{[\s\S]*"full_name"[\s\S]*\}/, '').trim();
}

/* =========================
   Legacy Functions (for backward compatibility)
========================= */

/**
 * @deprecated Use processConversation instead
 */
async function analyzeInput(text, step) {
  if (!client) {
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
        { role: "system", content: await buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
    });

    if (!completion?.choices?.length) {
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

/**
 * @deprecated Use processConversation instead
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
        { role: "system", content: await buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
    });

    if (!completion?.choices?.length) {
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

export { processConversation, analyzeInput, extractPatientData };
