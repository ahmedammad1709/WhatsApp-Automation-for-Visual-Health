import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { getDashboardStats, getDashboardCharts } from '@/lib/api';

// Purpose: Main dashboard page showing key metrics and visualizations
// Displays stats cards, appointment trends, and city-wise analytics

export default function Dashboard() {
  const [stats, setStats] = useState({
    todayAppointments: 0,
    confirmedAppointments: 0,
    pendingCapacity: 0,
    conversionRate: 0
  });

  const [charts, setCharts] = useState({
    appointmentsByCity: [],
    appointmentsByDate: []
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, chartsData] = await Promise.all([
          getDashboardStats(),
          getDashboardCharts()
        ]);
        setStats(statsData);
        setCharts(chartsData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando dados do painel...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral dos eventos e agendamentos do mutirão
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Agendamentos Hoje"
            value={stats.todayAppointments}
            // change={11.9}
            // trend="up"
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Agendamentos Confirmados"
            value={stats.confirmedAppointments}
            // change={8.6}
            // trend="up"
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <StatsCard
            title="Capacidade Pendente"
            value={stats.pendingCapacity}
            // change={-3.8}
            // trend="down"
            icon={<Clock className="w-5 h-5" />}
          />
          <StatsCard
            title="Taxa de Conversão"
            value={`${stats.conversionRate}%`}
            // change={3.9}
            // trend="up"
            icon={<TrendingUp className="w-5 h-5" />}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments by City */}
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos por Cidade</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
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
                  <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointments by Date */}
          <Card>
            <CardHeader>
              <CardTitle>Tendência de Agendamentos (Últimos 7 Dias)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={charts.appointmentsByDate}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="appointments"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--accent))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

      </div>
    </Layout>
  );
}
