import pool from '../config/db.js';

// Get the active chatbot prompt
export const getChatbotSettings = async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT conversation_prompt FROM chatbot_settings WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1'
    );

    if (rows.length === 0) {
      // Return default empty or null if no setting found
      return res.json({ conversation_prompt: null });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching chatbot settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Update or create the chatbot prompt
export const updateChatbotSettings = async (req, res) => {
  const { conversation_prompt } = req.body;

  if (!conversation_prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Deactivate all existing prompts
    await connection.query('UPDATE chatbot_settings SET is_active = 0');

    // Insert new active prompt
    await connection.query(
      'INSERT INTO chatbot_settings (conversation_prompt, is_active, created_at, updated_at) VALUES (?, 1, NOW(), NOW())',
      [conversation_prompt]
    );

    await connection.commit();
    res.json({ message: 'Chatbot settings updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating chatbot settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};
