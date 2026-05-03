export interface DatosEmpresa {
    noveno_digito: number;
    estado_conciliacion: 'Completado' | 'Pendiente';
    total_pagar?: number;
    estado_general?: string;
}

export interface DatosVehiculo {
    ultimo_digito: number;
    estado_general?: string;
    marca?: string;
    modelo?: string;
    anio?: number;
    color?: string;
    clase?: string;
    servicio?: string;
    provincia?: string;
    fuente?: 'real' | 'estimado';
    cilindraje?: string;
    pais?: string;
    tipo_uso?: string;
    chasis?: string;
    ramv_cpn?: string;
}

export type EntidadMonitoreada = 
  | { 
      tipo_identificador: 'RUC'; 
      identificador: string; 
      nombre_alias: string; 
      datos_extra: DatosEmpresa;
      sync_status?: string;
      sync_message?: string;
    }
  | { 
      tipo_identificador: 'PLACA'; 
      identificador: string; 
      nombre_alias: string; 
      datos_extra: DatosVehiculo;
      sync_status?: string;
      sync_message?: string;
    };

export interface PasoCiclo {
    id: string;
    titulo: string;
    completado: boolean;
    orden: number;
}

export interface HistorialServicio {
    id: string;
    periodo: string;
    fecha_cierre: string;
    comentario: string;
}

export interface AdjuntoCiclo {
    id: string;
    nombre_archivo: string;
    url_archivo: string;
}

export interface CicloActividad {
    id: string;
    nombre: string;
    estado: string;
    entidades_monitoreadas: EntidadMonitoreada;
    pasos_ciclo?: PasoCiclo[];
    historial_servicio?: HistorialServicio[];
    adjuntos_ciclo?: AdjuntoCiclo[];
    calculo?: any;
    total_multas?: number;
    detalle_multas?: any[];
    valor_matricula?: number;
    estado_pago_sri?: string;
    fecha_turno?: string;
    centro_rtv?: string;
}
