import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { toast } from 'sonner';
import { getReportStats, getReportCharts, sendReportToWhatsApp } from '@/lib/api';

// Purpose: Reports and analytics page
// Shows comprehensive reports with charts and WhatsApp integration

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--warning))', 'hsl(var(--info))'];

export default function Reports() {
  const [stats, setStats] = useState({
    totalAppointments: 0,
    activeEvents: 0,
    citiesCovered: 0,
    conversionRate: 0
  });

  const [charts, setCharts] = useState({
    appointmentsByCity: [],
    appointmentsByStatus: [],
    dailyPerformance: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, chartsData] = await Promise.all([
          getReportStats(),
          getReportCharts()
        ]);
        setStats(statsData);
        setCharts(chartsData);
      } catch (error) {
        console.error('Failed to fetch report data:', error);
        toast.error('Falha ao carregar dados do relatório');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSendToWhatsApp = async () => {
    try {
      setLoading(true);
      const targetNumber = '5588981033336'; 
      await sendReportToWhatsApp(targetNumber);
      toast.success(`Relatório enviado para o gestor no WhatsApp (${targetNumber})`);
    } catch (error) {
      console.error('Failed to send report:', error);
      toast.error('Falha ao enviar relatório para o WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const statusData = charts.appointmentsByStatus.map(item => ({
    name: item.status,
    value: item.value
  }));

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Relatórios e Análises</h1>
            <p className="text-muted-foreground mt-1">
              Relatórios completos e visualização de dados
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSendToWhatsApp}>
              <Send className="w-4 h-4 mr-2" />
              Enviar para WhatsApp
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalAppointments}</div>
              <div className="text-sm text-muted-foreground">Total Appointments</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <div className="text-sm text-muted-foreground">Average Conversion</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.activeEvents}</div>
              <div className="text-sm text-muted-foreground">Active Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.citiesCovered}</div>
              <div className="text-sm text-muted-foreground">Cities Covered</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments by City */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição de Agendamentos (por Cidade)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={charts.appointmentsByCity}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="city" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Bar dataKey="appointments" name="Agendamentos" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointments by Status */}
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="hsl(var(--primary))"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Daily Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Desempenho Recente (Últimos 5 Dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {charts.dailyPerformance.map((dayData, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                  <div>
                    <div className="font-medium">{dayData.day} ({new Date(dayData.date).toLocaleDateString()})</div>
                    <div className="text-sm text-muted-foreground">
                      {dayData.totalAppointments} agendamentos • {dayData.confirmedAppointments} confirmados
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-success">
                      {dayData.conversionRate}% conversão
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {dayData.remainingCapacity} vagas restantes
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
