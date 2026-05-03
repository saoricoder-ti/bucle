import { scrapeFines } from './fineScraper';
import { scrapeVehicleData } from './vehicleDataScraper';
import { scrapeANTTechnicalData } from './antScraper';

export interface UnifiedVehicleData {
  // Source A: antmultas.org (ANT/SRI Registration)
  año_fabricacion?: number | undefined;
  estado_polarizado?: string | undefined;
  color_oficial?: string | undefined;
  anio_matricula?: string | undefined;
  fecha_matricula?: string | undefined;
  fecha_caducidad?: string | undefined;
  
  // Source B: consultasecuador.com (Technical Details)
  ramv_cpn?: string | undefined;
  marca?: string | undefined;
  modelo?: string | undefined;
  cilindraje?: string | undefined;
  tipo_servicio?: string | undefined;
  pais_origen?: string | undefined;
  numero_chasis?: string | undefined;
  
  // Fines Data
  tieneMultas: boolean;
  totalMultas: number;
  detalleMultas: any[];
}

/**
 * Unified scraper that consolidates data from multiple sources to maximize accuracy.
 * Orchestrates Source A (ANT/Registration) and Source B (Technical Details).
 */
export async function scrapeUnifiedData(placa: string): Promise<UnifiedVehicleData> {
  const normalizedPlate = placa.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // 1. Fetch Source A (ANT), Source B (ConsultasEcuador) & Fines in parallel with allSettled
  const results = await Promise.allSettled([
    scrapeANTTechnicalData(normalizedPlate),
    scrapeVehicleData(normalizedPlate),
    scrapeFines(normalizedPlate)
  ]);

  // Extract results and handle failures
  const sourceA = results[0].status === 'fulfilled' ? results[0].value : null;
  const sourceB = results[1].status === 'fulfilled' ? results[1].value : null;
  const fineData = results[2].status === 'fulfilled' ? results[2].value : { tieneMultas: false, totalMultas: 0, detalleMultas: [] };

  if (results[0].status === 'rejected') console.warn(`⚠️ [UnifiedScraper] Fallo fuente ANT: ${results[0].reason}`);
  if (results[1].status === 'rejected') console.warn(`⚠️ [UnifiedScraper] Fallo fuente ConsultasEcuador: ${results[1].reason}`);
  if (results[2].status === 'rejected') console.warn(`⚠️ [UnifiedScraper] Fallo fuente Multas: ${results[2].reason}`);

  // 2. Consolidate and Map (Resilience: Proceed if any data exists)
  const result: UnifiedVehicleData = {
    // Source A mapping with B fallbacks
    año_fabricacion: sourceA?.año_fabricacion || sourceB?.anio,
    estado_polarizado: sourceA?.estado_polarizado || 'NO', 
    color_oficial: sourceA?.color_oficial || sourceB?.color || 'No disponible',
    anio_matricula: sourceA?.anio_matricula || 'No disponible',
    fecha_matricula: sourceA?.fecha_matricula || 'No disponible',
    fecha_caducidad: sourceA?.fecha_caducidad || 'No disponible',
    
    // Source B mapping with A fallbacks (Brand/Model Resilience)
    ramv_cpn: sourceB?.ramv_cpn || 'No disponible',
    marca: sourceB?.marca || (sourceA as any)?.marca || 'GENERICO',
    modelo: sourceB?.modelo || (sourceA as any)?.modelo || 'No disponible',
    cilindraje: sourceB?.cilindraje || 'No disponible',
    tipo_servicio: sourceB?.servicio || 'No disponible',
    pais_origen: sourceB?.pais || 'No disponible',
    numero_chasis: sourceB?.chasis || 'No disponible',

    // Fines
    tieneMultas: fineData.tieneMultas,
    totalMultas: fineData.totalMultas,
    detalleMultas: fineData.detalleMultas
  };

  return result;
}
