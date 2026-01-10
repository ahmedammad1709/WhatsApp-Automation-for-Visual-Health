import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import DataTable from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, Search } from 'lucide-react';
import { getPatients } from '@/lib/api';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients();
      setPatients(data);
    } catch (error) {
      console.error('Error loading patients:', error);
      toast.error('Falha ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { key: 'full_name', label: 'Nome Completo' },
    { key: 'whatsapp_number', label: 'Número do WhatsApp' },
    { key: 'city', label: 'Cidade' },
    { key: 'neighborhood', label: 'Bairro' },
    { key: 'reason', label: 'Motivo' },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (date: string) => date ? new Date(date).toLocaleDateString('pt-BR') : '-',
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (_: any, row: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPatient(row)}
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const filteredPatients = patients.filter((patient) => {
    const query = searchQuery.toLowerCase();
    const fullName = patient.full_name?.toLowerCase() || '';
    const whatsapp = patient.whatsapp_number || '';
    const city = patient.city?.toLowerCase() || '';
    
    return (
      fullName.includes(query) ||
      whatsapp.includes(query) ||
      city.includes(query)
    );
  });

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Pacientes</h1>
            <p className="text-muted-foreground mt-1">
              Mostrando {filteredPatients.length} pacientes
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pacientes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Patients Table */}
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando pacientes...</div>
        ) : (
          <DataTable
            columns={columns}
            data={filteredPatients}
            emptyMessage="Nenhum paciente encontrado"
          />
        )}

        {/* Patient Details Sheet */}
        <Sheet open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Detalhes do Paciente</SheetTitle>
            </SheetHeader>
            {selectedPatient && (
              <div className="mt-6 space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Nome Completo</h3>
                  <p className="text-lg font-semibold">{selectedPatient.full_name}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Número do WhatsApp</h3>
                  <p>{selectedPatient.whatsapp_number}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Cidade</h3>
                    <p>{selectedPatient.city || '-'}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">Bairro</h3>
                    <p>{selectedPatient.neighborhood || '-'}</p>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Motivo</h3>
                  <p>{selectedPatient.reason || '-'}</p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Criado em</h3>
                  <p className="text-sm">{selectedPatient.created_at ? new Date(selectedPatient.created_at).toLocaleString('pt-BR') : '-'}</p>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </Layout>
  );
}

