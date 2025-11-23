import { useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, CheckCircle, Eye } from 'lucide-react';
import { sampleAppointments, cities, leadSources } from '@/lib/sampleData';
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
import { toast } from 'sonner';

// Purpose: Appointments queue management page
// View, filter, and export appointment data

export default function Appointments() {
  const [appointments, setAppointments] = useState(sampleAppointments);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [filters, setFilters] = useState({
    city: 'all',
    leadSource: 'all',
    status: 'all',
  });

  const handleMarkAttended = (id: string) => {
    setAppointments(
      appointments.map(apt =>
        apt.id === id ? { ...apt, attended: true, status: 'attended' } : apt
      )
    );
    toast.success('Appointment marked as attended');
  };

  const handleExport = () => {
    toast.success('Exporting appointments to Excel...');
    // In real app, would trigger download
  };

  const filteredAppointments = appointments.filter(apt => {
    if (filters.city !== 'all' && apt.city !== filters.city) return false;
    if (filters.leadSource !== 'all' && apt.leadSource !== filters.leadSource) return false;
    if (filters.status !== 'all' && apt.status !== filters.status) return false;
    return true;
  });

  const columns = [
    { key: 'patientName', label: 'Patient Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'city', label: 'City' },
    { key: 'neighborhood', label: 'Neighborhood' },
    { key: 'age', label: 'Age' },
    {
      key: 'appointmentDate',
      label: 'Date',
      render: (date: string) => new Date(date).toLocaleDateString('pt-BR'),
    },
    { key: 'appointmentTime', label: 'Time' },
    {
      key: 'status',
      label: 'Status',
      render: (status: string) => {
        const variants: any = {
          confirmed: 'default',
          pending: 'secondary',
          cancelled: 'destructive',
          attended: 'outline',
        };
        return <Badge variant={variants[status]}>{status}</Badge>;
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedAppointment(row)}
          >
            <Eye className="w-4 h-4" />
          </Button>
          {!row.attended && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMarkAttended(row.id)}
            >
              <CheckCircle className="w-4 h-4 text-success" />
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
            <h1 className="text-3xl font-bold text-foreground">Appointments Queue</h1>
            <p className="text-muted-foreground mt-1">
              Showing {filteredAppointments.length} appointments
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export to Excel
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 items-center">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <Select value={filters.city} onValueChange={(v) => setFilters({ ...filters, city: v })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.leadSource} onValueChange={(v) => setFilters({ ...filters, leadSource: v })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Sources" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {leadSources.map(source => (
                <SelectItem key={source} value={source}>{source}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="attended">Attended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Appointments Table */}
        <DataTable
          columns={columns}
          data={filteredAppointments}
          emptyMessage="No appointments match the selected filters"
        />

        {/* Appointment Details Sheet */}
        <Sheet open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Appointment Details</SheetTitle>
            </SheetHeader>
            {selectedAppointment && (
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Patient</h3>
                  <p className="text-lg font-semibold">{selectedAppointment.patientName}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Phone</h3>
                    <p>{selectedAppointment.phone}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Age</h3>
                    <p>{selectedAppointment.age} years</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Location</h3>
                  <p>{selectedAppointment.neighborhood}, {selectedAppointment.city}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Date</h3>
                    <p>{new Date(selectedAppointment.appointmentDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Time</h3>
                    <p>{selectedAppointment.appointmentTime}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Lead Source</h3>
                  <Badge>{selectedAppointment.leadSource}</Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Status</h3>
                  <Badge>{selectedAppointment.status}</Badge>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Created At</h3>
                  <p className="text-sm">{selectedAppointment.createdAt}</p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}
