const express = require('express');
const { requireAuth } = require('../../shared/middleware/auth.middleware');
const { authRateLimit } = require('../../shared/middleware/rateLimit.middleware');
const AuthService = require('./auth.service');
const AuthController = require('./auth.controller');

function createAuthRouter() {
  const router = express.Router();
  const controller = new AuthController(new AuthService());

  router.post('/login', authRateLimit, controller.login);
  router.post('/recuperar-password', authRateLimit, controller.recuperarPassword);

  // Protegidas
  router.get('/profile', requireAuth, controller.profile);
  router.get('/uid', requireAuth, controller.uid);
  router.post('/register', requireAuth, controller.register);
  router.post('/tour-completado', requireAuth, controller.marcarTourCompletado);

  return router;
}

module.exports = createAuthRouter;
