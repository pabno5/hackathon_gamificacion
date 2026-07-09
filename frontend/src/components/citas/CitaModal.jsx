import { useState, useEffect } from 'react';
import './CitaModal.css';

const CitaModal = ({ cita, medicos, pacientes, sedes = [], onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_medico: '',
    id_sede: '',
    canal: 'presencial',
    fecha_cita: '',
    motivo: '',
    estado: 'pendiente',
    observaciones: '',
    tipo_documento: '',
  });

  const [errors, setErrors] = useState({});
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    if (cita) {
      // DEBUG: Ver datos de la cita
      console.log('📋 Datos de la cita:', cita);
      console.log('📄 cita.documento:', cita.documento);
      console.log('📍 cita.ubicacion:', cita.ubicacion);
      console.log('🔗 cita.id_documento:', cita.id_documento);
      
      setFormData({
        id_paciente: cita.id_paciente || '',
        id_medico: cita.id_medico || '',
        id_sede: cita.id_sede || '',
        canal: cita.canal || 'presencial',
        fecha_cita: cita.fecha_cita
          ? new Date(cita.fecha_cita).toISOString().slice(0, 16)
          : '',
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

    if (!formData.fecha_cita) {
      newErrors.fecha_cita = 'Debe seleccionar una fecha y hora';
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

    // Enviar fecha tal como está (sin conversión a UTC)
    // El formato datetime-local ya está en formato ISO: "2025-10-29T14:07"
    // Agregamos ":00" para los segundos si no están
    const fechaFormateada = formData.fecha_cita.length === 16 
      ? `${formData.fecha_cita}:00` 
      : formData.fecha_cita;

    const dataToSend = {
      ...formData,
      fecha_cita: fechaFormateada,
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
            <label htmlFor="fecha_cita">
              Fecha y Hora <span className="required">*</span>
            </label>
            <input
              type="datetime-local"
              id="fecha_cita"
              name="fecha_cita"
              value={formData.fecha_cita}
              onChange={handleChange}
              className={errors.fecha_cita ? 'error' : ''}
            />
            {errors.fecha_cita && <span className="error-message">{errors.fecha_cita}</span>}
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

