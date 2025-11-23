import axios from 'axios';

// API base configuration
// Purpose: Centralized API layer for all backend communications
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
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
  const response = await api.get('/dashboard/stats');
  return response.data;
};

// Events API
export const getEvents = async (params?: any) => {
  const response = await api.get('/events', { params });
  return response.data?.data ?? [];
};

export const createEvent = async (eventData: any) => {
  const response = await api.post('/events', eventData);
  return response.data?.data;
};

export const updateEvent = async (id: string, eventData: any) => {
  const response = await api.put(`/events/${id}`, eventData);
  return response.data;
};

export const deleteEvent = async (id: string) => {
  const response = await api.delete(`/events/${id}`);
  return response.data?.data;
};

// Cities API
export const getCities = async () => {
  const response = await api.get('/cities');
  return response.data?.data ?? [];
};

export const createCity = async (city: { name: string; state: string }) => {
  const response = await api.post('/cities', city);
  return response.data?.data;
};

export const updateCity = async (id: number | string, city: { name: string; state: string }) => {
  const response = await api.put(`/cities/${id}`, city);
  return response.data?.data;
};

export const deleteCity = async (id: number | string) => {
  const response = await api.delete(`/cities/${id}`);
  return response.data?.data;
};

// Appointments API
export const getAppointments = async (params?: any) => {
  const response = await api.get('/appointments', { params });
  return response.data;
};

export const markAttended = async (id: string) => {
  const response = await api.patch(`/appointments/${id}/attended`);
  return response.data;
};

export const exportAppointments = async (params?: any) => {
  const response = await api.get('/appointments/export', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

// Reports API
export const getDailyReport = async (date: string) => {
  const response = await api.get(`/reports/daily/${date}`);
  return response.data;
};

export const getDateRangeReport = async (startDate: string, endDate: string) => {
  const response = await api.get('/reports/range', {
    params: { startDate, endDate },
  });
  return response.data;
};

export const sendReportToWhatsapp = async (reportId: string) => {
  const response = await api.post('/reports/send-whatsapp', { reportId });
  return response.data;
};

// Settings API
export const getSettings = async () => {
  const response = await api.get('/settings');
  return response.data;
};

export const updateSettings = async (settings: any) => {
  const response = await api.put('/settings', settings);
  return response.data;
};

export default api;
