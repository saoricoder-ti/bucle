import { scrapeUnifiedData, UnifiedVehicleData } from './unifiedScraper';
import { scrapeSRIData, SRIValores } from './sriDataScraper';
import { scrapeAMTAvailability, AMTCenter } from './amtScraper';

export interface CompleteVehicleData {
  technicalSpecs: {
    marca: string;
    modelo: string;
    anio_fabricacion: number;
    color_oficial: string;
    cilindraje: string;
    tipo_servicio: string;
    ramv_cpn: string;
    numero_chasis: string;
    pais_origen: string;
    estado_polarizado: string;
    ultimo_digito: number;
  };
  legalStatus: {
    anio_matricula: string;
    fecha_matricula: string;
    fecha_caducidad: string;
  };
  financialPending: {
    totalMultas: number;
    detalleMultas: any[];
    valorMatricula: number;
    estadoPagoSRI: string;
  };
  appointments?: AMTCenter[];
}

/**
 * Single source of truth for full vehicle data extraction.
 * Orchestrates ANT, ConsultasEcuador, SRI, Fines and AMT.
 */
export async function getCompleteVehicleData(placa: string): Promise<CompleteVehicleData> {
  const normalizedPlate = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  console.log(`[Orchestrator] Iniciando orquestación resiliente para: ${normalizedPlate}`);

  // 1. Fetch all sources in parallel using allSettled
  const results = await Promise.allSettled([
    scrapeUnifiedData(normalizedPlate),
    scrapeSRIData(normalizedPlate),
    scrapeAMTAvailability(normalizedPlate)
  ]);

  // Extract results with fallbacks
  const unified = results[0].status === 'fulfilled' ? results[0].value : null;
  const sri = results[1].status === 'fulfilled' ? results[1].value : { total: 0, impuesto: 0, sppat: 0, tasas: 0, estado: 'PAGADO', exonerado: true };
  const amt = results[2].status === 'fulfilled' ? results[2].value : [];

  if (results[0].status === 'rejected') console.warn(`⚠️ [Orchestrator] Fallo UnifiedScraper: ${results[0].reason}`);
  if (results[1].status === 'rejected') console.warn(`⚠️ [Orchestrator] Fallo SRI: ${results[1].reason}`);
  if (results[2].status === 'rejected') console.warn(`⚠️ [Orchestrator] Fallo AMT: ${results[2].reason}`);

  // 2. Minimum Persistence Check: Only fail if we have ABSOLUTELY NO technical data
  if (!unified || (!unified.marca && !unified.año_fabricacion)) {
    console.error('[Orchestrator] 404: Identidad vehicular no encontrada en ninguna fuente.');
    throw new Error('PLATE_NOT_FOUND');
  }

  return {
    technicalSpecs: {
      marca: unified.marca || 'GENERICO',
      modelo: unified.modelo || 'No disponible',
      anio_fabricacion: unified.año_fabricacion || 0,
      color_oficial: unified.color_oficial || 'No disponible',
      cilindraje: unified.cilindraje || 'No disponible',
      tipo_servicio: unified.tipo_servicio || 'No disponible',
      ramv_cpn: unified.ramv_cpn || 'No disponible',
      numero_chasis: unified.numero_chasis || 'No disponible',
      pais_origen: unified.pais_origen || 'No disponible',
      estado_polarizado: unified.estado_polarizado || 'No disponible',
      ultimo_digito: parseInt(normalizedPlate.slice(-1)) || 0
    },
    legalStatus: {
      anio_matricula: unified.anio_matricula || 'No disponible',
      fecha_matricula: unified.fecha_matricula || 'No disponible',
      fecha_caducidad: unified.fecha_caducidad || 'No disponible'
    },
    financialPending: {
      totalMultas: unified.totalMultas || 0,
      detalleMultas: unified.detalleMultas || [],
      valorMatricula: (sri as any).total || 0,
      estadoPagoSRI: (sri as any).estado || 'PENDIENTE'
    },
    appointments: amt
  };
}
