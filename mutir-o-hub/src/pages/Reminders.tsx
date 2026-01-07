import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { getReminders, sendCustomReminder } from '@/lib/api';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('Olá! Lembrete da sua consulta amanhã. Se precisar reagendar, responda por aqui.');

  useEffect(() => {
    loadReminders();
  }, []);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const data = await getReminders();
      setReminders(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
      toast.error('Failed to load reminders');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'patient_name', label: 'Patient Name' },
    { key: 'whatsapp_number', label: 'Phone' },
    { 
      key: 'appointment_date', 
      label: 'Appointment Date',
      render: (date: string) => {
        if (!date) return '-';
        const rawDate = typeof date === 'string' ? date : new Date(date).toISOString();
        const [year, month, day] = rawDate.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
      }
    },
    { 
      key: 'reminder_24h_sent_at', 
      label: 'Sent At',
      render: (date: string) => date ? new Date(date).toLocaleString('pt-BR') : '-'
    },
    {
      key: 'preview',
      label: 'Message Preview',
      render: (_: any, row: any) => {
        const apptDate = row.appointment_date 
          ? (() => {
              const rawDate = typeof row.appointment_date === 'string' ? row.appointment_date : new Date(row.appointment_date).toISOString();
              const [year, month, day] = rawDate.split('T')[0].split('-');
              return `${day}/${month}/${year}`;
            })()
          : '-';
          
        const previewText = `Olá, ${row.patient_name}! Aqui é o Instituto Luz no Caminho. Lembrete da sua consulta amanhã, ${apptDate}, em ${row.location}, ${row.city_name}...`;
        
        return (
          <div className="flex items-center gap-2 text-sm text-muted-foreground max-w-md truncate" title={previewText}>
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span className="truncate">{previewText}</span>
          </div>
        );
      }
    }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Reminders Sent</h1>
            <p className="text-muted-foreground mt-1">
              Showing {reminders.length} sent reminders
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 items-end">
          <div className="col-span-1">
            <input
              className="w-full border border-border rounded-md px-3 py-2 bg-background"
              placeholder="Phone (e.g., 923141038814)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <textarea
              className="w-full border border-border rounded-md px-3 py-2 bg-background h-24"
              placeholder="Reminder message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
            onClick={async () => {
              if (!phone.trim() || !message.trim()) {
                toast.error('Phone and message are required');
                return;
              }
              try {
                await sendCustomReminder(phone.trim(), message.trim());
                toast.success('Reminder sent');
                await loadReminders();
              } catch (e) {
                toast.error('Failed to send reminder');
              }
            }}
          >
            Send Reminder
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading reminders...</div>
        ) : (
          <DataTable
            columns={columns}
            data={reminders}
            emptyMessage="No reminders sent yet"
          />
        )}
      </div>
    </Layout>
  );
}
