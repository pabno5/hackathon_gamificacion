const PDFDocument = require('pdfkit');
const { NotFoundError } = require('../../shared/errors/AppError');
const { getPool } = require('../../infrastructure/db');

const pool = getPool();

const TEAL = '#03D4D9';
const DARK = '#038996';

class HistoriaPDFService {
  constructor(historiasService) {
    this.service = historiasService;
  }

  async generar(idHistoria, rol, res) {
    const historia = await this.service.obtenerPorId(idHistoria, rol);

    // Datos del paciente
    const { rows: pacRows } = await pool.query(
      `SELECT tipo_documento, numero_documento, nombres, apellidos,
              fecha_nacimiento, telefono, correo, direccion
         FROM personas WHERE id_persona = $1`,
      [historia.id_paciente]
    );
    if (pacRows.length === 0) throw new NotFoundError('Paciente');
    const pac = pacRows[0];

    // Configurar response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="historia_${historia.id_historia}.pdf"`
    );

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.fillColor(TEAL).fontSize(20).text('HISTORIA CLÍNICA', { align: 'center' });
    doc.fillColor(DARK).fontSize(12).text('Clínica Cárdenas Visión', { align: 'center' });
    doc.moveDown();
    doc.fillColor('#000000').fontSize(9)
       .text(`Generado: ${new Date().toLocaleString('es-CO')}`, { align: 'right' });
    doc.moveDown();

    // 1. Identificación
    this.#seccion(doc, '1. IDENTIFICACIÓN DEL PACIENTE');
    this.#campo(doc, 'Nombre', `${pac.nombres} ${pac.apellidos}`);
    this.#campo(doc, 'Documento', `${pac.tipo_documento} ${pac.numero_documento}`);
    this.#campo(doc, 'Fecha nacimiento', pac.fecha_nacimiento || '—');
    this.#campo(doc, 'Teléfono', pac.telefono || '—');
    this.#campo(doc, 'Correo', pac.correo || '—');
    this.#campo(doc, 'Dirección', pac.direccion || '—');

    // 2. Motivo
    if (historia.motivo_consulta) {
      this.#seccion(doc, '2. MOTIVO DE CONSULTA');
      doc.fontSize(11).fillColor('#000').text(historia.motivo_consulta);
    }

    // 3. Enfermedad actual (recepcionista no ve esto en adelante)
    if (historia.enfermedad_actual) {
      this.#seccion(doc, '3. ENFERMEDAD ACTUAL');
      doc.fontSize(11).fillColor('#000').text(historia.enfermedad_actual);
    }

    // 4. Antecedentes
    if (this.#tieneCampos(historia, ['antecedentes_patologicos', 'antecedentes_quirurgicos', 'alergias', 'antecedentes_traumaticos', 'antecedentes_farmacologicos', 'habitos', 'antecedentes_familiares'])) {
      this.#seccion(doc, '4. ANTECEDENTES');
      this.#campoOpcional(doc, 'Patológicos', historia.antecedentes_patologicos);
      this.#campoOpcional(doc, 'Quirúrgicos', historia.antecedentes_quirurgicos);
      this.#campoOpcional(doc, 'Alergias', historia.alergias);
      this.#campoOpcional(doc, 'Traumáticos', historia.antecedentes_traumaticos);
      this.#campoOpcional(doc, 'Farmacológicos', historia.antecedentes_farmacologicos);
      this.#campoOpcional(doc, 'Hábitos', historia.habitos);
      this.#campoOpcional(doc, 'Familiares', historia.antecedentes_familiares);
    }

    // 5. Signos vitales
    if (this.#tieneCampos(historia, ['tension_arterial', 'frecuencia_cardiaca', 'temperatura', 'peso', 'talla'])) {
      this.#seccion(doc, '5. EXAMEN FÍSICO — SIGNOS VITALES');
      this.#campoOpcional(doc, 'Tensión arterial', historia.tension_arterial);
      this.#campoOpcional(doc, 'Frecuencia cardíaca', historia.frecuencia_cardiaca);
      this.#campoOpcional(doc, 'Frecuencia respiratoria', historia.frecuencia_respiratoria);
      this.#campoOpcional(doc, 'Temperatura', historia.temperatura);
      this.#campoOpcional(doc, 'Peso', historia.peso);
      this.#campoOpcional(doc, 'Talla', historia.talla);
    }

    // 6. Examen oftalmológico
    if (this.#tieneCampos(historia, ['agudeza_visual', 'fondo_ojo', 'reflejos_pupilares'])) {
      this.#seccion(doc, '6. EXAMEN OFTALMOLÓGICO');
      this.#campoOpcional(doc, 'Agudeza visual', historia.agudeza_visual);
      this.#campoOpcional(doc, 'Fondo de ojo', historia.fondo_ojo);
      this.#campoOpcional(doc, 'Reflejos pupilares', historia.reflejos_pupilares);
    }

    // 7. Diagnóstico (médico/admin)
    if (historia.diagnostico_principal || historia.diagnostico_secundario) {
      this.#seccion(doc, '7. DIAGNÓSTICO');
      this.#campoOpcional(doc, 'Principal', historia.diagnostico_principal);
      this.#campoOpcional(doc, 'Secundario', historia.diagnostico_secundario);
    }

    // 8. Plan de manejo
    if (this.#tieneCampos(historia, ['medicamentos_recetados', 'indicaciones_paciente', 'recomendaciones', 'interconsultas_examenes'])) {
      this.#seccion(doc, '8. PLAN DE MANEJO');
      this.#campoOpcional(doc, 'Medicamentos', historia.medicamentos_recetados);
      this.#campoOpcional(doc, 'Indicaciones', historia.indicaciones_paciente);
      this.#campoOpcional(doc, 'Recomendaciones', historia.recomendaciones);
      this.#campoOpcional(doc, 'Interconsultas/Exámenes', historia.interconsultas_examenes);
    }

    // 9. Evolución
    if (historia.evolucion_seguimiento) {
      this.#seccion(doc, '9. EVOLUCIÓN Y SEGUIMIENTO');
      doc.fontSize(11).fillColor('#000').text(historia.evolucion_seguimiento);
    }

    // Firma
    if (historia.nombre_medico || historia.registro_profesional) {
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#444').text('________________________________', { align: 'right' });
      doc.text(historia.nombre_medico || '', { align: 'right' });
      if (historia.especialidad_medico) doc.text(historia.especialidad_medico, { align: 'right' });
      if (historia.registro_profesional) doc.text(`Reg. ${historia.registro_profesional}`, { align: 'right' });
    }

    doc.end();
  }

  #seccion(doc, titulo) {
    doc.moveDown().fillColor(DARK).fontSize(13).text(titulo);
    doc.fillColor('#000000').fontSize(11);
  }

  #campo(doc, label, valor) {
    doc.fontSize(10).fillColor('#444').text(`${label}: `, { continued: true })
       .fillColor('#000').text(String(valor || '—'));
  }

  #campoOpcional(doc, label, valor) {
    if (valor === null || valor === undefined || valor === '') return;
    this.#campo(doc, label, valor);
  }

  #tieneCampos(obj, claves) {
    return claves.some((k) => obj[k] !== null && obj[k] !== undefined && obj[k] !== '');
  }
}

module.exports = HistoriaPDFService;
