// Validación de formato vive en empleados.schema.js + validate middleware.
const { getSupabaseClient } = require('../../infrastructure/supabase');
const {
  ValidationError, NotFoundError, ConflictError, AppError,
} = require('../../shared/errors/AppError');

class EmpleadosService {
  constructor(empleadosRepository, eventBus = null) {
    this.repo = empleadosRepository;
    this.events = eventBus;
  }

  async listar({ soloActivos = false } = {}) {
    return await this.repo.findAll({ soloActivos });
  }

  async obtenerPorId(id) {
    const e = await this.repo.findById(id);
    if (!e) throw new NotFoundError('Empleado');
    return e;
  }

  /**
   * Flujo crítico (ADM-01):
   * 1. Valida datos
   * 2. Crea usuario en Supabase Auth (email + password)
   * 3. Crea persona + empleado en transacción con auth_uid
   * 4. El trigger de gamificación inicializa progreso automáticamente
   *
   * Si paso 3 falla, se elimina el usuario Auth para no dejar huérfanos.
   */
  async crear(datos, idEmpleadoCreador) {
    if (await this.repo.existeDocumento(datos.numero_documento)) {
      throw new ConflictError('El número de documento ya está registrado');
    }
    if (await this.repo.existeCorreo(datos.correo)) {
      throw new ConflictError('El correo ya está registrado');
    }

    const id_rol = await this.repo.getRolIdPorNombre(datos.rol);
    if (!id_rol) throw new ValidationError(`Rol inválido: ${datos.rol}`);

    // 1. Crear usuario Auth
    const supabase = getSupabaseClient();
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: datos.correo,
      password: datos.password,
      email_confirm: true,
    });
    if (authErr) throw new AppError(authErr.message, 400, 'AUTH_CREATE_FAILED');
    const auth_uid = authData.user.id;

    // 2. Crear persona + empleado
    try {
      const { id_persona, id_empleado } = await this.repo.crearPersonaYEmpleado({
        personaData: {
          tipo_documento: datos.tipo_documento,
          numero_documento: datos.numero_documento,
          nombres: datos.nombres,
          apellidos: datos.apellidos,
          fecha_nacimiento: datos.fecha_nacimiento,
          telefono: datos.telefono,
          correo: datos.correo,
          direccion: datos.direccion,
        },
        id_rol,
        auth_uid,
        createdBy: idEmpleadoCreador,
      });
      const empleado = await this.repo.findById(id_empleado);
      this.events?.emit('empleado.created', { empleado, creadoPor: idEmpleadoCreador });
      return empleado;
    } catch (e) {
      // Rollback Auth si falló la inserción
      await supabase.auth.admin.deleteUser(auth_uid).catch(() => {});
      throw e;
    }
  }

  async desactivar(idEmpleado) {
    const ok = await this.repo.setActivo(idEmpleado, false);
    if (!ok) throw new NotFoundError('Empleado');
    this.events?.emit('empleado.desactivado', { idEmpleado });
  }

  async reactivar(idEmpleado) {
    const ok = await this.repo.setActivo(idEmpleado, true);
    if (!ok) throw new NotFoundError('Empleado');
  }

  async reiniciarTour(idEmpleado, activadoPor, motivo) {
    const e = await this.repo.findById(idEmpleado);
    if (!e) throw new NotFoundError('Empleado');
    await this.repo.reiniciarTour(idEmpleado, activadoPor, motivo);
    this.events?.emit('tour.reiniciado', { idEmpleado, activadoPor, motivo });
  }
}

module.exports = EmpleadosService;
