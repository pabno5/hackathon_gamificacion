import axios from 'axios';
import { supabase } from '../lib/supabaseClient';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
// Fase 4: módulos nuevos viven en /api/v1.
// El cliente apunta a /api/v1 para los recursos migrados, y a /api para los legacy
// (citas, hasta que migre en Fase 5).
const API_V1 = API_BASE.replace(/\/api$/, '/api/v1');

const apiV1 = axios.create({ baseURL: API_V1, withCredentials: true });
const apiLegacy = axios.create({ baseURL: API_BASE, withCredentials: true });

async function attachToken(config) {
  // Preferir el token vigente de Supabase (auto-refrescado) sobre el cacheado,
  // que puede estar expirado. getSession() lee de memoria/localStorage de
  // supabase-js y refresca si hace falta (FT-05: evita mandar JWT stale).
  let token = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token || null;
  } catch {
    /* noop */
  }
  if (!token) token = localStorage.getItem('authToken');
  if (token) {
    localStorage.setItem('authToken', token);
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}

apiV1.interceptors.request.use(attachToken, (e) => Promise.reject(e));
apiLegacy.interceptors.request.use(attachToken, (e) => Promise.reject(e));

// ============ AUTH ============
export const authAPI = {
  login: (data) => apiV1.post('/auth/login', data),
  profile: () => apiV1.get('/auth/profile'),
  recuperarPassword: (data) => apiV1.post('/auth/recuperar-password', data),
  tourCompletado: () => apiV1.post('/auth/tour-completado'),
};

// ============ CITAS (v1) ============
// Backend nuevo usa `fecha_cita` (DATE) + `hora_inicio`/`hora_fin` (TIME).
// Frontend legacy esperaba `fecha_cita` (TIMESTAMP) y deriva +1h.
// Adaptador: combinar/separar en la frontera para no tocar componentes.

function adaptCitaToFrontend(cita) {
  if (!cita) return cita;
  // Combinar `fecha_cita` + `hora_inicio` en un timestamp para el calendario
  const fecha = (cita.fecha_cita || '').slice(0, 10); // YYYY-MM-DD
  const horaIni = cita.hora_inicio?.slice(0, 5) || '00:00';
  return { ...cita, fecha_cita: `${fecha}T${horaIni}:00` };
}

function adaptCitaFromFrontend(data) {
  // Si viene un timestamp `fecha_cita`, separar en DATE + TIME
  if (data.fecha_cita && /T\d{2}:\d{2}/.test(String(data.fecha_cita))) {
    const dt = new Date(data.fecha_cita);
    const pad = (n) => String(n).padStart(2, '0');
    const fecha_cita = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const hora_inicio = data.hora_inicio || `${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
    // Default duración 30 min si no viene
    let hora_fin = data.hora_fin;
    if (!hora_fin) {
      const end = new Date(dt.getTime() + 30 * 60 * 1000);
      hora_fin = `${pad(end.getHours())}:${pad(end.getMinutes())}`;
    }
    return { ...data, fecha_cita, hora_inicio, hora_fin };
  }
  return data;
}

export const citasAPI = {
  create: async (data, file = null) => {
    const payload = adaptCitaFromFrontend(data);
    // Default canal si no lo manda
    if (!payload.canal) payload.canal = 'presencial';
    if (file) {
      // Backend v1 no acepta multipart de momento; upload separado pendiente
      console.warn('Adjunto de documentos pendiente en /api/v1/citas; se guarda sin archivo.');
    }
    const res = await apiV1.post('/citas', payload);
    return { ...res, data: { ...res.data, data: adaptCitaToFrontend(res.data.data) } };
  },
  getAll: async (params = {}) => {
    const res = await apiV1.get('/citas', { params });
    return { ...res, data: { ...res.data, data: (res.data.data || []).map(adaptCitaToFrontend) } };
  },
  getById: async (id) => {
    const res = await apiV1.get(`/citas/${id}`);
    return { ...res, data: { ...res.data, data: adaptCitaToFrontend(res.data.data) } };
  },
  update: async (id, data) => {
    const res = await apiV1.put(`/citas/${id}`, adaptCitaFromFrontend(data));
    return { ...res, data: { ...res.data, data: adaptCitaToFrontend(res.data.data) } };
  },
  /** "delete" del frontend mapea a cancelar (la cita queda con soft delete). */
  delete: (id, motivo = 'Cancelada desde el calendario') =>
    apiV1.post(`/citas/${id}/cancelar`, { motivo_cancelacion: motivo }),
  cancelar: (id, motivo) =>
    apiV1.post(`/citas/${id}/cancelar`, { motivo_cancelacion: motivo }),
  disponibilidad: (params = {}) => apiV1.get('/citas/disponibilidad', { params }),
  getByPaciente: (id_paciente) => apiV1.get('/citas', { params: { id_paciente } }),
  getByMedico: (id_medico) => apiV1.get('/citas', { params: { id_medico } }),
  getByEstado: (estado) => apiV1.get('/citas', { params: { estado } }),
  getByFechas: (from, to) => apiV1.get('/citas', { params: { from, to } }),
};

// ============ PACIENTES (v1) ============
export const personasAPI = {
  create: (data) => apiV1.post('/pacientes', data),
  getAll: (params = {}) => apiV1.get('/pacientes', { params }),
  getById: (id) => apiV1.get(`/pacientes/${id}`),
  update: (id, data) => apiV1.put(`/pacientes/${id}`, data),
  delete: (id) => apiV1.delete(`/pacientes/${id}`),
  getByDocumento: (numero_documento) =>
    apiV1.get(`/pacientes/documento/${numero_documento}`),
};

// ============ MÉDICOS (v1) ============
export const medicosAPI = {
  create: (data) => apiV1.post('/medicos', data),
  getAll: (params = {}) => apiV1.get('/medicos', { params }),
  getById: (id) => apiV1.get(`/medicos/${id}`),
  asignarEspecialidad: (id_medico, id_especialidad) =>
    apiV1.post(`/medicos/${id_medico}/especialidades`, { id_especialidad }),
  removerEspecialidad: (id_medico, id_especialidad) =>
    apiV1.delete(`/medicos/${id_medico}/especialidades/${id_especialidad}`),
  asignarSede: (id_medico, id_sede) =>
    apiV1.post(`/medicos/${id_medico}/sedes`, { id_sede }),
  removerSede: (id_medico, id_sede) =>
    apiV1.delete(`/medicos/${id_medico}/sedes/${id_sede}`),
};

// ============ ESPECIALIDADES (v1) ============
export const especialidadesAPI = {
  create: (data) => apiV1.post('/especialidades', data),
  getAll: (params = {}) => apiV1.get('/especialidades', { params }),
  getById: (id) => apiV1.get(`/especialidades/${id}`),
  update: (id, data) => apiV1.put(`/especialidades/${id}`, data),
};

// ============ SEDES (v1) ============
export const sedesAPI = {
  create: (data) => apiV1.post('/sedes', data),
  getAll: (params = {}) => apiV1.get('/sedes', { params }),
  getById: (id) => apiV1.get(`/sedes/${id}`),
  update: (id, data) => apiV1.put(`/sedes/${id}`, data),
};

// ============ EMPLEADOS (v1, solo admin) ============
export const empleadosAPI = {
  create: (data) => apiV1.post('/empleados', data),
  getAll: (params = {}) => apiV1.get('/empleados', { params }),
  getById: (id) => apiV1.get(`/empleados/${id}`),
  desactivar: (id) => apiV1.post(`/empleados/${id}/desactivar`),
  reactivar: (id) => apiV1.post(`/empleados/${id}/reactivar`),
  reiniciarTour: (id, motivo) => apiV1.post(`/empleados/${id}/reiniciar-tour`, { motivo }),
};

// ============ ROLES (placeholder — gestionado en BD vía seed) ============
export const rolesAPI = {
  getAll: () => Promise.resolve({ data: { success: true, data: [
    { nombre: 'admin' }, { nombre: 'medico' }, { nombre: 'recepcionista' },
  ] } }),
};

// ============ HISTORIAS CLÍNICAS (v1) ============
export const historiasClinicasAPI = {
  create: (data) => apiV1.post('/historias-clinicas', data),
  getByPaciente: (id_paciente) => apiV1.get(`/historias-clinicas/paciente/${id_paciente}`),
  getById: (id) => apiV1.get(`/historias-clinicas/${id}`),
  update: (id, data) => apiV1.put(`/historias-clinicas/${id}`, data),
  exportPdf: (id) => apiV1.get(`/historias-clinicas/${id}/pdf`, { responseType: 'blob' }),
};

// ============ GAMIFICACIÓN (v1) ============
export const gamificacionAPI = {
  tour: () => apiV1.get('/gamificacion/tour'),
  miProgreso: () => apiV1.get('/gamificacion/mi-progreso'),
  visitar: (codigo) => apiV1.post('/gamificacion/visitar', { codigo }),
  resumen: () => apiV1.get('/gamificacion/resumen'), // solo admin
};

// ============ AUDIT (v1, solo admin) ============
export const auditAPI = {
  getAll: (params = {}) => apiV1.get('/audit', { params }),
};

export default apiV1;
