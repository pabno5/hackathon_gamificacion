import { useState, useEffect } from 'react';
import { agendaAPI } from '../../service/api';
import './CitaModal.css';

// Fecha/hora locales (sin toISOString: desplazaría la hora a UTC)
const localFecha = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const localHora = (d) => {
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const CitaModal = ({ cita, medicos, pacientes, sedes = [], onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_medico: '',
    id_sede: '',
    canal: 'presencial',
    fecha: '',
    hora: '',
    motivo: '',
    estado: 'pendiente',
    observaciones: '',
    tipo_documento: '',
  });

  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  // Turnos disponibles (BE-02): se cargan al elegir médico + fecha.
  // Si la API falla, `slotsError` degrada a un input de hora manual.
  const [slots, setSlots] = useState([]);
  const [cargandoSlots, setCargandoSlots] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [duracionSlot, setDuracionSlot] = useState(30);

  useEffect(() => {
    if (cita) {
      // DEBUG: Ver datos de la cita
      console.log('📋 Datos de la cita:', cita);
      console.log('📄 cita.documento:', cita.documento);
      console.log('📍 cita.ubicacion:', cita.ubicacion);
      console.log('🔗 cita.id_documento:', cita.id_documento);
      
      const dt = cita.fecha_cita ? new Date(cita.fecha_cita) : null;
      setFormData({
        id_paciente: cita.id_paciente || '',
        id_medico: cita.id_medico || '',
        id_sede: cita.id_sede || '',
        canal: cita.canal || 'presencial',
        fecha: dt ? localFecha(dt) : '',
        // Al editar, la hora original se conserva como opción aunque el slot
        // figure ocupado (lo ocupa esta misma cita).
        hora: dt && cita.id_cita ? localHora(dt) : '',
        motivo: cita.motivo || '',
        estado: cita.estado || 'pendiente',
        observaciones: cita.observaciones || '',
        tipo_documento: '',
      });
      
      // Si la cita tiene un documento asociado, mostrarlo
      // Primero buscar en cita.documento, luego en cita.ubicacion
      if (cita.documento && cita.documento.enlace) {
        console.log('✅ Encontrado documento en cita.documento.enlace');
        setFilePreview({
          name: cita.documento.tipo_documento || 'Documento adjunto',
          url: cita.documento.enlace,
          existing: true,
        });
      } else if (cita.ubicacion) {
        console.log('✅ Encontrado documento en cita.ubicacion');
        // Si no hay objeto documento pero hay ubicacion, usar ese campo
        setFilePreview({
          name: 'Documento adjunto',
          url: cita.ubicacion,
          existing: true,
        });
      } else {
        console.log('❌ No se encontró documento en la cita');
        setFilePreview(null);
      }
    } else {
      // Limpiar archivo al crear nueva cita
      setSelectedFile(null);
      setFilePreview(null);
    }
  }, [cita]);

  // Cargar turnos libres del médico para la fecha elegida (BE-02)
  useEffect(() => {
    if (!formData.id_medico || !formData.fecha) {
      setSlots([]);
      return;
    }
    let vigente = true;
    (async () => {
      setCargandoSlots(true);
      setSlotsError(false);
      try {
        const res = await agendaAPI.disponibilidad({
          id_medico: formData.id_medico,
          fecha: formData.fecha,
          dias: 1,
        });
        if (!vigente) return;
        const data = res.data?.data;
        setDuracionSlot(data?.duracion_slot_min || 30);
        const libres = data?.medicos?.[0]?.disponibilidad?.[0]?.slots ?? [];
        // Al editar: la hora original de ESTA cita cuenta como ocupada en el
        // backend; se re-agrega como opción para poder dejarla igual.
        const horaOriginal = cita?.id_cita && cita?.fecha_cita &&
          localFecha(new Date(cita.fecha_cita)) === formData.fecha
          ? localHora(new Date(cita.fecha_cita))
          : null;
        const set = new Set(libres);
        if (horaOriginal) set.add(horaOriginal);
        setSlots(Array.from(set).sort());
      } catch {
        if (vigente) setSlotsError(true); // degrada a hora manual
      } finally {
        if (vigente) setCargandoSlots(false);
      }
    })();
    return () => { vigente = false; };
  }, [formData.id_medico, formData.fecha, cita]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    if (file) {
      // Validar tamaño (10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      if (file.size > maxSize) {
        alert('El archivo es demasiado grande. Tamaño máximo: 10MB');
        e.target.value = '';
        return;
      }

      // Validar tipo de archivo
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (!allowedTypes.includes(file.type)) {
        alert('Tipo de archivo no permitido. Solo se permiten: PDF, imágenes (JPG, PNG) y documentos (DOC, DOCX, XLS, XLSX)');
        e.target.value = '';
        return;
      }

      setSelectedFile(file);
      setFilePreview({
        name: file.name,
        size: file.size,
        type: file.type,
        existing: false,
      });
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    // Limpiar el input file
    const fileInput = document.getElementById('documento');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.id_paciente) {
      newErrors.id_paciente = 'Debe seleccionar un paciente';
    }

    if (!formData.id_medico) {
      newErrors.id_medico = 'Debe seleccionar un médico';
    }

    if (!formData.id_sede) {
      newErrors.id_sede = 'Debe seleccionar una sede';
    }

    if (!formData.fecha) {
      newErrors.fecha = 'Debe seleccionar una fecha';
    }

    if (!formData.hora) {
      newErrors.hora = 'Debe seleccionar una hora';
    }

    if (!formData.motivo || formData.motivo.trim() === '') {
      newErrors.motivo = 'El motivo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Si hay archivo y no hay tipo de documento, usar el nombre del archivo
    if (selectedFile && !formData.tipo_documento.trim()) {
      setFormData(prev => ({
        ...prev,
        tipo_documento: 'Documento de cita'
      }));
    }

    // hora_fin = hora elegida + duración del slot (config de turnos)
    const [h, m] = formData.hora.split(':').map(Number);
    const finMin = h * 60 + m + duracionSlot;
    const pad = (n) => String(n).padStart(2, '0');
    const hora_fin = `${pad(Math.floor(finMin / 60) % 24)}:${pad(finMin % 60)}`;

    const { fecha, hora, ...resto } = formData;
    const dataToSend = {
      ...resto,
      fecha_cita: `${fecha}T${hora}:00`,
      hora_inicio: hora,
      hora_fin,
    };

    // Pasar datos y archivo al parent component
    onSave(dataToSend, selectedFile);
  };

  const handleDelete = () => {
    if (cita?.id_cita) {
      onDelete(cita.id_cita);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{cita?.id_cita ? 'Editar Cita' : 'Nueva Cita'}</h3>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="cita-form">
          <div className="form-group">
            <label htmlFor="id_paciente">
              Paciente <span className="required">*</span>
            </label>
            <select
              id="id_paciente"
              name="id_paciente"
              value={formData.id_paciente}
              onChange={handleChange}
              className={errors.id_paciente ? 'error' : ''}
            >
              <option value="">Seleccione un paciente</option>
              {pacientes.map(paciente => (
                <option key={paciente.id_persona} value={paciente.id_persona}>
                  {paciente.nombres} {paciente.apellidos} - {paciente.numero_documento}
                </option>
              ))}
            </select>
            {errors.id_paciente && <span className="error-message">{errors.id_paciente}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="id_medico">
              Médico <span className="required">*</span>
            </label>
            <select
              id="id_medico"
              name="id_medico"
              value={formData.id_medico}
              onChange={handleChange}
              className={errors.id_medico ? 'error' : ''}
            >
              <option value="">Seleccione un médico</option>
              {medicos.map(medico => (
                <option key={medico.id_medico} value={medico.id_medico}>
                  Dr(a). {medico.nombres} {medico.apellidos} - {medico.numero_licencia}
                </option>
              ))}
            </select>
            {errors.id_medico && <span className="error-message">{errors.id_medico}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="id_sede">
              Sede <span className="required">*</span>
            </label>
            <select
              id="id_sede"
              name="id_sede"
              value={formData.id_sede}
              onChange={handleChange}
              className={errors.id_sede ? 'error' : ''}
            >
              <option value="">Seleccione una sede</option>
              {sedes.map(sede => (
                <option key={sede.id_sede} value={sede.id_sede}>
                  {sede.nombre}
                </option>
              ))}
            </select>
            {errors.id_sede && <span className="error-message">{errors.id_sede}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="canal">
              Canal de agendamiento <span className="required">*</span>
            </label>
            <select
              id="canal"
              name="canal"
              value={formData.canal}
              onChange={handleChange}
            >
              <option value="presencial">Presencial</option>
              <option value="telefonico">Telefónico (callcenter)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="fecha">
              Fecha <span className="required">*</span>
            </label>
            <input
              type="date"
              id="fecha"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className={errors.fecha ? 'error' : ''}
            />
            {errors.fecha && <span className="error-message">{errors.fecha}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="hora">
              Hora <span className="required">*</span>
            </label>
            {slotsError ? (
              // La API de turnos falló: hora manual como fallback
              <input
                type="time"
                id="hora"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                className={errors.hora ? 'error' : ''}
              />
            ) : (
              <select
                id="hora"
                name="hora"
                value={formData.hora}
                onChange={handleChange}
                disabled={!formData.id_medico || !formData.fecha || cargandoSlots}
                className={errors.hora ? 'error' : ''}
              >
                <option value="">
                  {!formData.id_medico || !formData.fecha
                    ? 'Selecciona médico y fecha primero'
                    : cargandoSlots
                      ? 'Cargando turnos...'
                      : slots.length === 0
                        ? 'Sin turnos disponibles ese día'
                        : 'Selecciona un turno'}
                </option>
                {slots.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
            {errors.hora && <span className="error-message">{errors.hora}</span>}
            {!slotsError && formData.id_medico && formData.fecha && !cargandoSlots && (
              <small className="form-hint">
                Turnos libres del médico (jornada, almuerzo y bloqueos ya descontados) · {duracionSlot} min por cita
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="motivo">
              Motivo <span className="required">*</span>
            </label>
            <input
              type="text"
              id="motivo"
              name="motivo"
              value={formData.motivo}
              onChange={handleChange}
              placeholder="Ej: Consulta general, Control, etc."
              className={errors.motivo ? 'error' : ''}
              maxLength={255}
            />
            {errors.motivo && <span className="error-message">{errors.motivo}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="estado">Estado</label>
            <select
              id="estado"
              name="estado"
              value={formData.estado}
              onChange={handleChange}
            >
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="observaciones">Observaciones</label>
            <textarea
              id="observaciones"
              name="observaciones"
              value={formData.observaciones}
              onChange={handleChange}
              placeholder="Observaciones adicionales..."
              rows={4}
            />
          </div>

          {/* Sección de documento opcional */}
          <div className="document-section">
            <h4>📎 Documento Adjunto (Opcional)</h4>
            
            {!cita?.id_cita && (
              <>
                <div className="form-group">
                  <label htmlFor="tipo_documento">Tipo de Documento</label>
                  <input
                    type="text"
                    id="tipo_documento"
                    name="tipo_documento"
                    value={formData.tipo_documento}
                    onChange={handleChange}
                    placeholder="Ej: Examen de laboratorio, Radiografía, etc."
                    maxLength={50}
                  />
                  <small className="form-hint">
                    Describe el tipo de documento que estás adjuntando
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="documento">Archivo</label>
                  <input
                    type="file"
                    id="documento"
                    name="documento"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  />
                  <small className="form-hint">
                    Formatos permitidos: PDF, JPG, PNG, DOC, DOCX, XLS, XLSX (Máx. 10MB)
                  </small>
                </div>
              </>
            )}

            {/* Vista previa del archivo */}
            {filePreview && (
              <div className="file-preview">
                <div className="file-info">
                  {filePreview.existing ? (
                    <>
                      <span className="file-icon">📄</span>
                      <div className="file-details">
                        <strong>{filePreview.name}</strong>
                        <a 
                          href={filePreview.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="file-link"
                          onClick={(e) => {
                            console.log('Abriendo documento:', filePreview.url);
                          }}
                        >
                          📥 Abrir Documento
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="file-icon">📄</span>
                      <div className="file-details">
                        <strong>{filePreview.name}</strong>
                        <small>{(filePreview.size / 1024).toFixed(2)} KB</small>
                      </div>
                      <button
                        type="button"
                        className="btn-remove-file"
                        onClick={handleRemoveFile}
                        title="Eliminar archivo"
                      >
                        ✕
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-actions">
            {cita?.id_cita && (
              <button
                type="button"
                className="btn-delete"
                onClick={handleDelete}
              >
                Cancelar cita
              </button>
            )}
            <div className="actions-right">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="btn-save">
                {cita?.id_cita ? 'Actualizar' : 'Crear'} Cita
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CitaModal;

