import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { aplicarEngine } from './engine';
import { scrapeVehicleData } from './services/vehicleDataScraper';
import { scrapeFines } from './services/fineScraper';
import { scrapeUnifiedData } from './services/unifiedScraper';
import { scrapeSRIData } from './services/sriDataScraper';
import { evaluateAlerts } from './services/notificationService';

// Cargar variables desde el .env del backend
dotenv.config({ path: '.env' }); 

export const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001; 
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

app.get('/api/notificaciones', async (req: Request, res: Response) => {
    try {
        const { data: notifs, error } = await supabase
            .from('notificaciones')
            .select(`
                *,
                entidades_monitoreadas(nombre_alias, identificador)
            `)
            .order('creado_en', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: notifs });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/notificaciones/:id/leer', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

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
                total_multas,
                detalle_multas,
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
        if (!placa) return res.status(400).json({ success: false, error: 'Placa no proporcionada' });

        // 1. Unified Scraping with individual resilience
        let unifiedData: any = {
            marca: '-', modelo: '-', año_fabricacion: '-', color_oficial: '-', 
            cilindraje: '-', tipo_servicio: '-', ramv_cpn: '-', numero_chasis: '-', 
            pais_origen: '-', estado_polarizado: 'NO', anio_matricula: '-', 
            fecha_matricula: '-', fecha_caducidad: '-', tieneMultas: false, 
            totalMultas: 0, detalleMultas: []
        };
        
        let sriValores: any = {
            total: 0, impuesto: 0, sppat: 0, tasas: 0, 
            estado: 'PAGADO', exonerado: true
        };

        try {
            const results = await Promise.allSettled([
                scrapeUnifiedData(placa as string),
                scrapeSRIData(placa as string)
            ]);

            if (results[0].status === 'fulfilled') unifiedData = results[0].value;
            if (results[1].status === 'fulfilled') sriValores = results[1].value;
        } catch (e) {
            console.error('⚠️ Error parcial en scrapers:', e);
        }
        
        // 2. Prepare Technical Data (13 specific variables)
        const technicalData = {
            marca: unifiedData.marca || '-',
            modelo: unifiedData.modelo || '-',
            anio: unifiedData.año_fabricacion || '-',
            año_fabricacion: unifiedData.año_fabricacion || '-',
            color_oficial: unifiedData.color_oficial || '-',
            color: unifiedData.color_oficial || '-',
            cilindraje: unifiedData.cilindraje || '-',
            tipo_servicio: unifiedData.tipo_servicio || '-',
            servicio: unifiedData.tipo_servicio || '-',
            ramv_cpn: unifiedData.ramv_cpn || '-',
            numero_chasis: unifiedData.numero_chasis || '-',
            pais_origen: unifiedData.pais_origen || '-',
            estado_polarizado: unifiedData.estado_polarizado || 'NO',
            anio_matricula: unifiedData.anio_matricula || '-',
            fecha_matricula: unifiedData.fecha_matricula || '-',
            fecha_caducidad: unifiedData.fecha_caducidad || '-',
            fuente: 'real' as const
        };

        const nombreAlias = `${technicalData.marca} ${technicalData.modelo}`;

        // 3. Fetch existing entity to merge JSONB
        const { data: existingEntidad, error: fetchError } = await supabase
            .from('entidades_monitoreadas')
            .select('*')
            .eq('identificador', placa)
            .single();

        if (fetchError || !existingEntidad) {
            throw new Error('Entidad no encontrada para actualizar');
        }

        const mergedDatosExtra = {
            ...(existingEntidad.datos_extra || {}),
            ...technicalData
        };

        // 4. Update Entity
        const { data: entidad, error: entityError } = await supabase
            .from('entidades_monitoreadas')
            .update({ 
                datos_extra: mergedDatosExtra, 
                nombre_alias: nombreAlias 
            })
            .eq('identificador', placa)
            .select()
            .single();

        if (entityError) throw entityError;

        // 5. Update Active Cycle with Fines and SRI Registration values (Resilient to missing columns)
        try {
            const updatePayload: any = { 
                total_multas: unifiedData.totalMultas, 
                detalle_multas: unifiedData.detalleMultas
            };

            // Only add registration fields if they likely exist in the schema
            if (sriValores.total !== undefined) {
                updatePayload.valor_matricula = sriValores.total;
                updatePayload.estado_pago_sri = sriValores.estado;
            }

            const { error: cycleError } = await supabase
                .from('ciclos_actividad')
                .update(updatePayload)
                .eq('entidad_id', entidad.id)
                .eq('estado', 'ACTIVO');

            if (cycleError) {
                console.warn('⚠️ No se pudo actualizar columnas de matrícula (posible esquema desactualizado):', cycleError.message);
            }
        } catch (e) {
            console.error('❌ Error fatal al actualizar ciclo:', e);
        }

        // 6. Automatically Update Step 2 (Pago de Matrícula) if Paid
        if (sriValores.estado === 'PAGADO') {
            const { data: activeCycle } = await supabase
                .from('ciclos_actividad')
                .select('id')
                .eq('entidad_id', entidad.id)
                .eq('estado', 'ACTIVO')
                .single();

            if (activeCycle) {
                await supabase
                    .from('pasos_ciclo')
                    .update({ completado: true })
                    .eq('ciclo_id', activeCycle.id)
                    .ilike('titulo', '%Matrícula (SRI)%');
            }
        }

        res.json({ 
            success: true, 
            data: technicalData, 
            nombre_alias: nombreAlias,
            fines: {
                tieneMultas: unifiedData.tieneMultas,
                totalMultas: unifiedData.totalMultas,
                detalleMultas: unifiedData.detalleMultas
            },
            matricula: sriValores
        });
    } catch (err: any) {
        if (err.message === 'CAPTCHA_REQUIRED') {
            return res.status(403).json({ success: false, error: 'CAPTCHA_REQUIRED' });
        }
        console.error('🔥 Error en el endpoint /api/vehiculos/info/:placa:', err);
        res.status(500).json({ success: false, error: err.message || 'Error de servidor' });
    }
});

// --- MODULAR ENDPOINTS ---

app.get('/api/vehiculos/ficha/:placa', async (req: Request, res: Response) => {
    try {
        const { placa } = req.params;
        const normalizedPlate = (placa as string).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        console.log(`[Modular] Consultando FICHA para: ${normalizedPlate}`);
        
        const data = await scrapeUnifiedData(normalizedPlate);

        // PERSISTENCE: Update technical data in database
        if (data && (data.marca || data.modelo)) {
            const nombreAlias = `${data.marca} ${data.modelo}`.toUpperCase();
            await supabase
                .from('entidades_monitoreadas')
                .update({ 
                    datos_extra: { ...data, fuente: 'real' },
                    nombre_alias: nombreAlias
                })
                .eq('identificador', normalizedPlate);
        }

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('🔥 Error en ficha:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/vehiculos/multas/:placa', async (req: Request, res: Response) => {
    try {
        const { placa } = req.params;
        const normalizedPlate = (placa as string).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        console.log(`[Modular] Consultando MULTAS para: ${normalizedPlate}`);
        
        const data = await scrapeFines(normalizedPlate);

        // PERSISTENCE: Update fines in active cycle
        const { data: entidad } = await supabase
            .from('entidades_monitoreadas')
            .select('id')
            .eq('identificador', normalizedPlate)
            .single();

        if (entidad) {
            await supabase
                .from('ciclos_actividad')
                .update({ 
                    total_multas: data.totalMultas, 
                    detalle_multas: data.detalleMultas 
                })
                .eq('entidad_id', entidad.id)
                .eq('estado', 'ACTIVO');

            // Update step 1 status
            const { data: activeCycle } = await supabase
                .from('ciclos_actividad')
                .select('id')
                .eq('entidad_id', entidad.id)
                .eq('estado', 'ACTIVO')
                .single();

            if (activeCycle) {
                await supabase
                    .from('pasos_ciclo')
                    .update({ completado: data.totalMultas === 0 })
                    .eq('ciclo_id', activeCycle.id)
                    .eq('orden', 1);
            }
        }

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('🔥 Error en multas:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/vehiculos/matricula/:placa', async (req: Request, res: Response) => {
    try {
        const { placa } = req.params;
        const normalizedPlate = (placa as string).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        console.log(`[Modular] Consultando MATRICULA para: ${normalizedPlate}`);
        
        const data = await scrapeSRIData(normalizedPlate);

        // PERSISTENCE: Update matricula in active cycle
        const { data: entidad } = await supabase
            .from('entidades_monitoreadas')
            .select('id')
            .eq('identificador', normalizedPlate)
            .single();

        if (entidad) {
            await supabase
                .from('ciclos_actividad')
                .update({ 
                    valor_matricula: data.total,
                    estado_pago_sri: data.estado
                })
                .eq('entidad_id', entidad.id)
                .eq('estado', 'ACTIVO');

            // Update step 2 status
            const { data: activeCycle } = await supabase
                .from('ciclos_actividad')
                .select('id')
                .eq('entidad_id', entidad.id)
                .eq('estado', 'ACTIVO')
                .single();

            if (activeCycle) {
                await supabase
                    .from('pasos_ciclo')
                    .update({ completado: data.total === 0 || data.estado === 'PAGADO' })
                    .eq('ciclo_id', activeCycle.id)
                    .eq('orden', 2);
            }
        }

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('🔥 Error en matricula:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

import { getCompleteVehicleData } from './services/vehicleOrchestrator';

// Helper to update sync status
async function updateSyncStatus(identificador: string, status: string, message: string) {
    console.log(`[Sync] ${identificador}: ${status} - ${message}`);
    try {
        await supabase
            .from('entidades_monitoreadas')
            .update({ sync_status: status, sync_message: message })
            .eq('identificador', identificador);
    } catch (e) {
        console.error('[SyncStatusUpdateError]', e);
    }
}

app.post('/api/vehiculos', async (req: Request, res: Response) => {
    try {
        const { placa } = req.body;
        if (!placa) return res.status(400).json({ success: false, error: 'Placa requerida' });

        const normalizedPlate = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        // 🇪🇨 ECUADOR PLATE VALIDATION
        const plateRegex = /^[A-Z]{3}\d{3,4}$/i;
        if (!plateRegex.test(normalizedPlate)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Formato de placa inválido. Debe tener 3 letras y 3 o 4 números.' 
            });
        }

        // 1. Unique Check
        const { data: existing } = await supabase
            .from('entidades_monitoreadas')
            .select('id')
            .eq('identificador', normalizedPlate)
            .maybeSingle();
        
        if (existing) return res.status(400).json({ success: false, error: 'La placa ya existe' });

        // 2. Initial Registration (INSTANT)
        const { data: newVehicle, error: createError } = await supabase
            .from('entidades_monitoreadas')
            .insert({
                identificador: normalizedPlate,
                tipo_identificador: 'PLACA',
                nombre_alias: `Buscando ${normalizedPlate}...`,
                sync_status: 'BUSCANDO_FICHA',
                sync_message: 'Iniciando búsqueda técnica oficial...'
            })
            .select('*')
            .single();

        if (createError) throw createError;

        // 3. RESPOND IMMEDIATELY
        res.status(201).json({ success: true, data: newVehicle });

        // 4. BACKGROUND PROCESSING
        (async () => {
            const entidadId = (newVehicle as any).id;
            console.log(`[BackgroundSync] Iniciando proceso para ${normalizedPlate} (${entidadId})`);
            try {
                // Phase 1: Ficha Técnica
                console.log(`[BackgroundSync] Fase 1: Ficha Técnica para ${normalizedPlate}`);
                await updateSyncStatus(normalizedPlate, 'BUSCANDO_FICHA', 'Estamos extrayendo marca, modelo y año...');
                const fullData = await getCompleteVehicleData(normalizedPlate);
                
                let technicalSpecs: any = { marca: 'Desconocido', modelo: 'Desconocido', anio_fabricacion: 0 };
                if (fullData && fullData.technicalSpecs) {
                    technicalSpecs = fullData.technicalSpecs;
                    const nombreAlias = `${technicalSpecs.marca} ${technicalSpecs.modelo}`.toUpperCase();
                    await supabase
                        .from('entidades_monitoreadas')
                        .update({ 
                            datos_extra: { ...technicalSpecs, fuente: 'real' },
                            nombre_alias: nombreAlias
                        })
                        .eq('id', entidadId);
                    console.log(`[BackgroundSync] Ficha técnica obtenida para ${normalizedPlate}`);
                }

                // Phase 2: Create Active Cycle
                console.log(`[BackgroundSync] Fase 2: Ciclo y Multas para ${normalizedPlate}`);
                await updateSyncStatus(normalizedPlate, 'BUSCANDO_MULTAS', 'Ficha técnica obtenida. Consultando infracciones...');
                const { data: cycle } = await supabase
                    .from('ciclos_actividad')
                    .insert({
                        entidad_id: entidadId,
                        nombre: `RTV ${new Date().getFullYear()}`,
                        estado: 'ACTIVO'
                    })
                    .select('*')
                    .single();

                if (cycle) {
                    const cicloId = (cycle as any).id;
                    
                    // Create Steps
                    await supabase.from('pasos_ciclo').insert([
                        { ciclo_id: cicloId, titulo: 'Pago de Multas (ANT/Municipales)', orden: 1 },
                        { ciclo_id: cicloId, titulo: 'Pago de Matrícula (SRI)', orden: 2 },
                        { ciclo_id: cicloId, titulo: 'Generación de Turno RTV', orden: 3 },
                        { ciclo_id: cicloId, titulo: 'Aprobación de Revisión', orden: 4 }
                    ]);

                    // Scrape Multas
                    const fines = await scrapeFines(normalizedPlate);
                    await supabase
                        .from('ciclos_actividad')
                        .update({ total_multas: fines.totalMultas, detalle_multas: fines.detalleMultas })
                        .eq('id', cicloId);
                    
                    await supabase
                        .from('pasos_ciclo')
                        .update({ completado: fines.totalMultas === 0 })
                        .eq('ciclo_id', cicloId)
                        .eq('orden', 1);
                    console.log(`[BackgroundSync] Multas procesadas para ${normalizedPlate}: ${fines.totalMultas}`);

                    // Phase 3: Matrícula
                    console.log(`[BackgroundSync] Fase 3: Matrícula para ${normalizedPlate}`);
                    await updateSyncStatus(normalizedPlate, 'BUSCANDO_MATRICULA', 'Consultando valores pendientes en el SRI...');
                    const matricula = await scrapeSRIData(normalizedPlate);
                    
                    await supabase
                        .from('ciclos_actividad')
                        .update({ valor_matricula: matricula.total, estado_pago_sri: matricula.estado })
                        .eq('id', cicloId);

                    await supabase
                        .from('pasos_ciclo')
                        .update({ completado: (matricula.total === 0 || matricula.estado === 'PAGADO') })
                        .eq('ciclo_id', cicloId)
                        .eq('orden', 2);
                    console.log(`[BackgroundSync] Matrícula procesada para ${normalizedPlate}: ${matricula.total}`);
                }

                console.log(`[BackgroundSync] Sincronización COMPLETADA para ${normalizedPlate}`);
                await updateSyncStatus(normalizedPlate, 'COMPLETADO', 'Sincronización finalizada correctamente.');

            } catch (bgError: any) {
                console.error(`[BackgroundSync] 🔥 Error en ${normalizedPlate}:`, bgError.message);
                let status = 'FALLO_PORTAL';
                let msg = 'No se pudo completar la sincronización con portales oficiales.';
                
                if (bgError.message.includes('CAPTCHA')) {
                    status = 'CAPTCHA_DETECTADO';
                    msg = 'Portal requiere validación manual. Reintentando en breve...';
                }

                await updateSyncStatus(normalizedPlate, status, msg);
            }
        })();

    } catch (err: any) {
        console.error('🔥 Error en registro:', err);
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

import { scrapeAMTAvailability } from './services/amtScraper';

app.get('/api/rtv/disponibilidad/:placa', async (req: Request, res: Response) => {
    try {
        const { placa } = req.params;
        
        // 1. Verify eligibility (Step 1 & 2 must be clear)
        const { data: ciclo, error: fetchError } = await supabase
            .from('ciclos_actividad')
            .select('*, pasos_ciclo(*), entidades_monitoreadas!inner(*)')
            .eq('estado', 'ACTIVO')
            .eq('entidades_monitoreadas.identificador', placa)
            .single();

        // Check if steps 1 and 2 are completed
        const steps = (ciclo?.pasos_ciclo || []).sort((a: any, b: any) => a.orden - b.orden);
        const step1 = steps.find((s: any) => s.orden === 1);
        const step2 = steps.find((s: any) => s.orden === 2);

        if (!step1?.completado || !step2?.completado) {
            return res.status(403).json({ 
                success: false, 
                error: 'BLOQUEO: Debes solventar Multas y Matrícula antes de agendar turno.' 
            });
        }

        const disponibilidad = await scrapeAMTAvailability(placa as string);
        res.json({ success: true, data: disponibilidad });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/rtv/agendar', async (req: Request, res: Response) => {
    try {
        const { ciclo_id, centro, fecha } = req.body;
        
        // 1. Update cycle with appointment data
        const { error: updateError } = await supabase
            .from('ciclos_actividad')
            .update({ 
                centro_rtv: centro,
                fecha_turno: fecha
            })
            .eq('id', ciclo_id);

        if (updateError) throw updateError;

        // 2. Mark Step 3 as completed
        await supabase
            .from('pasos_ciclo')
            .update({ completado: true })
            .eq('ciclo_id', ciclo_id)
            .eq('orden', 3);

        res.json({ success: true, message: 'Turno agendado con éxito' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/rtv/paso/proceso', async (req: Request, res: Response) => {
    try {
        const { ciclo_id, step_id } = req.body;
        
        // Find step by id/titulo in the cycle
        const { data: steps } = await supabase
            .from('pasos_ciclo')
            .select('id, titulo')
            .eq('ciclo_id', ciclo_id);

        if (!steps) throw new Error('No se encontraron pasos');

        const step = steps.find((s: any) => {
            if (step_id === 'multas') return s.titulo.includes('Multas');
            if (step_id === 'matricula') return s.titulo.includes('Matrícula');
            if (step_id === 'turno') return s.titulo.includes('Turno');
            if (step_id === 'revision') return s.titulo.includes('Revisión');
            return false;
        });

        if (step) {
            await supabase
                .from('pasos_ciclo')
                .update({ metadata: { estado_intermedio: 'EN_PROCESO', fecha_inicio: new Date().toISOString() } })
                .eq('id', step.id);
        }

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/rtv/finalizar', async (req: Request, res: Response) => {
    try {
        const { ciclo_id } = req.body;

        // 1. Fetch current cycle data
        const { data: ciclo, error: fetchError } = await supabase
            .from('ciclos_actividad')
            .select('*, entidades_monitoreadas(*)')
            .eq('id', ciclo_id)
            .single();

        if (fetchError || !ciclo) throw new Error('Ciclo no encontrado');

        // 2. Migrate to Historial
        const { error: histError } = await supabase
            .from('historial_servicio')
            .insert({
                ciclo_id: (ciclo as any).id,
                periodo: `Año ${new Date().getFullYear()}`,
                fecha_cierre: new Date().toISOString().split('T')[0],
                comentario: `Aprobado en Centro ${(ciclo as any).centro_rtv || 'N/A'}.`
            });

        if (histError) throw histError;

        // 3. Mark Step 4 as completed and Close Cycle
        await supabase
            .from('pasos_ciclo')
            .update({ completado: true })
            .eq('ciclo_id', ciclo_id)
            .eq('orden', 4);

        await supabase
            .from('ciclos_actividad')
            .update({ estado: 'CERRADO' })
            .eq('id', ciclo_id);

        res.json({ success: true, message: 'Ciclo completado y movido al historial' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Bucle TS corriendo en http://localhost:${PORT}`);
});

// Global Error Handling to prevent "Clean Exit" on unhandled async errors
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('🔥 Uncaught Exception:', err);
});
