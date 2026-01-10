import * as React from 'react';
const { useEffect, useState } = React;
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Plus, Edit, Trash2, Search } from 'lucide-react';
import { getCities, createCity, updateCity, deleteCity } from '@/lib/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Cities() {
  const [cities, setCities] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (!confirm('Tem certeza que deseja excluir esta cidade?')) return;
    await deleteCity(id);
    setCities(cities.filter(c => c.id !== id));
    toast.success('Cidade excluída com sucesso');
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
      toast.success('Cidade atualizada com sucesso');
    } else {
      const created = await createCity(payload);
      setCities([created, ...cities]);
      toast.success('Cidade criada com sucesso');
    }
    setIsDialogOpen(false);
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Nome' },
    { key: 'state', label: 'Estado' },
    { key: 'created_at', label: 'Criado em' },
    {
      key: 'actions',
      label: 'Ações',
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

  const filteredCities = cities.filter((city) => {
    const query = searchQuery.toLowerCase();
    return (
      city.name.toLowerCase().includes(query) ||
      city.state.toLowerCase().includes(query)
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Gerenciamento de Cidades</h1>
            <p className="text-muted-foreground mt-1">Criar, editar e excluir cidades</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleCreateCity}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Cidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingCity ? 'Editar Cidade' : 'Adicionar Cidade'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" name="name" placeholder="Nome da cidade" defaultValue={editingCity?.name} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" name="state" placeholder="Estado" defaultValue={editingCity?.state} required />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editingCity ? 'Atualizar' : 'Criar'} Cidade</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cidades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <DataTable columns={columns} data={filteredCities} emptyMessage="Nenhuma cidade encontrada. Adicione sua primeira cidade!" />
      </div>
    </Layout>
  );
}