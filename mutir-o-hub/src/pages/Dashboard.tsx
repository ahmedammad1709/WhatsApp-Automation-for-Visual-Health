import Layout from '@/components/Layout';
import StatsCard from '@/components/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { sampleStats, sampleChartData } from '@/lib/sampleData';

// Purpose: Main dashboard page showing key metrics and visualizations
// Displays stats cards, appointment trends, and city-wise analytics

export default function Dashboard() {
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
            value={sampleStats.todayAppointments}
            change={11.9}
            trend="up"
            icon={<Users className="w-5 h-5" />}
          />
          <StatsCard
            title="Confirmed Appointments"
            value={sampleStats.confirmedAppointments}
            change={8.6}
            trend="up"
            icon={<CheckCircle className="w-5 h-5" />}
          />
          <StatsCard
            title="Pending Capacity"
            value={sampleStats.pendingCapacity}
            change={-3.8}
            trend="down"
            icon={<Clock className="w-5 h-5" />}
          />
          <StatsCard
            title="Conversion Rate"
            value={`${sampleStats.conversionRate}%`}
            change={3.9}
            trend="up"
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
                <BarChart data={sampleChartData.appointmentsByCity}>
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

          {/* Appointments by Hour */}
          <Card>
            <CardHeader>
              <CardTitle>Appointments by Hour</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={sampleChartData.appointmentsByHour}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="hour" className="text-xs" />
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

        {/* Conversion by Source */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sampleChartData.conversionBySource.map((item) => {
                const rate = Math.round((item.conversions / item.total) * 100);
                return (
                  <div key={item.source} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.source}</span>
                      <span className="text-muted-foreground">
                        {item.conversions}/{item.total} ({rate}%)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
