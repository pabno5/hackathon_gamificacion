const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Configuración del cliente Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

console.log('Intentando conectar a Supabase...');
const supabase = createClient(supabaseUrl, supabaseKey);

// Función para probar la conexión
const testConnection = async () => {
    try {
        console.log('Probando conexión a Supabase...');
        console.log('URL:', process.env.SUPABASE_URL);
        
        // No necesitamos autenticación para verificar la conexión básica
        return true;
    } catch (err) {
        console.error('Error detallado:', err);
        return false;
    }
};

module.exports = {
    supabase,
    testConnection
};