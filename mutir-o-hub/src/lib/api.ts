import axios from 'axios';

// API base configuration
// Purpose: Centralized API layer for all backend communications
console.log('API Base URL:', import.meta.env.VITE_API_URL);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dashboard Stats
export const getDashboardStats = async () => {
  const response = await api.get('/api/dashboard/stats');
  return response.data;
};

// Events API
export const getEvents = async (params?: any) => {
  const response = await api.get('/api/events', { params });
  return response.data?.data ?? [];
};

export const createEvent = async (eventData: any) => {
  const response = await api.post('/api/events', eventData);
  return response.data?.data;
};

export const updateEvent = async (id: string, eventData: any) => {
  const response = await api.put(`/api/events/${id}`, eventData);
  return response.data;
};

export const deleteEvent = async (id: string) => {
  const response = await api.delete(`/api/events/${id}`);
  return response.data?.data;
};

// Cities API
export const getCities = async () => {
  const response = await api.get('/api/cities');
  return response.data?.data ?? [];
};

export const createCity = async (city: { name: string; state: string }) => {
  const response = await api.post('/api/cities', city);
  return response.data?.data;
};

export const updateCity = async (id: number | string, city: { name: string; state: string }) => {
  const response = await api.put(`/api/cities/${id}`, city);
  return response.data?.data;
};

export const deleteCity = async (id: number | string) => {
  const response = await api.delete(`/api/cities/${id}`);
  return response.data?.data;
};

// Patients API
export const getPatients = async () => {
  const response = await api.get('/api/patients');
  return response.data?.data ?? [];
};

export const getPatientById = async (id: string | number) => {
  const response = await api.get(`/api/patients/${id}`);
  return response.data?.data;
};

export const createPatient = async (patientData: any) => {
  const response = await api.post('/api/patients', patientData);
  return response.data?.data;
};

// Time Slots API
export const getTimeSlots = async () => {
  const response = await api.get('/api/time-slots');
  return response.data?.data ?? [];
};

export const getTimeSlotsByEvent = async (eventId: string | number) => {
  const response = await api.get(`/api/time-slots/event/${eventId}`);
  return response.data?.data ?? [];
};

export const createTimeSlot = async (timeSlotData: any) => {
  const response = await api.post('/api/time-slots', timeSlotData);
  return response.data?.data;
};

export const deleteTimeSlot = async (id: string | number) => {
  const response = await api.delete(`/api/time-slots/${id}`);
  return response.data;
};

// Conversation Logs API
export const getConversationLogs = async () => {
  const response = await api.get('/api/conversation-logs');
  return response.data?.data ?? [];
};

export const getConversationLogsByPhone = async (phone: string) => {
  const response = await api.get(`/api/conversation-logs/phone/${phone}`);
  return response.data?.data ?? [];
};

// Appointments API
export const getAppointments = async (params?: any) => {
  const response = await api.get('/api/appointments', { params });
  return response.data?.data ?? [];
};

export const getAppointmentById = async (id: string | number) => {
  const response = await api.get(`/api/appointments/${id}`);
  return response.data?.data;
};

export const createAppointment = async (appointmentData: any) => {
  const response = await api.post('/api/appointments', appointmentData);
  return response.data?.data;
};

export const updateAppointmentStatus = async (id: string | number, status: string) => {
  const response = await api.patch(`/api/appointments/${id}/status`, { status });
  return response.data;
};

export const deleteAppointment = async (id: string | number) => {
  const response = await api.delete(`/api/appointments/${id}`);
  return response.data;
};

export const markAttended = async (id: string) => {
  return updateAppointmentStatus(id, 'completed');
};

export const exportAppointments = async (params?: any) => {
  const response = await api.get('/api/appointments/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

// Reports API
export const getDailyReport = async (date: string) => {
  const response = await api.get(`/api/reports/daily/${date}`);
  return response.data;
};

export const getDateRangeReport = async (startDate: string, endDate: string) => {
  const response = await api.get('/api/reports/range', {
    params: { startDate, endDate },
  });
  return response.data;
};

export const sendReportToWhatsapp = async (reportId: string) => {
  const response = await api.post('/api/reports/send-whatsapp', { reportId });
  return response.data;
};

// Settings API
export const getSettings = async () => {
  const response = await api.get('/api/settings');
  return response.data;
};

export const updateSettings = async (settings: any) => {
  const response = await api.put('/api/settings', settings);
  return response.data;
};

export default api;
