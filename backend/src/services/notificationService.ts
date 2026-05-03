import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function evaluateAlerts(entidadId: string, fullData: any) {
  const alerts: any[] = [];
  const { technicalSpecs, financialPending, legalStatus } = fullData;
  const now = new Date();

  // 1. Alerta de Caducidad de Matrícula (< 30 días)
  if (legalStatus.fecha_caducidad) {
    const expiryDate = new Date(legalStatus.fecha_caducidad);
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 30 && diffDays > 0) {
      alerts.push({
        entidad_id: entidadId,
        tipo: 'CADUCIDAD',
        prioridad: 'ALTA',
        titulo: 'Matrícula por Caducar',
        mensaje: `Tu matrícula vence en ${diffDays} días (${legalStatus.fecha_caducidad}). ¡Evita multas por calendarización!`
      });
    }
  }

  // 2. Alerta de Multas Nuevas (Si el total > 0)
  // Nota: Para la demo, si detectamos multas > 0 disparamos la alerta si no existe una reciente
  if (financialPending.totalMultas > 0) {
    alerts.push({
      entidad_id: entidadId,
      tipo: 'MULTA_NUEVA',
      prioridad: 'ALTA',
      titulo: 'Nuevas Multas Detectadas',
      mensaje: `Se han detectado multas pendientes por un total de $${financialPending.totalMultas.toFixed(2)}.`
    });
  }

  // 3. Recordatorio de Calendario (Basado en ultimo_digito)
  const ultimoDigito = technicalSpecs.ultimo_digito;
  if (ultimoDigito !== undefined) {
    const calendarMap: { [key: number]: { mes: string; num: number } } = {
      1: { mes: 'Febrero', num: 1 },
      2: { mes: 'Marzo', num: 2 },
      3: { mes: 'Abril', num: 3 },
      4: { mes: 'Mayo', num: 4 },
      5: { mes: 'Junio', num: 5 },
      6: { mes: 'Julio', num: 6 },
      7: { mes: 'Agosto', num: 7 },
      8: { mes: 'Septiembre', num: 8 },
      9: { mes: 'Octubre', num: 9 },
      0: { mes: 'Noviembre', num: 10 }
    };

    const target = calendarMap[ultimoDigito as keyof typeof calendarMap];
    const currentMonth = now.getMonth(); // 0-indexed (Jan is 0)
    
    if (target) {
      // Meses en JS: Enero=0, Febrero=1... Mayo=4
      // Si estamos en el mes anterior o el mismo mes, alertar
      if (currentMonth + 1 === target.num) {
          alerts.push({
              entidad_id: entidadId,
              tipo: 'CALENDARIO',
              prioridad: 'NORMAL',
              titulo: `Mes de Matriculación: ${target.mes}`,
              mensaje: `Tu placa termina en ${ultimoDigito}. Este es tu mes oficial para la Revisión Técnica Vehicular.`
          });
      } else if (currentMonth + 2 === target.num) {
          alerts.push({
              entidad_id: entidadId,
              tipo: 'CALENDARIO',
              prioridad: 'NORMAL',
              titulo: `Próximo Mes: ${target.mes}`,
              mensaje: `Recuerda que el próximo mes te corresponde la matriculación por terminar en ${ultimoDigito}.`
          });
      }
    }
  }

  // Insertar alertas en la DB si no existen duplicadas recientes (simplificado para demo)
  for (const alert of alerts) {
    const { data: existing } = await supabase
      .from('notificaciones')
      .select('id')
      .eq('entidad_id', entidadId)
      .eq('tipo', alert.tipo)
      .eq('leida', false)
      .maybeSingle();

    if (!existing) {
      await supabase.from('notificaciones').insert(alert);
    }
  }

  return alerts;
}
