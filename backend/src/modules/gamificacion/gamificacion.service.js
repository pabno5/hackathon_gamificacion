const { NotFoundError, ForbiddenError } = require('../../shared/errors/AppError');
const TourFactory = require('./tour.factory');

class GamificacionService {
  constructor(gamificacionRepository, eventBus = null) {
    this.repo = gamificacionRepository;
    this.events = eventBus;
  }

  /** Pasos del tour para el rol del empleado autenticado. */
  async tourDelRol(rol) {
    const features = await this.repo.featuresPorRol(rol);
    return TourFactory.crearPasos(features);
  }

  /** Progreso propio: detalle + resumen. */
  async miProgreso(idEmpleado) {
    const detalle = await this.repo.progresoDetalle(idEmpleado);
    const resumen = await this.#resumen(idEmpleado);
    return { resumen, detalle };
  }

  /**
   * Marca una feature como visitada (idempotente).
   * Valida que la feature pertenezca al rol del empleado.
   * Si llega a 100%, completa la sesión de tour y emite evento.
   */
  async marcarVisitada(idEmpleado, rol, codigoFeature) {
    const feature = await this.repo.findFeaturePorCodigo(codigoFeature);
    if (!feature) throw new NotFoundError('Feature');
    if (feature.rol !== rol) {
      throw new ForbiddenError('Esta feature no pertenece a tu rol');
    }

    const progreso = await this.repo.findProgreso(idEmpleado, feature.id_feature);
    if (!progreso) throw new NotFoundError('Progreso del empleado');

    if (!progreso.visitada) {
      await this.repo.marcarVisitada(idEmpleado, feature.id_feature);
    }

    const resumen = await this.#resumen(idEmpleado);

    if (resumen.porcentaje === 100 && !progreso.visitada) {
      await this.repo.completarSesionTour(idEmpleado);
      this.events?.emit('tour.completado', { idEmpleado, resumen });
    }

    return resumen;
  }

  /** Dashboard admin (GAM-07/ADM-04). */
  async resumenTodos() {
    return await this.repo.resumenTodos();
  }

  async #resumen(idEmpleado) {
    const { total, visitadas } = await this.repo.contarProgreso(idEmpleado);
    return {
      total,
      visitadas,
      porcentaje: total > 0 ? Math.round((visitadas / total) * 100) : 0,
    };
  }
}

module.exports = GamificacionService;
