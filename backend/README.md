# WhatsApp AI Automation Backend

## Setup
- Copy `.env.example` to `.env` and fill variables: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`, `PORT`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_URL`.
- Create table `conversation_states` using `conversation_states.sql`.
- Install dependencies: `npm install`.
- Run: `npm run dev` or `npm start`.

## Webhook
- Verify endpoint: `GET /webhook/whatsapp` with query `hub.mode=subscribe`, `hub.verify_token`, `hub.challenge`.
- Meta configuration: set webhook URL to `https://your-domain/webhook/whatsapp` and use `WHATSAPP_VERIFY_TOKEN`.
- Incoming messages: `POST /webhook/whatsapp`.

## Testing with curl
- Verify: `curl "http://localhost:5000/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=123"`.
- Send a message payload:
```
curl -X POST http://localhost:5000/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "from": "5511999999999",
            "type": "text",
            "text": { "body": "oi" }
          }]
        }
      }]
    }]
  }'
```

## Chatbot Flow
- First prompt: "Qual é sua cidade?".
- City detection: fuzzy match against `cities`.
- Event lookup: `events` for city, checks capacity using `time_slots.reserved_count` and `events.max_capacity`.
- Collect: nome, bairro, motivo.
- Slots: lists available from `time_slots` respecting `max_per_slot`.
- Save: inserts into `patients` and `appointments`, increments `reserved_count`.
- Confirmation: sends final details.
- Logs: `conversation_logs` stores inbound and outbound messages; `conversation_states` persists progress and temp data.

## Manual Event Registration
- Create city: `POST /cities` with `{ name, state }`.
- Create event: `POST /events` with `{ city_id, location, start_date, end_date, max_capacity, notes }`.
- Create time slot: `POST /time-slots` with `{ event_id, slot_date, slot_time, max_per_slot }`.

## Verify Scheduling
- After selecting a slot via WhatsApp, check:
  - `patients` contains the user.
  - `appointments` has the reservation linked to `time_slots`.
  - `time_slots.reserved_count` incremented.

## Reminders
- Jobs run automatically when server starts.
- 24h reminder: sent ~24 hours before the slot.
- 3h reminder: sent ~3 hours before the slot.
- Post-event thanks: sent the morning after event end.

## WhatsApp API Notes
- Messages are sent to `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages` with Bearer `WHATSAPP_ACCESS_TOKEN`.
- Ensure `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` are valid; invalid IDs produce Graph API error code 100.