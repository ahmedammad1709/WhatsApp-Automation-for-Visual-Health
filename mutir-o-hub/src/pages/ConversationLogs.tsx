import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { getConversationLogs } from '@/lib/api';
import { toast } from 'sonner';

export default function ConversationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await getConversationLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error loading conversation logs:', error);
      toast.error('Failed to load conversation logs');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'patient_phone', label: 'Phone Number' },
    {
      key: 'message_in',
      label: 'Message In',
      render: (text: string) => (
        <div className="max-w-md truncate" title={text}>
          {text || '-'}
        </div>
      ),
    },
    {
      key: 'message_out',
      label: 'Message Out',
      render: (text: string) => (
        <div className="max-w-md truncate" title={text}>
          {text || '-'}
        </div>
      ),
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (date: string) => date ? new Date(date).toLocaleString('pt-BR') : '-',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conversation Logs</h1>
            <p className="text-muted-foreground mt-1">
              Showing {logs.length} conversation logs
            </p>
          </div>
        </div>

        {/* Conversation Logs Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading conversation logs...</div>
        ) : (
          <DataTable
            columns={columns}
            data={logs}
            emptyMessage="No conversation logs found"
          />
        )}
      </div>
    </Layout>
  );
}

