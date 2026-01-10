import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { getEvents, createEvent, updateEvent, deleteEvent, getCities } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

// Purpose: Events management page for CRUD operations
// Allows creating, editing, and deleting mutirão events

export default function Events() {
  const [events, setEvents] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedStartDate, setSelectedStartDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (val: any) => {
    if (!val) return '';
    if (typeof val === 'string') return val.slice(0, 10);
    try {
      return new Date(val).toISOString().slice(0, 10);
    } catch {
      return String(val).slice(0, 10);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [ev, ct] = await Promise.all([getEvents(), getCities()]);
        setEvents(ev);
        setCities(ct);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (editingEvent) {
      setSelectedStartDate(formatDate(editingEvent.start_date));
    } else {
      setSelectedStartDate('');
    }
  }, [editingEvent, isDialogOpen]);

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este evento?')) return;
    try {
      await deleteEvent(id);
      setEvents(events.filter(e => e.id !== id));
      toast.success('Evento excluído com sucesso');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Falha ao excluir evento');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);

    const startDateStr = String(form.get('start_date'));
    const endDateStr = String(form.get('end_date'));
    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    if (!editingEvent && startDateStr < todayStr) {
       toast.error('Data de início não pode ser no passado para novos eventos');
       return;
    }

    if (endDateStr < startDateStr) {
      toast.error('Data de término não pode ser anterior à data de início');
      return;
    }

    const payload = {
      city_id: String(form.get('city_id')),
      location: String(form.get('location')),
      start_date: startDateStr,
      end_date: endDateStr,
      max_capacity: Number(form.get('max_capacity')),
      notes: String(form.get('notes') || ''),
    };

    if (editingEvent) {
      await updateEvent(editingEvent.id, payload);
      setEvents(events.map((ev) => (ev.id === editingEvent.id ? { ...ev, ...payload } : ev)));
    } else {
      const created = await createEvent(payload);
      setEvents([created, ...events]);
    }

    setIsDialogOpen(false);
    toast.success(editingEvent ? 'Evento atualizado com sucesso' : 'Evento criado com sucesso');
  };

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'city_id',
      label: 'Cidade',
      render: (_: any, row: any) => {
        const city = cities.find((c) => c.id === row.city_id);
        return city ? `${city.name}${city.state ? `, ${city.state}` : ''}` : row.city_id;
      },
    },
    { key: 'location', label: 'Local' },
    { key: 'start_date', label: 'Data de Início', render: (v: any) => formatDate(v) },
    { key: 'end_date', label: 'Data de Término', render: (v: any) => formatDate(v) },
    { key: 'max_capacity', label: 'Capacidade Máxima' },
    { key: 'notes', label: 'Notas' },
    { key: 'created_at', label: 'Criado em', render: (v: any) => formatDate(v) },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEditEvent(row)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(row.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredEvents = events.filter((event) => {
    const city = cities.find((c) => c.id === event.city_id);
    const cityName = city ? city.name.toLowerCase() : '';
    const location = event.location?.toLowerCase() || '';
    const notes = event.notes?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    return (
      cityName.includes(query) ||
      location.includes(query) ||
      notes.includes(query)
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Eventos</h1>
            <p className="text-muted-foreground mt-1">
              Criar e gerenciar eventos do mutirão
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateEvent}>
                <Plus className="w-4 h-4 mr-2" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Editar Evento' : 'Criar Novo Evento'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city_id">Cidade</Label>
                    <select id="city_id" name="city_id" className="border px-2 py-2 rounded w-full" defaultValue={editingEvent?.city?.id} required>
                      <option value="">Selecione uma cidade</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Local</Label>
                    <Input id="location" name="location" placeholder="UBS Centro" defaultValue={editingEvent?.location} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Data de Início</Label>
                    <Input 
                      id="start_date" 
                      name="start_date" 
                      type="date" 
                      defaultValue={formatDate(editingEvent?.start_date)}
                      min={editingEvent ? undefined : new Date().toLocaleDateString('en-CA')}
                      onChange={(e) => setSelectedStartDate(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">Data de Término</Label>
                    <Input 
                      id="end_date" 
                      name="end_date" 
                      type="date" 
                      defaultValue={formatDate(editingEvent?.end_date)}
                      min={selectedStartDate}
                      required 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Capacidade Máxima</Label>
                  <Input id="max_capacity" name="max_capacity" type="number" placeholder="50" defaultValue={editingEvent?.max_capacity} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea id="notes" name="notes" placeholder="Informações adicionais sobre o evento..." defaultValue={editingEvent?.notes} rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editingEvent ? 'Atualizar' : 'Criar'} Evento</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Events Table */}
        <DataTable
          columns={columns}
          data={filteredEvents}
          emptyMessage="Nenhum evento encontrado."
        />
      </div>
    </Layout>
  );
}
