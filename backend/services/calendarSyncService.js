/**
 * Servicio de sincronización automática de Google Calendar
 * Ejecuta sincronizaciones periódicas en segundo plano
 */

const cron = require('node-cron');
const { syncFromGoogleCalendar, isConfigured } = require('../config/googleCalendar');
const { query } = require('../config/dataconnect');

class CalendarSyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = null;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      eventsCreated: 0
    };
  }

  /**
   * Iniciar sincronización automática
   * @param {string} cronExpression - Expresión cron (por defecto: cada 5 minutos)
   */
  start(cronExpression = '*/5 * * * *') {
    if (!isConfigured()) {
      console.log('⚠️  Google Calendar no configurado. Sincronización automática deshabilitada.');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️  El servicio de sincronización ya está en ejecución.');
      return;
    }

    console.log('🔄 Iniciando servicio de sincronización automática de Google Calendar...');
    console.log(`⏰ Frecuencia: ${this.getCronDescription(cronExpression)}`);

    this.syncInterval = cron.schedule(cronExpression, async () => {
      await this.performSync();
    });

    this.isRunning = true;
    console.log('✅ Servicio de sincronización iniciado correctamente\n');

    // Ejecutar una sincronización inicial
    setTimeout(() => this.performSync(), 5000); // 5 segundos después de iniciar
  }

  /**
   * Detener sincronización automática
   */
  stop() {
    if (this.syncInterval) {
      this.syncInterval.stop();
      this.syncInterval = null;
      this.isRunning = false;
      console.log('🛑 Servicio de sincronización detenido');
    }
  }

  /**
   * Ejecutar sincronización
   */
  async performSync() {
    if (!isConfigured()) {
      return;
    }

    const syncStartTime = new Date();
    console.log(`\n🔄 [${syncStartTime.toISOString()}] Iniciando sincronización automática...`);

    try {
      this.syncStats.totalSyncs++;

      // Sincronizar eventos de los próximos 30 días
      const now = new Date();
      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const events = await syncFromGoogleCalendar(now, futureDate);

      if (events.length === 0) {
        console.log('   ℹ️  No hay eventos nuevos para sincronizar');
        this.syncStats.successfulSyncs++;
        this.lastSyncTime = syncStartTime;
        return;
      }

      let createdCount = 0;

      // Procesar cada evento
      for (const event of events) {
        try {
          // Verificar si ya existe
          const eventId = event.id;
          const existingCita = await query(
            'SELECT id_cita FROM citas WHERE google_calendar_event_id = $1',
            [eventId]
          );

          if (existingCita.rows.length > 0) {
            // Ya existe, saltar
            continue;
          }

          // Extraer datos del evento
          const startDate = event.start.dateTime || event.start.date;
          const summary = event.summary || 'Cita desde Google Calendar';
          const description = event.description || '';

          // Extraer IDs de paciente y médico desde extendedProperties si existen
          const extProps = event.extendedProperties?.private || {};
          const idPaciente = extProps.idPaciente || await this.getDefaultPacienteId();
          const idMedico = extProps.idMedico || await this.getDefaultMedicoId();

          if (!idPaciente || !idMedico) {
            console.log(`   ⚠️  Evento "${summary}" omitido: No hay paciente/médico por defecto configurado`);
            continue;
          }

          // Crear la cita en la base de datos
          const result = await query(
            `INSERT INTO citas (
              id_paciente, id_medico, fecha_cita, motivo, estado, observaciones, google_calendar_event_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *`,
            [
              idPaciente,
              idMedico,
              startDate,
              summary,
              event.status === 'cancelled' ? 'cancelada' : 'programada',
              description,
              eventId
            ]
          );

          createdCount++;
          this.syncStats.eventsCreated++;
          console.log(`   ✅ Cita creada desde Google Calendar: "${summary}"`);

        } catch (eventError) {
          console.error(`   ❌ Error al procesar evento: ${eventError.message}`);
        }
      }

      this.syncStats.successfulSyncs++;
      this.lastSyncTime = syncStartTime;

      const duration = new Date() - syncStartTime;
      console.log(`   ✅ Sincronización completada en ${duration}ms`);
      console.log(`   📊 Eventos procesados: ${events.length}, Creados: ${createdCount}\n`);

    } catch (error) {
      this.syncStats.failedSyncs++;
      console.error(`   ❌ Error en sincronización: ${error.message}\n`);
    }
  }

  /**
   * Obtener ID de paciente por defecto
   */
  async getDefaultPacienteId() {
    try {
      const result = await query(
        'SELECT id_persona FROM personas LIMIT 1',
        []
      );
      return result.rows.length > 0 ? result.rows[0].id_persona : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener ID de médico por defecto
   */
  async getDefaultMedicoId() {
    try {
      const result = await query(
        'SELECT id_medico FROM medicos LIMIT 1',
        []
      );
      return result.rows.length > 0 ? result.rows[0].id_medico : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener estadísticas de sincronización
   */
  getStats() {
    return {
      ...this.syncStats,
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime
    };
  }

  /**
   * Obtener descripción legible de la expresión cron
   */
  getCronDescription(cronExpression) {
    const descriptions = {
      '*/5 * * * *': 'Cada 5 minutos',
      '*/10 * * * *': 'Cada 10 minutos',
      '*/15 * * * *': 'Cada 15 minutos',
      '*/30 * * * *': 'Cada 30 minutos',
      '0 * * * *': 'Cada hora',
      '0 */2 * * *': 'Cada 2 horas',
      '0 */6 * * *': 'Cada 6 horas',
      '0 0 * * *': 'Una vez al día (medianoche)',
    };
    return descriptions[cronExpression] || cronExpression;
  }
}

// Exportar instancia única (singleton)
const calendarSyncService = new CalendarSyncService();

module.exports = calendarSyncService;

