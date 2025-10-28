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

// Validations
const validatePersona = (data) => {
  const { tipo_documento, numero_documento, nombres, apellidos } = data;
  const errors = [];
  if (!tipo_documento) errors.push('tipo_documento es requerido');
  if (!numero_documento) errors.push('numero_documento es requerido');
  if (!nombres) errors.push('nombres es requerido');
  if (!apellidos) errors.push('apellidos es requerido');
  if (errors.length > 0) return { isValid: false, errors };
  return { isValid: true };
};

const validateCredenciales = (data) => {
  const { usuario, contrasena_hash, id_rol } = data;
  const errors = [];
  if (!usuario) errors.push('usuario es requerido');
  if (!contrasena_hash) errors.push('contrasena_hash es requerido');
  if (!id_rol || !isUUID(id_rol)) errors.push('id_rol debe ser un UUID válido');
  if (errors.length > 0) return { isValid: false, errors };
  return { isValid: true };
};

// Controller functions: accept (req,res)
const createPersona = async (req, res) => {
  try {
    const personaData = req.body;
    const credencialesData = req.body.credenciales;

    const personaValidation = validatePersona(personaData);
    if (!personaValidation.isValid) {
      return res.status(400).json({ success: false, error: 'Datos de persona inválidos', details: personaValidation.errors });
    }

    if (credencialesData) {
      const credValidation = validateCredenciales(credencialesData);
      if (!credValidation.isValid) return res.status(400).json({ success: false, error: 'Datos de credenciales inválidos', details: credValidation.errors });
    }

    const { data: persona, error: personaError } = await supabase.from('personas').insert([{
      tipo_documento: personaData.tipo_documento,
      numero_documento: personaData.numero_documento,
      nombres: personaData.nombres,
      apellidos: personaData.apellidos,
      fecha_nacimiento: personaData.fecha_nacimiento,
      telefono: personaData.telefono,
      correo: personaData.correo,
      direccion: personaData.direccion
    }]).select().single();

    if (personaError) return handleSupabaseError(res, personaError);

    if (credencialesData && persona) {
      const { error: credError } = await supabase.from('credenciales').insert([{
        id_persona: persona.id_persona,
        id_rol: credencialesData.id_rol,
        usuario: credencialesData.usuario,
        contrasena_hash: credencialesData.contrasena_hash
      }]);
      if (credError) return handleSupabaseError(res, credError);
    }

    return res.status(201).json({ success: true, data: persona });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const createPersonaTest = async (req, res) => {
  try {
    const sample = {
      tipo_documento: 'CC',
      numero_documento: `PRUEBA-${Date.now()}`,
      nombres: 'Persona',
      apellidos: 'Prueba',
      fecha_nacimiento: '1990-01-01',
      telefono: '3000000000',
      correo: `prueba+${Date.now()}@example.com`,
      direccion: 'Calle de prueba 123'
    };
    const { data, error } = await supabase.from('personas').insert([sample]).select().single();
    if (error) return handleSupabaseError(res, error);
    return res.status(201).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const listPersonas = async (req, res) => {
  try {
    const { tipo_documento, numero_documento, nombres, apellidos, includeCredentials, limit, offset } = req.query;
    let query = supabase.from('personas').select(`*${includeCredentials ? ',credenciales(*)' : ''}`);
    if (tipo_documento) query = query.eq('tipo_documento', tipo_documento);
    if (numero_documento) query = query.eq('numero_documento', numero_documento);
    if (nombres) query = query.ilike('nombres', `%${nombres}%`);
    if (apellidos) query = query.ilike('apellidos', `%${apellidos}%`);
    if (limit) query = query.limit(parseInt(limit, 10));
    if (offset) query = query.range(parseInt(offset, 10), parseInt(offset, 10) + (parseInt(limit || '100', 10) - 1));
    const { data, error } = await query;
    if (error) return handleSupabaseError(res, error);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const getPersona = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
    const { includeCredentials } = req.query;
    const { data, error } = await supabase.from('personas').select(`*${includeCredentials ? ',credenciales(*)' : ''}`).eq('id_persona', id).single();
    if (error) return res.status(404).json({ success: false, error: 'Persona no encontrada' });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const updatePersona = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
    const updates = req.body;
    delete updates.id_persona;
    delete updates.fecha_registro;
    const validation = validatePersona(updates);
    if (!validation.isValid) return res.status(400).json({ success: false, error: 'Datos inválidos', details: validation.errors });
    const { data, error } = await supabase.from('personas').update(updates).eq('id_persona', id).select().single();
    if (error) return handleSupabaseError(res, error);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

const deletePersona = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isUUID(id)) return res.status(400).json({ success: false, error: 'ID inválido' });
    const { data, error } = await supabase.from('personas').delete().eq('id_persona', id).select().single();
    if (error) return handleSupabaseError(res, error);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

module.exports = {
  createPersona,
  createPersonaTest,
  listPersonas,
  getPersona,
  updatePersona,
  deletePersona
};
