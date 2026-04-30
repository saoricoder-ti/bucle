import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { aplicarEngine } from './engine';
import { scrapeVehicleData } from './services/vehicleDataScraper';

// Cargar variables desde el .env del backend
dotenv.config({ path: '.env' }); 

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001; // Usar 3001 para no pisar el anterior si está vivo
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

app.get('/api/dashboard', async (req: Request, res: Response) => {
    try {
        const { data: ciclos, error } = await supabase
            .from('ciclos_actividad')
            .select(`
                id,
                nombre,
                estado,
                entidades_monitoreadas (
                    id,
                    tipo_identificador,
                    identificador,
                    nombre_alias,
                    datos_extra
                ),
                pasos_ciclo (
                    id,
                    titulo,
                    completado,
                    orden
                ),
                historial_servicio (
                    id,
                    periodo,
                    fecha_cierre,
                    comentario
                ),
                adjuntos_ciclo (
                    id,
                    nombre_archivo,
                    url_archivo
                )
            `);

        if (error) {
            console.error('❌ Error en Supabase al consultar la tabla ciclos_actividad:', error);
            throw error;
        }

        const ciclosProcesados = (ciclos || []).map(c => {
            if (c.pasos_ciclo) c.pasos_ciclo.sort((a: any, b: any) => a.orden - b.orden);
            if (c.historial_servicio) c.historial_servicio.sort((a: any, b: any) => new Date(b.fecha_cierre).getTime() - new Date(a.fecha_cierre).getTime());
            return aplicarEngine(c);
        });

        res.json({ success: true, data: ciclosProcesados });
    } catch (err: any) {
        console.error('🔥 Error en el endpoint /api/dashboard:', err);
        res.status(500).json({ success: false, error: err.message || 'Error de conexión con el servidor' });
    }
});

app.post('/api/multas/verificar', async (req: Request, res: Response) => {
    try {
        const { ciclo_id, paso_id } = req.body;
        if (!ciclo_id || !paso_id) {
            return res.status(400).json({ success: false, error: 'Faltan parámetros' });
        }

        // 1. Update paso
        const { error: updateError } = await supabase
            .from('pasos_ciclo')
            .update({ completado: true })
            .eq('id', paso_id);

        if (updateError) throw updateError;

        // 2. Insert history
        const { error: historyError } = await supabase
            .from('historial_servicio')
            .insert({
                ciclo_id,
                periodo: new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }),
                fecha_cierre: new Date().toISOString().split('T')[0],
                comentario: 'Validación de Multas completada en AxisCloud.'
            });

        if (historyError) throw historyError;

        res.json({ success: true });
    } catch (err: any) {
        console.error('🔥 Error en el endpoint /api/multas/verificar:', err);
        res.status(500).json({ success: false, error: err.message || 'Error de servidor' });
    }
});

app.get('/api/vehiculos/info/:placa', async (req: Request, res: Response) => {
    try {
        const { placa } = req.params;
        if (!placa) {
            return res.status(400).json({ success: false, error: 'Placa no proporcionada' });
        }

        const scrapedData = await scrapeVehicleData(placa as string);
        if (!scrapedData) {
            return res.status(404).json({ success: false, error: 'Placa no encontrada o externa falló' });
        }

        // Fetch current entity to merge datos_extra
        const { data: entidad, error: fetchError } = await supabase
            .from('entidades_monitoreadas')
            .select('*')
            .eq('identificador', placa)
            .single();

        if (fetchError || !entidad) {
            return res.status(404).json({ success: false, error: 'Entidad no encontrada en base de datos local' });
        }

        const datosExtra = entidad.datos_extra || {};
        const nuevosDatosExtra = { ...datosExtra, ...scrapedData };

        let nombreAlias = entidad.nombre_alias;
        if (nuevosDatosExtra.marca && nuevosDatosExtra.modelo && nuevosDatosExtra.marca !== 'Desconocido') {
            nombreAlias = `${nuevosDatosExtra.marca} ${nuevosDatosExtra.modelo}`;
        }

        const { error: updateError } = await supabase
            .from('entidades_monitoreadas')
            .update({ datos_extra: nuevosDatosExtra, nombre_alias: nombreAlias })
            .eq('identificador', placa);

        if (updateError) throw updateError;

        res.json({ success: true, data: nuevosDatosExtra });
    } catch (err: any) {
        if (err.message === 'CAPTCHA_REQUIRED') {
            return res.status(403).json({ success: false, error: 'CAPTCHA_REQUIRED' });
        }
        console.error('🔥 Error en el endpoint /api/vehiculos/info/:placa:', err);
        res.status(500).json({ success: false, error: err.message || 'Error de servidor' });
    }
});

app.post('/api/vehiculos', async (req: Request, res: Response) => {
    try {
        const { placa } = req.body;
        if (!placa) return res.status(400).json({ success: false, error: 'Placa requerida' });

        const normalizedPlate = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');

        // Check if exists
        const { data: existing } = await supabase.from('entidades_monitoreadas').select('id').eq('identificador', normalizedPlate).single();
        if (existing) return res.status(400).json({ success: false, error: 'La placa ya existe' });

        // Insert entity
        const { data: entidad, error: entityErr } = await supabase
            .from('entidades_monitoreadas')
            .insert({
                tipo_identificador: 'PLACA',
                identificador: normalizedPlate,
                nombre_alias: `Vehículo ${normalizedPlate}`,
                datos_extra: { ultimo_digito: parseInt(normalizedPlate.slice(-1)) }
            })
            .select('*')
            .single();

        if (entityErr) throw entityErr;

        // Insert cycle
        const { data: ciclo, error: cicloErr } = await supabase
            .from('ciclos_actividad')
            .insert({
                entidad_id: entidad.id,
                nombre: 'Revisión Técnica Vehicular',
                estado: 'ACTIVO'
            })
            .select('*')
            .single();

        if (cicloErr) throw cicloErr;

        // Insert steps
        const pasos = [
            { ciclo_id: ciclo.id, titulo: '1. Pago de Multas', orden: 1 },
            { ciclo_id: ciclo.id, titulo: '2. Revisión Técnica', orden: 2 },
            { ciclo_id: ciclo.id, titulo: '3. Pago de Matrícula', orden: 3 }
        ];

        const { error: stepsErr } = await supabase.from('pasos_ciclo').insert(pasos);
        if (stepsErr) throw stepsErr;

        res.json({ success: true, data: { entidad, ciclo } });
    } catch (err: any) {
        console.error('Error al crear vehiculo:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/vehiculos/manual', async (req: Request, res: Response) => {
    try {
        const { placa, manualData } = req.body;
        
        const { data: entidad, error: fetchError } = await supabase
            .from('entidades_monitoreadas')
            .select('*')
            .eq('identificador', placa)
            .single();

        if (fetchError || !entidad) throw new Error('Entidad no encontrada');

        const nuevosDatosExtra = { ...entidad.datos_extra, ...manualData, fuente: 'manual' };

        let nombreAlias = entidad.nombre_alias;
        if (nuevosDatosExtra.marca && nuevosDatosExtra.modelo && nuevosDatosExtra.marca !== 'Desconocido') {
            nombreAlias = `${nuevosDatosExtra.marca} ${nuevosDatosExtra.modelo}`;
        }

        const { error: updateError } = await supabase
            .from('entidades_monitoreadas')
            .update({ datos_extra: nuevosDatosExtra, nombre_alias: nombreAlias })
            .eq('identificador', placa);

        if (updateError) throw updateError;

        res.json({ success: true, data: nuevosDatosExtra });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

/**
 * Resolves a car search query to a real Unsplash CDN image URL.
 * Source.unsplash.com returns a 302 redirect that browsers can't follow with Next.js Image.
 * This endpoint follows the redirect server-side and returns the final URL.
 */
app.get('/api/imagen/vehiculo', async (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || typeof q !== 'string') {
            return res.status(400).json({ success: false, error: 'Query requerido' });
        }

        const query = encodeURIComponent(`${q} car automobile`);
        const sourceUrl = `https://source.unsplash.com/900x506/?${query}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(sourceUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            },
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // After following the redirect, response.url is the final CDN URL
        const finalUrl = response.url;

        if (!finalUrl || !finalUrl.includes('images.unsplash.com')) {
            return res.json({ success: false, url: null });
        }

        res.json({ success: true, url: finalUrl });
    } catch (err: any) {
        console.warn('[ImageResolver] Error:', err.message);
        res.json({ success: false, url: null });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Bucle TS corriendo en http://localhost:${PORT}`);
});
