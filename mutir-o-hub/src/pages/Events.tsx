import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getEvents, createEvent, deleteEvent, getCities } from '@/lib/api';
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

  const handleCreateEvent = () => {
    setEditingEvent(null);
    setIsDialogOpen(true);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    await deleteEvent(id);
    setEvents(events.filter(e => e.id !== id));
    toast.success('Event deleted successfully');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      city_id: String(form.get('city_id')),
      location: String(form.get('location')),
      start_date: String(form.get('start_date')),
      end_date: String(form.get('end_date')),
      max_capacity: Number(form.get('max_capacity')),
      notes: String(form.get('notes') || ''),
      startTime: String(form.get('startTime')),
      endTime: String(form.get('endTime')),
    };
    const created = await createEvent(payload);
    setEvents([created, ...events]);
    setIsDialogOpen(false);
    toast.success(editingEvent ? 'Event updated successfully' : 'Event created successfully');
  };

  const columns = [
    { key: 'id', label: 'ID' },
    {
      key: 'city_id',
      label: 'City',
      render: (_: any, row: any) => {
        const city = cities.find((c) => c.id === row.city_id);
        return city ? `${city.name}${city.state ? `, ${city.state}` : ''}` : row.city_id;
      },
    },
    { key: 'location', label: 'Location' },
    { key: 'start_date', label: 'Start Date', render: (v: any) => formatDate(v) },
    { key: 'end_date', label: 'End Date', render: (v: any) => formatDate(v) },
    { key: 'max_capacity', label: 'Max Capacity' },
    { key: 'notes', label: 'Notes' },
    { key: 'created_at', label: 'Created At', render: (v: any) => formatDate(v) },
    {
      key: 'actions',
      label: 'Actions',
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Events Management</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage mutirão health campaign events
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateEvent}>
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingEvent ? 'Edit Event' : 'Create New Event'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city_id">City</Label>
                    <select id="city_id" name="city_id" className="border px-2 py-2 rounded w-full" defaultValue={editingEvent?.city?.id} required>
                      <option value="">Select a city</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" placeholder="UBS Centro" defaultValue={editingEvent?.location} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input id="start_date" name="start_date" type="date" defaultValue={formatDate(editingEvent?.start_date)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input id="end_date" name="end_date" type="date" defaultValue={formatDate(editingEvent?.end_date)} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time (e.g. 09:00 AM)</Label>
                    <Input
                      id="startTime"
                      name="startTime"
                      type="text"
                      placeholder="09:00 AM"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime">End Time (e.g. 05:00 PM)</Label>
                    <Input
                      id="endTime"
                      name="endTime"
                      type="text"
                      placeholder="05:00 PM"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_capacity">Max Capacity</Label>
                  <Input id="max_capacity" name="max_capacity" type="number" placeholder="50" defaultValue={editingEvent?.max_capacity} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" name="notes" placeholder="Additional information about the event..." defaultValue={editingEvent?.notes} rows={3} />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingEvent ? 'Update' : 'Create'} Event</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Events Table */}
        <DataTable
          columns={columns}
          data={events}
          emptyMessage="No events found. Create your first event!"
        />
      </div>
    </Layout>
  );
}
