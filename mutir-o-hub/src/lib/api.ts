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

export const getDashboardCharts = async () => {
  const response = await api.get('/api/dashboard/charts');
  return response.data;
};

// Reports API
export const getReportStats = async () => {
  const response = await api.get('/api/reports/stats');
  return response.data;
};

export const getReportCharts = async () => {
  const response = await api.get('/api/reports/charts');
  return response.data;
};

export const sendReportToWhatsApp = async (phoneNumber: string) => {
  const response = await api.post('/api/reports/send', { phoneNumber });
  return response.data;
};

// Chatbot Settings API
export const getChatbotSettings = async () => {
  const response = await api.get('/api/chatbot-settings');
  return response.data;
};

export const updateChatbotSettings = async (settings: { conversation_prompt: string }) => {
  const response = await api.post('/api/chatbot-settings', settings);
  return response.data;
};

// App Settings API
export const getAppSettings = async () => {
  const response = await api.get('/api/app-settings');
  return response.data;
};

export const updateAppSettings = async (settings: { openai_key?: string; whatsapp_phone_id?: string; whatsapp_token?: string }) => {
  const response = await api.post('/api/app-settings', settings);
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

// Appointments API
export const getAppointments = async () => {
  const response = await api.get('/api/appointments');
  return response.data?.data ?? [];
};

export const updateAppointmentStatus = async (id: string | number, status: string) => {
  const response = await api.patch(`/api/appointments/${id}/status`, { status });
  return response.data;
};

export const getReminders = async () => {
  const response = await api.get('/api/appointments/reminders');
  return response.data?.data ?? [];
};

export const sendCustomReminder = async (phone: string, message: string) => {
  const response = await api.post('/api/appointments/reminders/send', { phone, message });
  return response.data;
};

// Conversation Logs API
export const getConversationLogs = async () => {
  const response = await api.get('/api/conversation-logs');
  return response.data?.data ?? [];
};

// Patients API
export const getPatients = async () => {
  const response = await api.get('/api/patients');
  return response.data?.data ?? [];
};

export default api;
