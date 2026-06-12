const {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} = require('../../shared/errors/AppError');

// Campos médicos sensibles: solo médico/admin los ve.
// Recepcionista (HC-05) solo puede ver identificación + motivo de consulta.
const CAMPOS_RESTRINGIDOS_RECEPCIONISTA = new Set([
  'enfermedad_actual',
  'antecedentes_patologicos', 'antecedentes_quirurgicos', 'alergias',
  'antecedentes_traumaticos', 'antecedentes_farmacologicos',
  'antecedentes_gineco_obstetricos', 'habitos', 'antecedentes_familiares',
  'revision_general', 'revision_cardiovascular', 'revision_respiratorio',
  'revision_digestivo', 'revision_urinario', 'revision_nervioso',
  'revision_musculo_esqueletico', 'revision_sensorial',
  'tension_arterial', 'frecuencia_cardiaca', 'frecuencia_respiratoria',
  'temperatura', 'peso', 'talla', 'exploracion_sistemas',
  'agudeza_visual', 'fondo_ojo', 'reflejos_pupilares',
  'diagnostico_principal', 'diagnostico_secundario',
  'medicamentos_recetados', 'indicaciones_paciente', 'recomendaciones',
  'interconsultas_examenes', 'evolucion_seguimiento',
]);

class HistoriasService {
  constructor(historiasRepository) {
    this.repo = historiasRepository;
  }

  /** Filtra campos sensibles si el rol es recepcionista. */
  filtrarPorRol(historia, rol) {
    if (!historia) return historia;
    if (rol !== 'recepcionista') return historia;
    const out = { ...historia };
    for (const k of CAMPOS_RESTRINGIDOS_RECEPCIONISTA) delete out[k];
    return out;
  }

  async obtenerPorId(id, rol) {
    const h = await this.repo.findById(id);
    if (!h) throw new NotFoundError('Historia clínica');
    return this.filtrarPorRol(h, rol);
  }

  async listarPorPaciente(idPaciente, rol) {
    if (!idPaciente) throw new ValidationError('id_paciente requerido');
    const lista = await this.repo.findByPaciente(idPaciente);
    return lista.map((h) => this.filtrarPorRol(h, rol));
  }

  async crear(datos, rol, idEmpleadoCreador) {
    if (rol === 'recepcionista') {
      throw new ForbiddenError('Recepcionista no puede crear historias clínicas');
    }
    if (!datos.id_paciente) throw new ValidationError('id_paciente es requerido');

    return await this.repo.create(datos, idEmpleadoCreador);
  }

  async actualizar(id, datos, rol, idEmpleado) {
    if (rol === 'recepcionista') {
      throw new ForbiddenError('Recepcionista no puede editar historias clínicas');
    }
    const existente = await this.repo.findById(id);
    if (!existente) throw new NotFoundError('Historia clínica');

    const actualizada = await this.repo.update(id, datos, idEmpleado);
    if (!actualizada) throw new NotFoundError('Historia clínica');
    return actualizada;
  }
}

module.exports = HistoriasService;
