export interface AMTCenter {
  nombre: string;
  disponibilidad: string; // ej. "2026-05-15 08:30"
  cupos: number;
}

/**
 * Scrapes availability data from AMT Quito (web.amt.gob.ec).
 * For this prototype, we simulate the interaction with the citaPrevia portal.
 */
export async function scrapeAMTAvailability(placa: string): Promise<AMTCenter[]> {
  const normalizedPlate = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  // Real URL for reference: https://web.amt.gob.ec/web/citaPrevia/#/home
  
  try {
    // Simulation of a response from the AMT API/Portal
    const centers: AMTCenter[] = [
      { nombre: 'Los Chillos', disponibilidad: '2026-05-15 09:00', cupos: 5 },
      { nombre: 'Guamaní', disponibilidad: '2026-05-15 10:30', cupos: 2 },
      { nombre: 'San Isidro', disponibilidad: '2026-05-16 08:00', cupos: 12 },
      { nombre: 'Florida Alta', disponibilidad: '2026-05-17 14:00', cupos: 0 },
      { nombre: 'Carapungo', disponibilidad: '2026-05-18 11:15', cupos: 8 }
    ];

    return centers;
  } catch (error) {
    console.error('[AMTScraper] Error fetching availability:', error);
    return [];
  }
}
