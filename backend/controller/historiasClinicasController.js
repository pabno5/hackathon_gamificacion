const { query } = require('../config/dataconnect');

// Crear una nueva historia clínica
const createHistoriaClinica = async (req, res) => {
  try {
    const {
      id_paciente,
      motivo_consulta,
      enfermedad_actual,
      antecedentes_patologicos,
      antecedentes_quirurgicos,
      alergias,
      antecedentes_traumaticos,
      antecedentes_farmacologicos,
      antecedentes_gineco_obstetricos,
      habitos,
      antecedentes_familiares,
      revision_general,
      revision_cardiovascular,
      revision_respiratorio,
      revision_digestivo,
      revision_urinario,
      revision_nervioso,
      revision_musculo_esqueletico,
      revision_sensorial,
      tension_arterial,
      frecuencia_cardiaca,
      frecuencia_respiratoria,
      temperatura,
      peso,
      talla,
      exploracion_sistemas,
      agudeza_visual,
      fondo_ojo,
      reflejos_pupilares,
      diagnostico_principal,
      diagnostico_secundario,
      medicamentos_recetados,
      indicaciones_paciente,
      recomendaciones,
      interconsultas_examenes,
      evolucion_seguimiento
    } = req.body;

    // Validaciones
    if (!id_paciente) {
      return res.status(400).json({
        success: false,
        message: 'El ID del paciente es requerido'
      });
    }

    // Verificar que el paciente existe
    const pacienteExists = await query(
      'SELECT id_persona FROM personas WHERE id_persona = $1',
      [id_paciente]
    );

    if (pacienteExists.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El paciente no existe'
      });
    }

    // Insertar la historia clínica (todos los campos opcionales)
    const result = await query(
      `INSERT INTO historias_clinicas (
        id_paciente, motivo_consulta, enfermedad_actual,
        antecedentes_patologicos, antecedentes_quirurgicos, alergias,
        antecedentes_traumaticos, antecedentes_farmacologicos,
        antecedentes_gineco_obstetricos, habitos, antecedentes_familiares,
        revision_general, revision_cardiovascular, revision_respiratorio,
        revision_digestivo, revision_urinario, revision_nervioso,
        revision_musculo_esqueletico, revision_sensorial,
        tension_arterial, frecuencia_cardiaca, frecuencia_respiratoria,
        temperatura, peso, talla, exploracion_sistemas, agudeza_visual,
        fondo_ojo, reflejos_pupilares, diagnostico_principal,
        diagnostico_secundario, medicamentos_recetados, indicaciones_paciente,
        recomendaciones, interconsultas_examenes, evolucion_seguimiento
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28,
        $29, $30, $31, $32, $33, $34, $35, $36
      ) RETURNING *`,
      [
        id_paciente,
        motivo_consulta || null,
        enfermedad_actual || null,
        antecedentes_patologicos || null,
        antecedentes_quirurgicos || null,
        alergias || null,
        antecedentes_traumaticos || null,
        antecedentes_farmacologicos || null,
        antecedentes_gineco_obstetricos || null,
        habitos || null,
        antecedentes_familiares || null,
        revision_general || null,
        revision_cardiovascular || null,
        revision_respiratorio || null,
        revision_digestivo || null,
        revision_urinario || null,
        revision_nervioso || null,
        revision_musculo_esqueletico || null,
        revision_sensorial || null,
        tension_arterial || null,
        frecuencia_cardiaca || null,
        frecuencia_respiratoria || null,
        temperatura || null,
        peso || null,
        talla || null,
        exploracion_sistemas || null,
        agudeza_visual || null,
        fondo_ojo || null,
        reflejos_pupilares || null,
        diagnostico_principal || null,
        diagnostico_secundario || null,
        medicamentos_recetados || null,
        indicaciones_paciente || null,
        recomendaciones || null,
        interconsultas_examenes || null,
        evolucion_seguimiento || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Historia clínica creada exitosamente',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al crear historia clínica:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear historia clínica',
      error: error.message
    });
  }
};

// Obtener historias clínicas de un paciente
const getHistoriasClinicasByPaciente = async (req, res) => {
  try {
    const { id_paciente } = req.params;

    if (!id_paciente) {
      return res.status(400).json({
        success: false,
        message: 'ID del paciente es requerido'
      });
    }

    // Buscar historias clínicas del paciente
    const result = await query(
      `SELECT 
        hc.*, 
        p.nombres, p.apellidos, p.tipo_documento, p.numero_documento,
        p.fecha_nacimiento, p.sexo, p.direccion, p.telefono
       FROM historias_clinicas hc
       JOIN personas p ON hc.id_paciente = p.id_persona
       WHERE hc.id_paciente = $1
       ORDER BY hc.fecha_creacion DESC`,
      [id_paciente]
    );

    return res.status(200).json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('Error al obtener historias clínicas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historias clínicas',
      error: error.message
    });
  }
};

// Obtener una historia clínica por ID
const getHistoriaClinicaById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT 
        hc.*, 
        p.nombres, p.apellidos, p.tipo_documento, p.numero_documento,
        p.fecha_nacimiento, p.sexo, p.direccion, p.telefono
       FROM historias_clinicas hc
       JOIN personas p ON hc.id_paciente = p.id_persona
       WHERE hc.id_historia_clinica = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Historia clínica no encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error al obtener historia clínica:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener historia clínica',
      error: error.message
    });
  }
};

module.exports = {
  createHistoriaClinica,
  getHistoriasClinicasByPaciente,
  getHistoriaClinicaById
};