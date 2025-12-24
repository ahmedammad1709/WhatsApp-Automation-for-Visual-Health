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
          <p>Loading dashboard data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your mutirão events and appointments
          </p>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            title="Total Appointments Today"
            value={stats.todayAppointments}
            // change={11.9}
            // trend="up"
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Confirmed Appointments"
            value={stats.confirmedAppointments}
            // change={8.6}
            // trend="up"
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <StatsCard
            title="Pending Capacity"
            value={stats.pendingCapacity}
            // change={-3.8}
            // trend="down"
            icon={<Clock className="w-5 h-5" />}
          />
          <StatsCard
            title="Conversion Rate"
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
              <CardTitle>Appointments by City</CardTitle>
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
              <CardTitle>Appointments Trend (Last 7 Days)</CardTitle>
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
