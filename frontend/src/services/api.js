import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Configurar axios con interceptores para el token
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Para enviar cookies
});

// Interceptor para agregar token en cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============ AUTH ============
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

// ============ CITAS ============
export const citasAPI = {
  // Crear cita
  create: (data) => api.post('/citas', data),
  
  // Listar citas con filtros opcionales
  getAll: (params = {}) => api.get('/citas', { params }),
  
  // Obtener una cita por ID
  getById: (id) => api.get(`/citas/${id}`),
  
  // Actualizar cita
  update: (id, data) => api.put(`/citas/${id}`, data),
  
  // Eliminar cita
  delete: (id) => api.delete(`/citas/${id}`),
  
  // Filtros específicos
  getByPaciente: (id_paciente) => api.get('/citas', { params: { id_paciente } }),
  getByMedico: (id_medico) => api.get('/citas', { params: { id_medico } }),
  getByEstado: (estado) => api.get('/citas', { params: { estado } }),
  getByFechas: (from, to) => api.get('/citas', { params: { from, to } }),
};

// ============ PERSONAS ============
export const personasAPI = {
  create: (data) => api.post('/personas', data),
  getAll: (params = {}) => api.get('/personas', { params }),
  getById: (id) => api.get(`/personas/${id}`),
  update: (id, data) => api.put(`/personas/${id}`, data),
  delete: (id) => api.delete(`/personas/${id}`),
  getByDocumento: (numero_documento) => api.get(`/personas/documento/${numero_documento}`),
};

// ============ MÉDICOS ============
export const medicosAPI = {
  create: (data) => api.post('/medicos', data),
  getAll: (params = {}) => api.get('/medicos', { params }),
  getById: (id) => api.get(`/medicos/${id}`),
  update: (id, data) => api.put(`/medicos/${id}`, data),
  delete: (id) => api.delete(`/medicos/${id}`),
  asignarEspecialidad: (id_medico, id_especialidad) => 
    api.post(`/medicos/${id_medico}/especialidades`, { id_especialidad }),
  removerEspecialidad: (id_medico, id_especialidad) => 
    api.delete(`/medicos/${id_medico}/especialidades/${id_especialidad}`),
};

// ============ ESPECIALIDADES ============
export const especialidadesAPI = {
  create: (data) => api.post('/especialidades', data),
  getAll: (params = {}) => api.get('/especialidades', { params }),
  getById: (id) => api.get(`/especialidades/${id}`),
  update: (id, data) => api.put(`/especialidades/${id}`, data),
  delete: (id) => api.delete(`/especialidades/${id}`),
};

// ============ ROLES ============
export const rolesAPI = {
  create: (data) => api.post('/roles', data),
  getAll: (params = {}) => api.get('/roles', { params }),
  getById: (id) => api.get(`/roles/${id}`),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

export default api;

