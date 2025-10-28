const supabase = require('../config/supabase');

// Crear una nueva especialidad
exports.createEspecialidad = async (req, res) => {
    try {
        const { nombre, descripcion, activa } = req.body;
        
        if (!nombre) {
            return res.status(400).json({ error: 'El nombre es requerido' });
        }

        const { data, error } = await supabase
            .from('especialidades')
            .insert([{ nombre, descripcion, activa }])
            .select()
            .single();

        if (error) throw error;
        res.status(201).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Listar todas las especialidades
exports.listEspecialidades = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('especialidades')
            .select('*');

        if (error) throw error;
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Obtener una especialidad por ID
exports.getEspecialidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('especialidades')
            .select('*')
            .eq('id_especialidad', id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Especialidad no encontrada' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Actualizar una especialidad
exports.updateEspecialidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, activa } = req.body;

        const { data, error } = await supabase
            .from('especialidades')
            .update({ nombre, descripcion, activa })
            .eq('id_especialidad', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({ error: 'Especialidad no encontrada' });
        }
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Eliminar una especialidad
exports.deleteEspecialidad = async (req, res) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('especialidades')
            .delete()
            .eq('id_especialidad', id);

        if (error) throw error;
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};