const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Validar que existan las variables de entorno necesarias
if (!process.env.SUPABASE_PROJECT_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('⚠️ ADVERTENCIA: SUPABASE_PROJECT_URL y SUPABASE_SERVICE_KEY no están configurados en .env');
  console.warn('⚠️ El Storage no estará disponible hasta que configures estas variables');
}

// Crear cliente de Supabase con service role key para acceso completo al storage
const supabase = createClient(
  process.env.SUPABASE_PROJECT_URL || '',
  process.env.SUPABASE_SERVICE_KEY || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Sube un archivo a Supabase Storage
 * @param {Buffer} fileBuffer - Buffer del archivo
 * @param {string} fileName - Nombre del archivo
 * @param {string} bucketName - Nombre del bucket (default: 'documentos_citas')
 * @returns {Promise<{success: boolean, url?: string, path?: string, error?: string}>}
 */
const uploadFile = async (fileBuffer, fileName, bucketName = 'documentos_citas') => {
  try {
    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const uniqueFileName = `${timestamp}-${fileName}`;
    const filePath = `documentos/${uniqueFileName}`;

    // Subir archivo al bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (error) {
      console.error('Error al subir archivo a Supabase Storage:', error);
      return {
        success: false,
        error: error.message
      };
    }

    // Obtener URL pública del archivo
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Error en uploadFile:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Elimina un archivo de Supabase Storage
 * @param {string} filePath - Ruta del archivo en el bucket
 * @param {string} bucketName - Nombre del bucket
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const deleteFile = async (filePath, bucketName = 'documentos_citas') => {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .remove([filePath]);

    if (error) {
      console.error('Error al eliminar archivo de Supabase Storage:', error);
      return {
        success: false,
        error: error.message
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error en deleteFile:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  supabase,
  uploadFile,
  deleteFile
};

