import { useState, useEffect } from 'react';
import './CitaModal.css';

const CitaModal = ({ cita, medicos, pacientes, onSave, onDelete, onClose }) => {
  const [formData, setFormData] = useState({
    id_paciente: '',
    id_medico: '',
    fecha_cita: '',
    motivo: '',
    estado: 'pendiente',
    observaciones: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (cita) {
      setFormData({
        id_paciente: cita.id_paciente || '',
        id_medico: cita.id_medico || '',
        fecha_cita: cita.fecha_cita 
          ? new Date(cita.fecha_cita).toISOString().slice(0, 16)
          : '',
        motivo: cita.motivo || '',
        estado: cita.estado || 'pendiente',
        observaciones: cita.observaciones || '',
      });
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

  const validate = () => {
    const newErrors = {};

    if (!formData.id_paciente) {
      newErrors.id_paciente = 'Debe seleccionar un paciente';
    }

    if (!formData.id_medico) {
      newErrors.id_medico = 'Debe seleccionar un médico';
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

    // Convertir fecha a ISO string para el backend
    const dataToSend = {
      ...formData,
      fecha_cita: new Date(formData.fecha_cita).toISOString(),
    };

    onSave(dataToSend);
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

          <div className="modal-actions">
            {cita?.id_cita && (
              <button
                type="button"
                className="btn-delete"
                onClick={handleDelete}
              >
                Eliminar
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

