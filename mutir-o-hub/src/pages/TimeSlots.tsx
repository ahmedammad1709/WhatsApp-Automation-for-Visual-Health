import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Badge } from '@/components/ui/badge';
import { getTimeSlots } from '@/lib/api';
import { toast } from 'sonner';

export default function TimeSlots() {
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTimeSlots();
  }, []);

  const loadTimeSlots = async () => {
    try {
      setLoading(true);
      const data = await getTimeSlots();
      setTimeSlots(data);
    } catch (error) {
      console.error('Error loading time slots:', error);
      toast.error('Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'city_name', label: 'City' },
    { key: 'location', label: 'Location' },
    {
      key: 'slot_date',
      label: 'Date',
      render: (date: string) => date ? new Date(date).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'slot_time',
      label: 'Time',
      render: (time: string) => time ? time.slice(0, 5) : '-',
    },
    { key: 'max_per_slot', label: 'Max Capacity' },
    { key: 'reserved_count', label: 'Reserved' },
    {
      key: 'available',
      label: 'Available',
      render: (_: any, row: any) => {
        const available = row.max_per_slot - row.reserved_count;
        return (
          <Badge variant={available > 0 ? 'default' : 'destructive'}>
            {available}
          </Badge>
        );
      },
    },
    {
      key: 'created_at',
      label: 'Created At',
      render: (date: string) => date ? new Date(date).toLocaleDateString('pt-BR') : '-',
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Time Slots</h1>
            <p className="text-muted-foreground mt-1">
              Showing {timeSlots.length} time slots
            </p>
          </div>
        </div>

        {/* Time Slots Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading time slots...</div>
        ) : (
          <DataTable
            columns={columns}
            data={timeSlots}
            emptyMessage="No time slots found"
          />
        )}
      </div>
    </Layout>
  );
}

