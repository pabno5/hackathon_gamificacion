const express = require('express');
const router = express.Router();
const { getDashboardData, getUsersList } = require('../controller/employeeController');
const { verifyToken, verifyAdminOrEmployee } = require('../utils/authMiddleware');

// Todas estas rutas requieren autenticación y rol de administrador o empleado
router.use(verifyToken);
router.use(verifyAdminOrEmployee);

// Rutas accesibles por administradores y empleados
router.get('/dashboard', getDashboardData);
router.get('/users-list', getUsersList);

module.exports = router;



