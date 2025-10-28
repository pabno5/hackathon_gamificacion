const express = require('express');
const router = express.Router();
const { supabase } = require('../db');

// Helpers
const handleSupabaseError = (res, error) => {
  console.error('Supabase error:', error);
  return res.status(500).json({ success: false, error: error.message || error });
};

const isUUID = (v) => {
  if (!v || typeof v !== 'string') return false;
  const re = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return re.test(v);
};

// Create a new cita
router.post('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, fecha_cita, motivo, estado, observaciones } = req.body;
    if (!id_paciente || !id_medico || !fecha_cita) {
      return res.status(400).json({ success: false, error: 'id_paciente, id_medico y fecha_cita son obligatorios' });
    }
    if (!isUUID(id_paciente) || !isUUID(id_medico)) {
      return res.status(400).json({ success: false, error: 'id_paciente e id_medico deben ser UUID válidos' });
    }

    const payload = {
      id_paciente,
      id_medico,
      fecha_cita,
      motivo: motivo || null,
      estado: estado || 'pendiente',
      observaciones: observaciones || null
    };

    const { data, error } = await supabase.from('citas').insert([payload]).select().single();
    if (error) return handleSupabaseError(res, error);

    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// List citas (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { id_paciente, id_medico, estado, from, to, limit, offset } = req.query;
    let query = supabase.from('citas').select('*');

    if (id_paciente) {
      if (!isUUID(id_paciente)) return res.status(400).json({ success: false, error: 'id_paciente debe ser un UUID válido' });
      query = query.eq('id_paciente', id_paciente);
    }
    if (id_medico) {
      if (!isUUID(id_medico)) return res.status(400).json({ success: false, error: 'id_medico debe ser un UUID válido' });
      query = query.eq('id_medico', id_medico);
    }
    if (estado) query = query.eq('estado', estado);
    if (from) query = query.gte('fecha_cita', from);
    if (to) query = query.lte('fecha_cita', to);
    if (limit) query = query.limit(parseInt(limit, 10));
    if (offset) query = query.range(parseInt(offset, 10), parseInt(offset, 10) + (parseInt(limit || '100', 10) - 1));

    const { data, error } = await query.order('fecha_cita', { ascending: true });
    if (error) return handleSupabaseError(res, error);

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Get single cita
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'id debe ser un UUID válido' });
    const { data, error } = await supabase.from('citas').select('*').eq('id_cita', id).single();
    if (error) {
      // Supabase may return an error when no rows found; normalize to 404
      return res.status(404).json({ success: false, error: 'Cita no encontrada' });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Update cita
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'id debe ser un UUID válido' });
    const updates = req.body;
    // Prevent changing primary key
    delete updates.id_cita;

    // If updating foreign keys, validate UUID format
    if (updates.id_paciente && !isUUID(updates.id_paciente)) return res.status(400).json({ success: false, error: 'id_paciente debe ser UUID válido' });
    if (updates.id_medico && !isUUID(updates.id_medico)) return res.status(400).json({ success: false, error: 'id_medico debe ser UUID válido' });

    const { data, error } = await supabase.from('citas').update(updates).eq('id_cita', id).select().single();
    if (error) return handleSupabaseError(res, error);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Delete cita
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'id debe ser un UUID válido' });
    const { data, error } = await supabase.from('citas').delete().eq('id_cita', id).select().single();
    if (error) return handleSupabaseError(res, error);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
