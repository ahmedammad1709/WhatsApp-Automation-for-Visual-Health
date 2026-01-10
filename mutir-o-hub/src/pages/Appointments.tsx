import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, CheckCircle, Eye } from 'lucide-react';
import { getAppointments, updateAppointmentStatus, getCities } from '@/lib/api';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// Purpose: Appointments queue management page
// View, filter, and export appointment data

export default function Appointments() {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    city: 'all',
    status: 'all',
  });

  useEffect(() => {
    loadAppointments();
    loadCities();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const data = await getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Falha ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const loadCities = async () => {
    try {
      const data = await getCities();
      const cityNames = [...new Set(data.map((c: any) => c.name))];
      setCities(cityNames as string[]);
    } catch (error) {
      console.error('Error loading cities:', error);
    }
  };

  const handleMarkAttended = async (id: string | number) => {
    try {
      await updateAppointmentStatus(id, 'completed');
      await loadAppointments();
      toast.success('Agendamento marcado como realizado');
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast.error('Falha ao atualizar agendamento');
    }
  };

  const handleExport = () => {
    if (filteredAppointments.length === 0) {
      toast.error('Sem agendamentos para exportar');
      return;
    }

    toast.info('Preparando exportação...');

    try {
      const exportData = filteredAppointments.map(apt => {
        // Safe date formatting (YYYY-MM-DD -> DD/MM/YYYY)
        let dateStr = '';
        if (apt.appointment_date) {
           const rawDate = typeof apt.appointment_date === 'string' ? apt.appointment_date : new Date(apt.appointment_date).toISOString();
           const [year, month, day] = rawDate.split('T')[0].split('-');
           dateStr = `${day}/${month}/${year}`;
        }

        return {
          'Nome do Paciente': apt.patient_name,
          'Telefone': apt.whatsapp_number,
          'Cidade': apt.city_name,
          'Bairro': apt.neighborhood || '',
          'Local do Evento': apt.location,
          'Data': dateStr,
          'Status': apt.status,
          'Criado em': apt.created_at ? new Date(apt.created_at).toLocaleString('pt-BR') : ''
        };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Appointments");
      
      XLSX.writeFile(wb, `appointments_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Agendamentos exportados com sucesso!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Falha ao exportar agendamentos');
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filters.city !== 'all' && apt.city_name !== filters.city) return false;
    if (filters.status !== 'all' && apt.status !== filters.status) return false;
    return true;
  });

  const columns = [
    { key: 'patient_name', label: 'Nome do Paciente' },
    { key: 'whatsapp_number', label: 'Telefone' },
    { key: 'city_name', label: 'Cidade' },
    { key: 'neighborhood', label: 'Bairro' },
    {
      key: 'appointment_date',
      label: 'Data',
      render: (date: string) => {
        if (!date) return '-';
        const rawDate = typeof date === 'string' ? date : new Date(date).toISOString();
        const [year, month, day] = rawDate.split('T')[0].split('-');
        return `${day}/${month}/${year}`;
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => {
        const variants: any = {
          scheduled: 'default',
          completed: 'outline',
          cancelled: 'destructive',
        };
        const statusLabels: any = {
          scheduled: 'Agendado',
          completed: 'Concluído',
          cancelled: 'Cancelado',
        };
        return <Badge variant={variants[status] || 'secondary'}>{statusLabels[status] || status}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedAppointment(row)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {row.status !== 'completed' && row.status !== 'cancelled' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMarkAttended(row.id)}
            >
              <CheckCircle className="w-4 h-4 text-green-600" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fila de Agendamentos</h1>
            <p className="text-muted-foreground mt-1">
              Mostrando {filteredAppointments.length} agendamentos
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar para Excel
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <Select value={filters.city} onValueChange={(v) => setFilters({ ...filters, city: v })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todas as Cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Cidades</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="scheduled">Agendado</SelectItem>
              <SelectItem value="completed">Concluído</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Appointments Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando agendamentos...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredAppointments}
            emptyMessage="Nenhum agendamento encontrado com os filtros selecionados"
          />
        )}

        {/* Appointment Details Sheet */}
        <Sheet open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Detalhes do Agendamento</SheetTitle>
            </SheetHeader>
            {selectedAppointment && (
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Paciente</h3>
                  <p className="text-lg font-semibold">{selectedAppointment.patient_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Telefone</h3>
                    <p>{selectedAppointment.whatsapp_number}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Cidade</h3>
                    <p>{selectedAppointment.city_name}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Bairro</h3>
                  <p>{selectedAppointment.neighborhood || '-'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Local</h3>
                  <p>{selectedAppointment.location}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Data</h3>
                  <p>
                    {selectedAppointment.appointment_date ? (() => {
                      const rawDate = typeof selectedAppointment.appointment_date === 'string' ? selectedAppointment.appointment_date : new Date(selectedAppointment.appointment_date).toISOString();
                      const [year, month, day] = rawDate.split('T')[0].split('-');
                      return `${day}/${month}/${year}`;
                    })() : '-'}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <Badge>{selectedAppointment.status}</Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Criado em</h3>
                  <p className="text-sm">{selectedAppointment.created_at ? new Date(selectedAppointment.created_at).toLocaleString('pt-BR') : '-'}</p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
