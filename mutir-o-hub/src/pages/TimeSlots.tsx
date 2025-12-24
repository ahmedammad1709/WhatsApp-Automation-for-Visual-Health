import Layout from '@/components/Layout';

// Time slots have been removed from the product. This page is kept only to avoid
// breaking existing navigation links, but it simply explains the new behaviour.

export default function TimeSlots() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Agendamentos por Data</h1>
            <p className="text-muted-foreground mt-1">
              O sistema agora funciona apenas com datas e capacidade diária. Não há mais horários ou time slots individuais.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}

