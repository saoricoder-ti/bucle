/**
 * Maps Spanish vehicle color names (as returned by the scraper) to
 * Tailwind CSS classes for icon text color and background.
 */
export interface VehicleColorClasses {
  text: string;
  bg: string;
  border: string;
}

const COLOR_MAP: Record<string, VehicleColorClasses> = {
  'BLANCO':   { text: 'text-slate-500',  bg: 'bg-slate-100',  border: 'border-slate-200' },
  'NEGRO':    { text: 'text-zinc-800',   bg: 'bg-zinc-200',   border: 'border-zinc-300'  },
  'GRIS':     { text: 'text-slate-600',  bg: 'bg-slate-200',  border: 'border-slate-300' },
  'PLATEADO': { text: 'text-slate-500',  bg: 'bg-slate-150',  border: 'border-slate-200' },
  'ROJO':     { text: 'text-red-600',    bg: 'bg-red-50',     border: 'border-red-200'   },
  'AZUL':     { text: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200'  },
  'AMARILLO': { text: 'text-amber-500',  bg: 'bg-amber-50',   border: 'border-amber-200' },
  'VERDE':    { text: 'text-emerald-600',bg: 'bg-emerald-50', border: 'border-emerald-200'},
  'NARANJA':  { text: 'text-orange-600', bg: 'bg-orange-50',  border: 'border-orange-200'},
  'MORADO':   { text: 'text-purple-600', bg: 'bg-purple-50',  border: 'border-purple-200'},
  'CAFE':     { text: 'text-amber-800',  bg: 'bg-amber-100',  border: 'border-amber-300' },
  'MARRON':   { text: 'text-amber-800',  bg: 'bg-amber-100',  border: 'border-amber-300' },
  'PERLA':    { text: 'text-slate-400',  bg: 'bg-slate-50',   border: 'border-slate-100' },
};

const FALLBACK: VehicleColorClasses = {
  text:   'text-slate-400',
  bg:     'bg-slate-50',
  border: 'border-slate-200',
};

/**
 * Returns Tailwind CSS color classes for a vehicle icon based on the
 * scraped color string.
 * @param colorName  Color string in Spanish (e.g. 'GRIS', 'Rojo', 'desconocido')
 * @param fuente     Data source — 'estimado' forces the neutral fallback
 */
export function getVehicleColorClass(
  colorName?: string,
  fuente?: string
): VehicleColorClasses {
  if (!colorName || fuente === 'estimado') return FALLBACK;

  const key = colorName
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .trim();

  return COLOR_MAP[key] ?? FALLBACK;
}
