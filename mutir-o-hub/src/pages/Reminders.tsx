import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { getReminders } from '@/lib/api';
import { toast } from 'sonner';
import { MessageSquare } from 'lucide-react';

export default function Reminders() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast.error('Falha ao carregar lembretes');
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
      label: 'Enviado em',
      render: (date: string) => date ? new Date(date).toLocaleString('pt-BR') : '-'
    },
    {
      key: 'preview',
      label: 'Prévia da Mensagem',
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
            <h1 className="text-3xl font-bold text-foreground">Lembretes Enviados</h1>
            <p className="text-muted-foreground mt-1">
              Exibindo {reminders.length} lembretes enviados
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando lembretes...</div>
        ) : (
          <DataTable
            columns={columns}
            data={reminders}
            emptyMessage="Nenhum lembrete enviado ainda"
          />
        )}
      </div>
    </Layout>
  );
}
