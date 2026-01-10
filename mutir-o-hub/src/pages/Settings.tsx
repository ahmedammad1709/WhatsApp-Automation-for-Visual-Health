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
      toast.error('Falha ao carregar configurações');
    }
  };

  const handleSave = async () => {
    if (!prompt.trim()) {
      toast.error('O prompt não pode estar vazio');
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
      toast.success('Configurações salvas com sucesso');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Falha ao salvar configurações');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground mt-1">
            Configurar sistema e integrações
          </p>
        </div>

        {/* AI Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferências de IA</CardTitle>
            <CardDescription>
              Configurar comportamento e estilo do modelo de IA
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ai-model">Modelo de IA</Label>
              <Input
                id="ai-model"
                defaultValue="gpt-4-turbo"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Usando GPT-4 Turbo para melhor desempenho
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-style">Estilo de Conversa</Label>
              <Textarea
                id="ai-style"
                placeholder="Defina a personalidade e o tom da IA..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={8}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração de API</CardTitle>
            <CardDescription>
              Gerenciar chaves de API e tokens de autenticação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="openai-key">Chave de API OpenAI</Label>
              <Input
                id="openai-key"
                type="password"
                placeholder="sk-••••••••••••••••"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Usado para análise de conversa com IA
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-phone-id">ID do Número de Telefone WhatsApp</Label>
              <Input
                id="whatsapp-phone-id"
                placeholder="123456789"
                value={whatsappPhoneId}
                onChange={(e) => setWhatsappPhoneId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-token">Token de Acesso WhatsApp</Label>
              <Input
                id="whatsapp-token"
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxx"
                value={whatsappToken}
                onChange={(e) => setWhatsappToken(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Necessário para enviar e receber mensagens do WhatsApp
              </p>
            </div>
          </CardContent>
        </Card>


        {/* Save Button */}
        <div className="flex justify-end">
          <Button size="lg" onClick={handleSave}>
            Salvar Todas as Configurações
          </Button>
        </div>
      </div>
    </Layout>
  );
}
