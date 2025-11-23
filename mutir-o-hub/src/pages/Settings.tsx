import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// Purpose: Settings and configuration page
// Manage API keys, WhatsApp settings, and AI preferences

export default function Settings() {
  const handleSave = () => {
    toast.success('Settings saved successfully');
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
                defaultValue="sk-abc123xyz"
              />
              <p className="text-xs text-muted-foreground">
                Used for AI-powered conversation analysis
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp-key">WhatsApp Business API Key</Label>
              <Input
                id="whatsapp-key"
                type="password"
                placeholder="EAAxxxxxxxxxxxxxxx"
                defaultValue="EAAabc123xyz"
              />
              <p className="text-xs text-muted-foreground">
                Required for sending and receiving WhatsApp messages
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="database-url">Database Connection URL</Label>
              <Input
                id="database-url"
                type="password"
                placeholder="postgresql://..."
                defaultValue="postgresql://localhost:5432/mutirao"
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>WhatsApp Configuration</CardTitle>
            <CardDescription>
              Configure WhatsApp bot behavior and settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp-number">WhatsApp Business Number</Label>
              <Input
                id="whatsapp-number"
                placeholder="+55 11 98765-4321"
                defaultValue="+55 11 98765-4321"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="welcome-message">Welcome Message</Label>
              <Textarea
                id="welcome-message"
                placeholder="Hello! Welcome to our health campaign..."
                defaultValue="Olá! Bem-vindo ao Mutirão de Saúde. Como posso ajudá-lo hoje?"
                rows={4}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-reply</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically respond to incoming messages
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Working Hours Only</Label>
                <p className="text-sm text-muted-foreground">
                  Only respond during business hours (8AM - 6PM)
                </p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

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
              <Label htmlFor="temperature">Temperature (Creativity)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="2"
                defaultValue="0.7"
              />
              <p className="text-xs text-muted-foreground">
                Lower values = more focused, Higher values = more creative
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-style">Conversation Style</Label>
              <Textarea
                id="ai-style"
                placeholder="Define the AI's personality and tone..."
                defaultValue="Seja profissional, amigável e empático. Priorize a clareza e a precisão das informações de saúde."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>
              Manage how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive daily summary reports via email
                </p>
              </div>
              <Switch defaultChecked />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>SMS Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get SMS alerts for critical events
                </p>
              </div>
              <Switch />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show desktop notifications for new appointments
                </p>
              </div>
              <Switch defaultChecked />
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
