import { PasoCiclo } from "./types/supabase";

export interface CalculoResultado {
    porcentaje: number;
    texto_principal: string;
    texto_secundario: string;
}

export function calcularSRI(novenoDigito?: number): CalculoResultado {
    if (typeof novenoDigito !== 'number') {
        return { porcentaje: 0, texto_principal: 'Dato Faltante', texto_secundario: 'Falta noveno dígito' };
    }
    let dia = (novenoDigito * 2) + 8;
    if (novenoDigito === 0) dia = 28;
    
    const hoy = new Date();
    let anio = hoy.getFullYear();
    let mes = hoy.getMonth() + 1; 
    if (mes > 11) { mes = 0; anio++; }
    
    const fechaVencimiento = new Date(anio, mes, dia);
    const diffTime = fechaVencimiento.getTime() - hoy.getTime();
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const diasMaximos = 30;
    const diasPasados = diasMaximos - diasRestantes;
    let porcentaje = (diasPasados / diasMaximos) * 100;
    if (porcentaje > 100) porcentaje = 100;
    if (porcentaje < 0) porcentaje = 0;

    return {
        porcentaje: Math.round(porcentaje),
        texto_principal: diasRestantes > 0 ? `${diasRestantes} Días` : 'Vencido',
        texto_secundario: `Vence el ${fechaVencimiento.toLocaleDateString()}`
    };
}

export function calcularRTV(ultimoDigito?: number, pasos?: PasoCiclo[], anioVehiculo?: number): CalculoResultado {
    if (typeof ultimoDigito !== 'number') {
        return { porcentaje: 0, texto_principal: 'Dato Faltante', texto_secundario: 'Falta último dígito' };
    }
    
    const anioActual = new Date().getFullYear();
    const diffAnios = typeof anioVehiculo === 'number' ? anioActual - anioVehiculo : null;
    const exonerado = diffAnios !== null && diffAnios <= 3; // < 4 years old
    
    if (exonerado) {
        return {
            porcentaje: 100,
            texto_principal: 'Exonerado',
            texto_secundario: `Vehículo Reciente (${anioVehiculo})`
        };
    }

    const mapaMeses: Record<number, number> = {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 0:10};
    const mesVencimiento = mapaMeses[ultimoDigito] || 1;
    
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    let completados = 0;
    const total = pasos ? pasos.length : 0;
    if (total > 0 && pasos) {
        completados = pasos.filter(p => p.completado).length;
    }
    const porcentaje = total > 0 ? (completados / total) * 100 : 0;

    return {
        porcentaje: Math.round(porcentaje),
        texto_principal: `${Math.round(porcentaje)}%`,
        texto_secundario: `Mes asignado: ${nombresMeses[mesVencimiento]}`
    };
}

export function aplicarEngine(ciclo: any): any {
    const entidad = ciclo.entidades_monitoreadas;
    if (!entidad) return ciclo;

    const datosExtra = entidad.datos_extra || {};

    if (entidad.tipo_identificador === 'RUC') {
        ciclo.calculo = calcularSRI(datosExtra.noveno_digito);
    } else if (entidad.tipo_identificador === 'PLACA') {
        ciclo.calculo = calcularRTV(datosExtra.ultimo_digito, ciclo.pasos_ciclo || [], datosExtra.anio);
    }

    return ciclo;
}

