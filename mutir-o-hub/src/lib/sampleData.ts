// Sample data for development and testing
// Purpose: Provides mock data for all dashboard components

export const sampleStats = {
  todayAppointments: 0,
  confirmedAppointments: 0,
  pendingCapacity: 0,
  conversionRate: 0,
  yesterdayAppointments: 42,
  yesterdayConfirmed: 35,
  yesterdayPending: 130,
  yesterdayConversion: 78,
};

export const sampleEvents = [
  {
    id: '1',
    city: 'São Paulo',
    location: 'Centro Comunitário Vila Mariana',
    dates: ['2024-01-15', '2024-01-16', '2024-01-17'],
    timeSlots: ['08:00-10:00', '10:00-12:00', '14:00-16:00', '16:00-18:00'],
    maxCapacityPerDay: 50,
    notes: 'Evento focado em saúde da mulher',
    status: 'active',
    createdAt: '2024-01-01',
  },
  {
    id: '2',
    city: 'Rio de Janeiro',
    location: 'UBS Copacabana',
    dates: ['2024-01-20', '2024-01-21'],
    timeSlots: ['09:00-11:00', '13:00-15:00', '15:00-17:00'],
    maxCapacityPerDay: 40,
    notes: 'Foco em prevenção cardiovascular',
    status: 'active',
    createdAt: '2024-01-05',
  },
  {
    id: '3',
    city: 'Belo Horizonte',
    location: 'Centro de Saúde Pampulha',
    dates: ['2024-01-25'],
    timeSlots: ['08:00-12:00', '13:00-17:00'],
    maxCapacityPerDay: 60,
    notes: 'Campanha de vacinação',
    status: 'planning',
    createdAt: '2024-01-10',
  },
];

export const sampleAppointments = [
  {
    id: '1',
    patientName: 'Maria Silva',
    phone: '(11) 98765-4321',
    city: 'São Paulo',
    neighborhood: 'Vila Mariana',
    age: 45,
    appointmentDate: '2024-01-15',
    appointmentTime: '08:00-10:00',
    leadSource: 'WhatsApp',
    status: 'confirmed',
    attended: false,
    createdAt: '2024-01-10 14:30',
  },
  {
    id: '2',
    patientName: 'João Santos',
    phone: '(11) 98765-1234',
    city: 'São Paulo',
    neighborhood: 'Moema',
    age: 52,
    appointmentDate: '2024-01-15',
    appointmentTime: '10:00-12:00',
    leadSource: 'Instagram',
    status: 'confirmed',
    attended: false,
    createdAt: '2024-01-10 15:45',
  },
  {
    id: '3',
    patientName: 'Ana Costa',
    phone: '(21) 97654-3210',
    city: 'Rio de Janeiro',
    neighborhood: 'Copacabana',
    age: 38,
    appointmentDate: '2024-01-20',
    appointmentTime: '09:00-11:00',
    leadSource: 'WhatsApp',
    status: 'pending',
    attended: false,
    createdAt: '2024-01-11 09:15',
  },
  {
    id: '4',
    patientName: 'Pedro Oliveira',
    phone: '(11) 96543-2109',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    age: 61,
    appointmentDate: '2024-01-15',
    appointmentTime: '14:00-16:00',
    leadSource: 'Facebook',
    status: 'confirmed',
    attended: false,
    createdAt: '2024-01-11 11:20',
  },
];

export const sampleChartData = {
  appointmentsByCity: [
    { city: 'São Paulo', appointments: 156 },
    { city: 'Rio de Janeiro', appointments: 98 },
    { city: 'Belo Horizonte', appointments: 72 },
    { city: 'Brasília', appointments: 54 },
    { city: 'Salvador', appointments: 41 },
  ],
  appointmentsByHour: [
    { hour: '08:00', appointments: 12 },
    { hour: '09:00', appointments: 18 },
    { hour: '10:00', appointments: 24 },
    { hour: '11:00', appointments: 22 },
    { hour: '12:00', appointments: 8 },
    { hour: '13:00', appointments: 6 },
    { hour: '14:00', appointments: 19 },
    { hour: '15:00', appointments: 26 },
    { hour: '16:00', appointments: 23 },
    { hour: '17:00', appointments: 15 },
  ],
  conversionBySource: [
    { source: 'WhatsApp', conversions: 245, total: 280 },
    { source: 'Instagram', conversions: 178, total: 230 },
    { source: 'Facebook', conversions: 134, total: 190 },
    { source: 'Direct', conversions: 89, total: 120 },
  ],
};

export const leadSources = ['WhatsApp', 'Instagram', 'Facebook', 'Direct', 'Other'];
export const cities = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília', 'Salvador'];
export const statuses = ['pending', 'confirmed', 'cancelled', 'attended'];
