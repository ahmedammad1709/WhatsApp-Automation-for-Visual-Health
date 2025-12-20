const { ok, error } = require('../utils/response');
const ConversationLogService = require('../services/conversationLogService');

async function getAll(req, res) {
  try {
    const data = await ConversationLogService.getAllConversationLogs();
    res.json(ok(data, 'Conversation logs fetched'));
  } catch (e) {
    console.error('Error fetching conversation logs:', e);
    res.status(500).json(error('Failed to fetch conversation logs'));
  }
}

async function getByPhone(req, res) {
  const phone = req.params.phone;
  if (!phone) return res.status(400).json(error('Valid phone is required'));
  try {
    const data = await ConversationLogService.getConversationLogsByPhone(phone);
    res.json(ok(data, 'Conversation logs fetched'));
  } catch (e) {
    res.status(500).json(error('Failed to fetch conversation logs'));
  }
}

module.exports = { getAll, getByPhone };

