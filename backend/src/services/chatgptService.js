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
   State Extraction
========================= */

/**
 * Extracts current conversation state from history
 * @param {Array<{direction: 'in'|'out', message: string}>} conversationHistory - Full conversation history
 * @returns {Promise<object>} - Current state with collected fields
 */
async function extractConversationState(conversationHistory) {
  if (!client || conversationHistory.length === 0) {
    return {
      full_name: null,
      reason_for_visit: null,
      city: null,
      neighborhood: null,
      selected_event_or_clinic: null,
      preferred_date: null
    };
  }

  try {
    // Build conversation text
    const conversationText = conversationHistory
      .map((h) => `${h.direction === "in" ? "Usuário" : "Assistente"}: ${h.message}`)
      .join("\n");

    // Get available cities and events for context
    const [cities] = await pool.query('SELECT name FROM cities');
    const cityNames = cities.map(c => c.name).join(', ');
    
    const [events] = await pool.query(`
      SELECT e.location, c.name AS city_name
      FROM events e
      JOIN cities c ON e.city_id = c.id
    `);
    const eventNames = events.map(e => `${e.location} em ${e.city_name}`).join(', ');

    const prompt = `Analise esta conversa e extraia APENAS as informações que foram FORNECIDAS PELO USUÁRIO de forma clara e definitiva.

Conversa:
${conversationText}

Cidades disponíveis: ${cityNames}
Eventos disponíveis: ${eventNames}

Extraia APENAS informações que o usuário forneceu explicitamente. Se o usuário apenas perguntou algo ou a informação não está clara, retorne null para esse campo.

Retorne JSON APENAS com os campos que foram FORNECIDOS:
{
  "full_name": "nome completo se fornecido" | null,
  "reason_for_visit": "motivo se fornecido" | null,
  "city": "cidade se fornecida (use nome exato da lista)" | null,
  "neighborhood": "bairro se fornecido" | null,
  "selected_event_or_clinic": "evento/local se selecionado (use nome exato da lista)" | null,
  "preferred_date": "data se fornecida (formato YYYY-MM-DD)" | null
}

IMPORTANTE: Seja conservador. Só retorne um valor se tiver CERTEZA de que o usuário forneceu essa informação.`;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1, // Low temperature for consistent extraction
      messages: [
        { 
          role: "system", 
          content: "Você é um extrator preciso de informações. Retorne apenas JSON válido com os campos fornecidos." 
        },
        { role: "user", content: prompt },
      ],
    });

    if (!completion?.choices?.length) {
      throw new Error("Invalid response structure");
    }

    const content = completion.choices[0].message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim());
      
      // Validate and clean
      return {
        full_name: parsed.full_name && parsed.full_name.trim() ? parsed.full_name.trim() : null,
        reason_for_visit: parsed.reason_for_visit && parsed.reason_for_visit.trim() ? parsed.reason_for_visit.trim() : null,
        city: parsed.city && parsed.city.trim() ? parsed.city.trim() : null,
        neighborhood: parsed.neighborhood && parsed.neighborhood.trim() ? parsed.neighborhood.trim() : null,
        selected_event_or_clinic: parsed.selected_event_or_clinic && parsed.selected_event_or_clinic.trim() ? parsed.selected_event_or_clinic.trim() : null,
        preferred_date: parsed.preferred_date && parsed.preferred_date.trim() ? parsed.preferred_date.trim() : null
      };
    }

    return {
      full_name: null,
      reason_for_visit: null,
      city: null,
      neighborhood: null,
      selected_event_or_clinic: null,
      preferred_date: null
    };

  } catch (error) {
    console.error('[ChatGPT] State extraction failed:', error);
    return {
      full_name: null,
      reason_for_visit: null,
      city: null,
      neighborhood: null,
      selected_event_or_clinic: null,
      preferred_date: null
    };
  }
}

/**
 * Formats state summary for injection into prompt
 * @param {object} state - Current conversation state
 * @returns {string} - Formatted state summary
 */
function formatStateSummary(state) {
  const parts = [];
  
  if (state.full_name) parts.push(`Nome: ${state.full_name}`);
  if (state.reason_for_visit) parts.push(`Motivo: ${state.reason_for_visit}`);
  if (state.city) parts.push(`Cidade: ${state.city}`);
  if (state.neighborhood) parts.push(`Bairro: ${state.neighborhood}`);
  if (state.selected_event_or_clinic) parts.push(`Evento/Local: ${state.selected_event_or_clinic}`);
  if (state.preferred_date) parts.push(`Data preferida: ${state.preferred_date}`);

  if (parts.length === 0) {
    return "Nenhuma informação coletada ainda.";
  }

  return parts.join('\n');
}

/* =========================
   System Prompt Builder
========================= */

/**
 * Builds a comprehensive system prompt with current context (cities, events)
 * @param {string} stateSummary - Current conversation state summary
 */
async function buildSystemPrompt(stateSummary = '') {
  // Fetch available cities and events from database
  let citiesInfo = [];
  let eventsInfo = [];
  
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

INFORMAÇÕES NECESSÁRIAS (coletar gradualmente):
Você precisa coletar estas informações (sem horário):
1. **full_name**: Nome completo do usuário
2. **reason_for_visit**: Motivo da consulta (sintomas ou serviço desejado)
3. **city**: Cidade onde o usuário deseja ser atendido
4. **neighborhood**: Bairro onde o usuário mora
5. **selected_event_or_clinic**: Local/evento selecionado
6. **preferred_date**: Data preferida para a consulta (formato YYYY-MM-DD)

═══════════════════════════════════════════════════════════════
ESTADO ATUAL DA CONVERSA (INFORMAÇÕES JÁ COLETADAS):
═══════════════════════════════════════════════════════════════
${stateSummary}
═══════════════════════════════════════════════════════════════

⚠️ REGRAS CRÍTICAS - ANTI-LOOPING (OBRIGATÓRIO SEGUIR):

1. **NUNCA RE-PERGUNTE INFORMAÇÕES JÁ COLETADAS**
   - Se uma informação aparece no "ESTADO ATUAL DA CONVERSA" acima, ela está LOCKED
   - NUNCA pergunte novamente por essa informação
   - Use essa informação como verdade absoluta

2. **PROGRESSÃO APENAS PARA FRENTE**
   - Identifique quais campos estão faltando (comparando com o estado acima)
   - Pergunte APENAS pelo próximo campo que falta
   - Avance agressivamente em direção ao agendamento
   - Se nome, motivo e cidade estão completos → mostre os eventos e DATAS disponíveis IMEDIATAMENTE
   - Se evento está selecionado → peça diretamente para o usuário escolher uma DATA dentro do intervalo do evento

3. **TOLERÂNCIA A ERROS**
   - Se o usuário repetir informação → reconheça brevemente ("Perfeito, já tenho isso") e continue
   - Se o usuário disser "já te disse" → peça desculpas UMA VEZ e avance
   - Se o usuário fizer pergunta aleatória → responda brevemente e retorne ao próximo passo
   - Se o usuário expressar frustração → peça desculpas UMA VEZ e avance imediatamente

4. **SEM LOOPS DE ESCLARECIMENTO**
   - Não peça confirmação desnecessária
   - Não pergunte "você quis dizer X ou Y?" repetidamente
   - Se houver ambiguidade, escolha a interpretação mais provável e avance
   - Se o usuário corrigir, aceite a correção e continue

5. **FLUXO DE FINALIZAÇÃO**
   - Quando tiver: nome, motivo, cidade, bairro, evento → peça a DATA desejada dentro do intervalo do evento
   - Quando o usuário escolher uma DATA válida → confirme e outpute JSON IMEDIATAMENTE
   - Não peça confirmação extra se já tem todas as informações

EXEMPLO DE COMPORTAMENTO CORRETO:
- Estado mostra: Nome: João, Cidade: São Paulo
- Você NÃO pergunta nome ou cidade novamente
- Você identifica que falta: motivo, bairro, evento, data
- Você pergunta APENAS pelo motivo (ou bairro, se o motivo já foi mencionado)
- Você avança para o próximo passo SEMPRE

CIDADES DISPONÍVEIS:
${citiesInfo || 'Nenhuma cidade configurada no momento.'}

EVENTOS DISPONÍVEIS:
${eventsInfo || 'Nenhum evento agendado no momento.'}

QUANDO TODAS AS INFORMAÇÕES ESTIVEREM COMPLETAS:
Você só deve outputar o JSON quando:
1. Você coletou TODAS as informações necessárias (verifique o estado acima)
2. O usuário escolheu uma DATA válida dentro do intervalo do evento e confirmou o agendamento

Quando essas condições forem atendidas:
1. Responda ao usuário com uma mensagem natural de confirmação em português (ex: "Perfeito! Vou confirmar seu agendamento...")
2. NO FINAL da sua resposta, após uma linha em branco, adicione um objeto JSON válido com TODOS os dados coletados
3. Use os valores do "ESTADO ATUAL DA CONVERSA" acima como fonte de verdade para preencher o JSON

Formato do JSON final (OBRIGATÓRIO - todos os campos devem estar preenchidos):
{
  "full_name": "Nome Completo do Usuário",
  "reason_for_visit": "Motivo da consulta ou sintomas",
  "city": "Nome Exato da Cidade",
  "neighborhood": "Nome do Bairro",
  "event": "Local/Evento selecionado",
  "date": "YYYY-MM-DD"
}

IMPORTANTE SOBRE O JSON:
- O JSON deve estar em uma linha separada, após sua resposta natural
- Use apenas quando tiver TODAS as informações (verifique o "ESTADO ATUAL DA CONVERSA" acima)
- Use os valores do "ESTADO ATUAL DA CONVERSA" como fonte primária para preencher o JSON
- A data deve estar no formato YYYY-MM-DD (ex: 2025-12-15)
- Use os nomes exatos de cidade e evento como aparecem nas listas acima
- NUNCA outpute JSON se faltar alguma informação no estado acima ou se o usuário não confirmou
- Se o estado acima já tem todas as informações e o usuário escolheu uma data válida, outpute o JSON IMEDIATAMENTE`;

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
    // STEP 1: Extract current conversation state
    console.log('[ChatGPT] Extracting conversation state...');
    const currentState = await extractConversationState(conversationHistory);
    const stateSummary = formatStateSummary(currentState);
    console.log('[ChatGPT] Current state:', currentState);
    console.log('[ChatGPT] State summary:', stateSummary);

    // STEP 2: Build system prompt with state summary injected
    const systemPrompt = await buildSystemPrompt(stateSummary);

    // STEP 3: Convert conversation history to OpenAI message format
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

    // STEP 4: Call OpenAI API
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
    let bookingData = extractBookingData(content);
    
    // Merge with current state if booking data is incomplete
    if (bookingData) {
      // Fill in any missing fields from current state
      if (!bookingData.full_name && currentState.full_name) {
        bookingData.full_name = currentState.full_name;
      }
      if (!bookingData.reason_for_visit && currentState.reason_for_visit) {
        bookingData.reason_for_visit = currentState.reason_for_visit;
      }
      if (!bookingData.city && currentState.city) {
        bookingData.city = currentState.city;
      }
      if (!bookingData.neighborhood && currentState.neighborhood) {
        bookingData.neighborhood = currentState.neighborhood;
      }
      if (!bookingData.event && currentState.selected_event_or_clinic) {
        bookingData.event = currentState.selected_event_or_clinic;
      }
      if (!bookingData.date && currentState.preferred_date) {
        bookingData.date = currentState.preferred_date;
      }
    }
    
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
    // Try multiple patterns to find JSON (DATE-ONLY, NO TIME FIELD)
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
      const requiredFields = ['full_name', 'reason_for_visit', 'city', 'neighborhood', 'event', 'date'];
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
          date: parsed.date.trim()
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
