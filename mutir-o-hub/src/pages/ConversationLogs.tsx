import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Input } from '@/components/ui/input';
import { getConversationLogs } from '@/lib/api';
import { toast } from 'sonner';

export default function ConversationLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredLogs = logs.filter((log) => {
    const query = (searchQuery || '').trim();


    if (!query) return true;
    return log.patient_phone?.includes(query);
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Conversation Logs</h1>
            <p className="text-muted-foreground mt-1">
              Showing {filteredLogs.length} conversation logs
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            placeholder="Search by phone number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Conversation Logs Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading conversation logs...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredLogs}
            emptyMessage="No conversation logs found"
          />
        )}
      </div>
    </Layout>
  );
}

