import { useEffect, useState } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { getCities, createCity, updateCity, deleteCity } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Cities() {
  const [cities, setCities] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const ct = await getCities();
        setCities(ct);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  const handleCreateCity = () => {
    setEditingCity(null);
    setIsDialogOpen(true);
  };

  const handleEditCity = (city: any) => {
    setEditingCity(city);
    setIsDialogOpen(true);
  };

  const handleDeleteCity = async (id: number) => {
    if (!confirm('Are you sure you want to delete this city?')) return;
    await deleteCity(id);
    setCities(cities.filter(c => c.id !== id));
    toast.success('City deleted successfully');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = {
      name: String(form.get('name')),
      state: String(form.get('state')),
    };
    if (editingCity) {
      const updated = await updateCity(editingCity.id, payload);
      setCities(cities.map(c => (c.id === editingCity.id ? { ...c, ...updated } : c)));
      toast.success('City updated successfully');
    } else {
      const created = await createCity(payload);
      setCities([created, ...cities]);
      toast.success('City created successfully');
    }
    setIsDialogOpen(false);
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'state', label: 'State' },
    { key: 'created_at', label: 'Created At' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEditCity(row)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDeleteCity(row.id)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cities Management</h1>
            <p className="text-muted-foreground mt-1">Create, edit, and delete cities</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateCity}>
                <Plus className="w-4 h-4 mr-2" />
                Add City
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCity ? 'Edit City' : 'Add City'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="City name" defaultValue={editingCity?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" placeholder="State" defaultValue={editingCity?.state} required />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit">{editingCity ? 'Update' : 'Create'} City</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <DataTable columns={columns} data={cities} emptyMessage="No cities found. Add your first city!" />
      </div>
    </Layout>
  );
}