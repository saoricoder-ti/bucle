import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigrations() {
    console.log('🚀 Iniciando migración de base de datos...');
    
    // NOTA: Como no podemos ejecutar DDL directo con la anon key fácilmente sin una función RPC de postgres,
    // vamos a intentar insertar un registro de prueba para ver si fallan las columnas.
    // Pero lo ideal es informar al usuario que las añada manualmente si no tenemos Service Role Key.
    
    console.log('⚠️ IMPORTANTE: Asegúrate de ejecutar este SQL en el SQL Editor de Supabase:');
    console.log(`
        ALTER TABLE entidades_monitoreadas ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'IDLE';
        ALTER TABLE entidades_monitoreadas ADD COLUMN IF NOT EXISTS sync_message TEXT DEFAULT '';
    `);
}

runMigrations();
