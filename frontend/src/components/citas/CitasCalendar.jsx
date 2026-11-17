import { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { citasAPI, personasAPI, medicosAPI, sedesAPI } from '../../service/api';
import { notifyClick } from '../../lib/progressTracker';
import CitaModal from './CitaModal';
import './CitasCalendar.css';

moment.locale('es');
const localizer = momentLocalizer(moment);

const CitasCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedCita, setSelectedCita] = useState(null);
  const [medicos, setMedicos] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [currentView, setCurrentView] = useState('month');
  const [currentDate, setCurrentDate] = useState(new Date());

  // Cargar citas del backend
  const loadCitas = useCallback(async () => {
    try {
      setLoading(true);
      // getTodas recorre la paginación: getAll() solo traía las 20 citas más
      // recientes y el resto no aparecía en el calendario.
      const response = await citasAPI.getTodas();

      if (response.data.success) {
        // Transformar citas a formato de eventos del calendario
        const citasEvents = response.data.data.map(cita => {
          const start = new Date(cita.fecha_cita);
          // Fin real de la cita (hora_fin); +30 min solo si no viene.
          const end = cita.fecha_fin
            ? new Date(cita.fecha_fin)
            : new Date(start.getTime() + 30 * 60 * 1000);
          return {
            id: cita.id_cita,
            title: `${cita.motivo || 'Cita médica'}`,
            start,
            end,
            resource: cita,
            estado: cita.estado,
          };
        });
        
        setEvents(citasEvents);
      }
    } catch (error) {
      console.error('Error al cargar citas:', error);
      alert('Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar médicos y pacientes
  const loadData = useCallback(async () => {
    try {
      const [medicosRes, personasRes, sedesRes] = await Promise.all([
        medicosAPI.getAll(),
        personasAPI.getTodos(), // todas las páginas: el selector solo mostraba 20 pacientes
        sedesAPI.getAll({ activas: 'true' })
      ]);

      if (medicosRes.data.success) {
        setMedicos(medicosRes.data.data);
      }

      if (personasRes.data.success) {
        setPacientes(personasRes.data.data);
      }

      if (sedesRes.data.success) {
        setSedes(sedesRes.data.data);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    }
  }, []);

  useEffect(() => {
    loadCitas();
    loadData();
  }, [loadCitas, loadData]);

  // Handler para seleccionar un slot (crear nueva cita)
  const handleSelectSlot = ({ start, end }) => {
    setSelectedCita({
      fecha_cita: start,
      estado: 'pendiente',
    });
    setShowModal(true);
  };

  // Handler para seleccionar un evento (editar cita)
  const handleSelectEvent = (event) => {
    setSelectedCita(event.resource);
    setShowModal(true);
  };

  // Handler para guardar cita (con soporte para archivos)
  const handleSaveCita = async (citaData, file = null) => {
    try {
      if (selectedCita?.id_cita) {
        // Elegir "Cancelada" en el selector de estado es cancelar la cita: se pide
        // el motivo (CIT-10) igual que con el botón de cancelar. El backend
        // rechaza una cancelación sin motivo.
        if (citaData.estado === 'cancelada' && selectedCita.estado !== 'cancelada') {
          await handleDeleteCita(selectedCita.id_cita);
          return;
        }
        // Actualizar (sin soporte de archivo por ahora)
        const response = await citasAPI.update(selectedCita.id_cita, citaData);
        if (response.data.success) {
          alert('Cita actualizada exitosamente');
          loadCitas();
        }
      } else {
        // Crear nueva (con soporte de archivo)
        const response = await citasAPI.create(citaData, file);
        if (response.data.success) {
          const mensaje = file
            ? 'Cita creada exitosamente con documento adjunto'
            : 'Cita creada exitosamente';
          alert(mensaje);

          // Gamificación: agendar presencial (R-04) o callcenter (R-05)
          try {
            notifyClick(citaData.canal === 'telefonico' ? 'R-05' : 'R-04');
          } catch { /* noop */ }

          loadCitas();
        }
      }
      setShowModal(false);
      setSelectedCita(null);
    } catch (error) {
      console.error('Error al guardar cita:', error);
      // `data.error` es un objeto { code, message }: mostrarlo directo daba "[object Object]".
      alert(error.response?.data?.message || 'Error al guardar la cita');
    }
  };

  // Handler para cancelar cita — motivo obligatorio (CIT-10)
  const handleDeleteCita = async (id_cita) => {
    const motivo = window.prompt('Motivo de la cancelación (obligatorio):');
    if (motivo === null) return; // usuario canceló el diálogo
    if (!motivo || motivo.trim().length < 3) {
      alert('El motivo de cancelación es obligatorio (mínimo 3 caracteres).');
      return;
    }

    try {
      const response = await citasAPI.cancelar(id_cita, motivo.trim());
      if (response.data.success) {
        alert('Cita cancelada exitosamente');

        // Gamificación: cancelar cita con motivo (R-07)
        try { notifyClick('R-07'); } catch { /* noop */ }

        loadCitas();
        setShowModal(false);
        setSelectedCita(null);
      }
    } catch (error) {
      console.error('Error al cancelar cita:', error);
      alert(error.response?.data?.message || 'Error al cancelar la cita');
    }
  };

  // Estilos personalizados según el estado
  const eventStyleGetter = (event) => {
    let backgroundColor = '#3174ad';
    
    switch (event.estado) {
      case 'pendiente':
        backgroundColor = '#ffc107';
        break;
      case 'confirmada':
        backgroundColor = '#28a745';
        break;
      case 'cancelada':
        backgroundColor = '#dc3545';
        break;
      case 'completada':
        backgroundColor = '#6c757d';
        break;
      default:
        backgroundColor = '#3174ad';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '5px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Cita',
    noEventsInRange: 'No hay citas en este rango',
    showMore: (total) => `+ Ver más (${total})`,
    work_week: 'Semana laboral',
    yesterday: 'Ayer',
    tomorrow: 'Mañana'
  };

  // Configuración de horario para vista de día/semana
  const min = new Date();
  min.setHours(7, 0, 0); // Inicio a las 7:00 AM
  
  const max = new Date();
  max.setHours(20, 0, 0); // Fin a las 8:00 PM

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando citas...</p>
      </div>
    );
  }

  return (
    <div className="citas-calendar-container">
      <div className="calendar-header">
        <h2>Gestión de Citas Médicas</h2>
        <button 
          className="btn-nueva-cita"
          onClick={() => {
            setSelectedCita(null);
            setShowModal(true);
          }}
        >
          + Nueva Cita
        </button>
      </div>

      <div className="calendar-legend">
        <span className="legend-item pendiente">Pendiente</span>
        <span className="legend-item confirmada">Confirmada</span>
        <span className="legend-item completada">Completada</span>
        <span className="legend-item cancelada">Cancelada</span>
      </div>

      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 700 }}
        onSelectEvent={handleSelectEvent}
        onSelectSlot={handleSelectSlot}
        selectable
        messages={messages}
        eventPropGetter={eventStyleGetter}
        views={['month', 'week', 'day']}
        view={currentView}
        onView={setCurrentView}
        date={currentDate}
        onNavigate={setCurrentDate}
        toolbar={true}
        min={min}
        max={max}
        step={30}
        timeslots={2}
        formats={{
          timeGutterFormat: 'HH:mm',
          eventTimeRangeFormat: ({ start, end }, culture, localizer) =>
            localizer.format(start, 'HH:mm', culture) + ' - ' +
            localizer.format(end, 'HH:mm', culture),
          agendaTimeRangeFormat: ({ start, end }, culture, localizer) =>
            localizer.format(start, 'HH:mm', culture) + ' - ' +
            localizer.format(end, 'HH:mm', culture),
          dayHeaderFormat: 'dddd, DD [de] MMMM',
          dayRangeHeaderFormat: ({ start, end }, culture, localizer) =>
            localizer.format(start, 'DD MMM', culture) + ' - ' +
            localizer.format(end, 'DD MMM', culture),
        }}
      />

      {showModal && (
        <CitaModal
          cita={selectedCita}
          medicos={medicos}
          pacientes={pacientes}
          sedes={sedes}
          onSave={handleSaveCita}
          onDelete={handleDeleteCita}
          onClose={() => {
            setShowModal(false);
            setSelectedCita(null);
          }}
        />
      )}
    </div>
  );
};

export default CitasCalendar;

