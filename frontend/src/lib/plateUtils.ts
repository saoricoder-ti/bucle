export interface PlateInfo {
  province: string;
  serviceType: string;
  colorTheme: 'orange' | 'gold' | 'green' | 'white' | 'slate';
  hasRestrictionToday: boolean;
  restrictionDay: string;
}

export const ECUADOR_PROVINCES: Record<string, string> = {
  A: 'Azuay (Cuenca)',
  B: 'Bolívar (Guaranda)',
  C: 'Carchi (Tulcán)',
  E: 'Esmeraldas (Esmeraldas)',
  G: 'Guayas (Guayaquil)',
  H: 'Chimborazo (Riobamba)',
  I: 'Imbabura (Ibarra)',
  K: 'Sucumbíos (Nueva Loja)',
  L: 'Loja (Loja)',
  M: 'Manabí (Portoviejo)',
  N: 'Napo (Tena)',
  O: 'El Oro (Machala)',
  P: 'Pichincha (Quito)',
  Q: 'Orellana (Puerto Francisco de Orellana)',
  R: 'Los Ríos (Babahoyo)',
  S: 'Pastaza (Puyo)',
  T: 'Tungurahua (Ambato)',
  U: 'Cañar (Azogues)',
  V: 'Morona Santiago (Macas)',
  W: 'Galápagos (Puerto Baquerizo Moreno)',
  X: 'Cotopaxi (Latacunga)',
  Y: 'Santa Elena (Santa Elena)',
  Z: 'Zamora Chinchipe (Zamora)'
};

const RESTRICTED_DAYS: Record<number, { dayName: string, dayIndex: number }> = {
  1: { dayName: 'Lunes', dayIndex: 1 },
  2: { dayName: 'Lunes', dayIndex: 1 },
  3: { dayName: 'Martes', dayIndex: 2 },
  4: { dayName: 'Martes', dayIndex: 2 },
  5: { dayName: 'Miércoles', dayIndex: 3 },
  6: { dayName: 'Miércoles', dayIndex: 3 },
  7: { dayName: 'Jueves', dayIndex: 4 },
  8: { dayName: 'Jueves', dayIndex: 4 },
  9: { dayName: 'Viernes', dayIndex: 5 },
  0: { dayName: 'Viernes', dayIndex: 5 }
};

export function decodeEcuadorianPlate(plate: string): PlateInfo | null {
  if (!plate || plate.length < 6) return null;
  
  const normalizedPlate = plate.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalizedPlate.length < 6) return null;

  const firstLetter = normalizedPlate.charAt(0);
  const secondLetter = normalizedPlate.charAt(1);
  const lastDigit = parseInt(normalizedPlate.charAt(normalizedPlate.length - 1), 10);

  const province = ECUADOR_PROVINCES[firstLetter] || 'Origen no identificado';

  let serviceType = 'Particular';
  let colorTheme: PlateInfo['colorTheme'] = 'white';

  if (['A', 'Z'].includes(secondLetter)) {
    serviceType = 'Comercial (Taxis, Buses)';
    colorTheme = 'orange';
  } else if (['E', 'X'].includes(secondLetter)) {
    serviceType = 'Gubernamental / Oficial';
    colorTheme = 'gold';
  } else if (['S', 'M'].includes(secondLetter)) {
    serviceType = 'Gobierno Provincial / Municipal';
    colorTheme = 'green';
  }

  // Determine restriction
  const today = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const restriction = RESTRICTED_DAYS[lastDigit];
  const restrictionDay = restriction ? restriction.dayName : 'Ninguno';
  const hasRestrictionToday = restriction ? restriction.dayIndex === today : false;

  return {
    province,
    serviceType,
    colorTheme,
    hasRestrictionToday,
    restrictionDay
  };
}
