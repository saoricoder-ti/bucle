import * as cheerio from 'cheerio';

export interface FineDetail {
  fecha: string;
  infraccion: string;
  valor: number;
}

export interface FineData {
  tieneMultas: boolean;
  totalMultas: number;
  detalleMultas: FineDetail[];
}

/**
 * Scrapes vehicle fines from AxisCloud portal.
 * @param placa Vehicle plate
 */
export async function scrapeFines(placa: string): Promise<FineData> {
  const normalizedPlate = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
  
  const url = 'https://servicios.axiscloud.ec/AutoServicio/inicio.jsp?ps_empresa=16&ps_accion=P55';
  let timeoutId: any;
  
  try {
    const body = new URLSearchParams({
      ps_empresa: '16',
      ps_accion: 'P55',
      filtro_busqueda: 'PL',
      valor_busqueda: normalizedPlate
    });

    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': url,
        'Origin': 'https://servicios.axiscloud.ec',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: body.toString(),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Error de conexión con el servicio de tránsito');
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // 1. Extract Total Debt
    // Based on research, we look for "TOTAL DEUDA:" or similar.
    // In many AxisCloud versions, it's in a specific div or table cell.
    let totalMultas = 0;
    const totalText = $('.text-right').filter((i, el) => $(el).prev().text().includes('TOTAL DEUDA')).text();
    if (totalText) {
      totalMultas = parseFloat(totalText.replace('$', '').replace(',', '').trim()) || 0;
    }

    // 2. Extract Detailed Infractions
    // Looking for a table with rows that contain fine details.
    const detalleMultas: FineDetail[] = [];
    
    // We target the table in the "Pendientes" area.
    // Usually, these tables have <thead> with "Fecha", "Infracción", "Valor".
    $('table.table tr').each((i, row) => {
      const cols = $(row).find('td');
      if (cols.length >= 3) {
        const fecha = $(cols[0]).text().trim();
        const infraccion = $(cols[1]).text().trim();
        const valorStr = $(cols[cols.length - 1]).text().trim();
        const valor = parseFloat(valorStr.replace('$', '').replace(',', '').trim());

        if (fecha && infraccion && !isNaN(valor)) {
          detalleMultas.push({ fecha, infraccion, valor });
        }
      }
    });

    return {
      tieneMultas: totalMultas > 0 || detalleMultas.length > 0,
      totalMultas,
      detalleMultas
    };

  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('[FineScraper] Error:', error.message);
    // Return empty results instead of throwing, allowing other sources to proceed
    return {
      tieneMultas: false,
      totalMultas: 0,
      detalleMultas: []
    };
  }
}
