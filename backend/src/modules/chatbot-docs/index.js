const express = require('express');
const multer = require('multer');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { requireRol } = require('../../shared/middleware/role.middleware');
const asyncHandler = require('../../shared/utils/asyncHandler');
const ApiResponse = require('../../shared/response/ApiResponse');
const { AppError, ValidationError } = require('../../shared/errors/AppError');

const CHATBOT_URL = process.env.CHATBOT_URL || 'http://localhost:8000';
const CHATBOT_INTERNAL_SECRET = process.env.CHATBOT_INTERNAL_SECRET;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new ValidationError('Solo se permiten archivos PDF'));
    }
    cb(null, true);
  },
});

/**
 * Proxy admin-only hacia el servicio Python del chatbot (puerto 8000).
 * El chatbot no conoce usuarios/roles: solo confía en CHATBOT_INTERNAL_SECRET,
 * por eso la validación real de "es admin" ocurre aquí con requireRol('admin').
 */
function createChatbotDocsModule() {
  const router = express.Router();
  router.use(requireAuth, requireRol('admin'));

  router.get('/', asyncHandler(async (_req, res) => {
    const resp = await fetch(`${CHATBOT_URL}/admin/documentos`, {
      headers: { 'X-Internal-Secret': CHATBOT_INTERNAL_SECRET },
    });
    if (!resp.ok) {
      throw new AppError('No se pudo consultar el servicio del chatbot', 502, 'CHATBOT_UNAVAILABLE');
    }
    const data = await resp.json();
    res.json(ApiResponse.success(data.documentos || []));
  }));

  router.post('/', upload.single('file'), asyncHandler(async (req, res) => {
    if (!req.file) throw new ValidationError('Debes adjuntar un archivo PDF');

    const form = new FormData();
    form.append('file', new Blob([req.file.buffer], { type: 'application/pdf' }), req.file.originalname);

    const resp = await fetch(`${CHATBOT_URL}/admin/documentos`, {
      method: 'POST',
      headers: { 'X-Internal-Secret': CHATBOT_INTERNAL_SECRET },
      body: form,
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new AppError(data.detail || 'No se pudo procesar el PDF', 502, 'CHATBOT_UPLOAD_FAILED');
    }
    res.status(201).json(ApiResponse.success(data, 'Documento indexado correctamente'));
  }));

  router.delete('/:archivo', asyncHandler(async (req, res) => {
    const resp = await fetch(`${CHATBOT_URL}/admin/documentos/${encodeURIComponent(req.params.archivo)}`, {
      method: 'DELETE',
      headers: { 'X-Internal-Secret': CHATBOT_INTERNAL_SECRET },
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new AppError(data.detail || 'No se pudo eliminar el documento', resp.status === 404 ? 404 : 502, 'CHATBOT_DELETE_FAILED');
    }
    res.json(ApiResponse.success(data));
  }));

  return router;
}

module.exports = createChatbotDocsModule;
