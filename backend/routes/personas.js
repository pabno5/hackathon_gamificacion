const express = require('express');
const router = express.Router();
const { supabase } = require('../db');



// Delegate to controller
const controller = require('../controllers/personasController');

router.post('/', controller.createPersona);
router.post('/test', controller.createPersonaTest);
router.get('/', controller.listPersonas);
router.get('/:id', controller.getPersona);
router.put('/:id', controller.updatePersona);
router.delete('/:id', controller.deletePersona);

module.exports = router;