import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getChatbotSettings, updateChatbotSettings, getAppSettings, updateAppSettings } from '../lib/api';

// Purpose: Settings and configuration page
// Manage API keys, WhatsApp settings, and AI preferences

export default function Settings() {
  const [prompt, setPrompt] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [whatsappPhoneId, setWhatsappPhoneId] = useState('');
  const [whatsappToken, setWhatsappToken] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [chatbotData, appSettings] = await Promise.all([
        getChatbotSettings(),
        getAppSettings()
      ]);

      if (chatbotData && chatbotData.conversation_prompt) {
        setPrompt(chatbotData.conversation_prompt);
      }

      if (appSettings) {
        setOpenaiKey(appSettings.OPENAI_API_KEY || '');
        setWhatsappPhoneId(appSettings.WHATSAPP_PHONE_NUMBER_ID || '');
        setWhatsappToken(appSettings.WHATSAPP_ACCESS_TOKEN || '');
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    }
  };

  const handleSave = async () => {
    if (!prompt.trim()) {
      toast.error('Prompt cannot be empty');
      return;
    }

    setLoading(true);
    try {
      await Promise.all([
        updateChatbotSettings({ conversation_prompt: prompt }),
        updateAppSettings({
          openai_key: openaiKey,
          whatsapp_phone_id: whatsappPhoneId,
          whatsapp_token: whatsappToken
        })
      ]);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure system settings and integrations
          </p>
        </div>

        {/* AI Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>AI Preferences</CardTitle>
            <CardDescription>
              Configure AI model behavior and style
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-model">AI Model</Label>
              <Input
                id="ai-model"
                defaultValue="gpt-4-turbo"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Currently using GPT-4 Turbo for optimal performance
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-style">Conversation Style</Label>
              <Textarea
                id="ai-style"
                placeholder="Define the AI's personality and tone..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
            <CardDescription>
              Manage API keys and authentication tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">OpenAI API Key</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-••••••••••••••••"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Used for AI-powered conversation analysis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone-id">WhatsApp Phone Number ID</Label>
              <Input
                id="whatsapp-phone-id"
                placeholder="123456789"
                value={whatsappPhoneId}
                onChange={(e) => setWhatsappPhoneId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-token">WhatsApp Access Token</Label>
              <Input
                id="whatsapp-token"
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxx"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Required for sending and receiving WhatsApp messages
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>
            Save All Settings
          </Button>
        </div>
      </div>
    </Layout>
  );
}
