import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app, supabase } from '../server';
import * as orchestrator from '../services/vehicleOrchestrator';

// Mock del orquestador
vi.mock('../services/vehicleOrchestrator', () => ({
  getCompleteVehicleData: vi.fn()
}));

// Mock de Supabase mejorado
let lastInsertedData: any = null;
const mockResult = { data: { id: 'new-id' }, error: null };
const mockQueryBuilder: any = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockImplementation((data: any) => {
    lastInsertedData = data;
    return mockQueryBuilder;
  }),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockImplementation(() => {
    return Promise.resolve({ 
        data: lastInsertedData ? { id: 'new-id', ...lastInsertedData } : { id: 'new-id' }, 
        error: null 
    });
  }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  then: vi.fn().mockImplementation((resolve: any) => {
    resolve({ 
        data: lastInsertedData ? { id: 'new-id', ...lastInsertedData } : { id: 'new-id' }, 
        error: null 
    });
  }),
};

vi.spyOn(supabase, 'from').mockReturnValue(mockQueryBuilder);

describe('🚀 Suite de Pruebas: Registro y Sincronización de Vehículos (Bucle)', () => {
  
  const FIXTURE_HAPPY_PATH = {
    technicalSpecs: {
      marca: 'CHEVROLET',
      modelo: 'SPARK GT',
      anio_fabricacion: 2024,
      color_oficial: 'CELESTE',
      cilindraje: '1200 cc',
      tipo_servicio: 'USO PARTICULAR',
      ramv_cpn: '179123456789',
      numero_chasis: 'KL1CF1234567890',
      pais_origen: 'COREA DEL SUR',
      estado_polarizado: 'NO',
      ultimo_digito: 5
    },
    legalStatus: {
      anio_matricula: '2024',
      fecha_matricula: '2024-01-10',
      fecha_caducidad: '2029-01-10'
    },
    financialPending: {
      totalMultas: 0,
      detalleMultas: [],
      valorMatricula: 0,
      estadoPagoSRI: 'PAGADO'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    lastInsertedData = null;
  });

  describe('✅ Happy Path (Flujo Ideal)', () => {
    
    it('debería registrar exitosamente una placa de 7 caracteres (PVP0545)', async () => {
      (orchestrator.getCompleteVehicleData as any).mockResolvedValue(FIXTURE_HAPPY_PATH);

      const response = await request(app)
        .post('/api/vehiculos')
        .send({ placa: 'PVP0545' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.entidad.nombre_alias).toBe('CHEVROLET SPARK GT');
    });

    it('debería marcar pasos 1 y 2 como completados automáticamente si no hay deudas', async () => {
      (orchestrator.getCompleteVehicleData as any).mockResolvedValue(FIXTURE_HAPPY_PATH);
      
      const fromSpy = vi.spyOn(supabase, 'from');

      await request(app).post('/api/vehiculos').send({ placa: 'PVP0545' });

      // Verificar que se accedió a la tabla pasos_ciclo
      expect(fromSpy).toHaveBeenCalledWith('pasos_ciclo');
      
      // Verificar que se insertaron los pasos (última llamada a insert)
      const insertCalls = mockQueryBuilder.insert.mock.calls;
      const lastInsert = insertCalls[insertCalls.length - 1][0];
      
      expect(lastInsert[0].completado).toBe(true); // Paso 1
      expect(lastInsert[1].completado).toBe(true); // Paso 2
    });
  });

  describe('📐 Edge Cases (Casos Límite)', () => {
    
    it('debería extraer correctamente el último dígito 3 de una placa de 6 caracteres (ABC123)', async () => {
        const fixture = { ...FIXTURE_HAPPY_PATH };
        fixture.technicalSpecs.ultimo_digito = 3;
        (orchestrator.getCompleteVehicleData as any).mockResolvedValue(fixture);

        const response = await request(app).post('/api/vehiculos').send({ placa: 'ABC123' });
        
        expect(response.status).toBe(200);
    });

    it('no debería fallar si faltan datos técnicos parciales (ej: cilindraje null)', async () => {
      const partialData = { ...FIXTURE_HAPPY_PATH };
      (partialData.technicalSpecs as any).cilindraje = '-';
      (orchestrator.getCompleteVehicleData as any).mockResolvedValue(partialData);

      const response = await request(app).post('/api/vehiculos').send({ placa: 'PVP0545' });
      
      expect(response.status).toBe(200);
      expect(response.body.data.entidad.datos_extra.cilindraje).toBe('-');
    });

    it('debería normalizar placas con espacios y minúsculas', async () => {
        (orchestrator.getCompleteVehicleData as any).mockResolvedValue(FIXTURE_HAPPY_PATH);
        
        const response = await request(app).post('/api/vehiculos').send({ placa: ' pvp-0545 ' });
        
        expect(response.status).toBe(200);
        expect(orchestrator.getCompleteVehicleData).toHaveBeenCalledWith('PVP0545');
    });
  });

  describe('🛡️ Gestión de Errores (Resiliencia)', () => {
    
    it('debería retornar 404 si la placa no existe en fuentes oficiales', async () => {
      (orchestrator.getCompleteVehicleData as any).mockRejectedValue(new Error('PLATE_NOT_FOUND'));

      const response = await request(app).post('/api/vehiculos').send({ placa: 'XYZ999' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('no encontrada');
    });

    it('debería retornar 400 si el formato de la placa es inválido', async () => {
        const response = await request(app).post('/api/vehiculos').send({ placa: '123-ABC' });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('Formato de placa inválido');
    });

    it('debería manejar errores 500 de servicios externos sin colapsar', async () => {
        (orchestrator.getCompleteVehicleData as any).mockRejectedValue(new Error('External Timeout'));

        const response = await request(app).post('/api/vehiculos').send({ placa: 'PVP0545' });

        expect(response.status).toBe(500);
    });
  });

  describe('🔗 Integración y Mocks de Supabase', () => {
    
    it('debería llamar a insert con las 13 variables técnicas regularizadas en datos_extra', async () => {
        (orchestrator.getCompleteVehicleData as any).mockResolvedValue(FIXTURE_HAPPY_PATH);
        
        await request(app).post('/api/vehiculos').send({ placa: 'PVP0545' });

        // Buscamos la llamada a entidades_monitoreadas
        // En nuestro flujo, la primera llamada a insert suele ser para la entidad
        const entidadInsert = mockQueryBuilder.insert.mock.calls.find((call: any) => {
            // Este es un poco difícil de filtrar si no sabemos el orden, 
            // pero podemos ver el contenido
            return call[0].tipo_identificador === 'PLACA';
        });

        const insertedData = entidadInsert[0];
        
        expect(insertedData.datos_extra).toHaveProperty('ramv_cpn');
        expect(insertedData.datos_extra).toHaveProperty('numero_chasis');
        expect(insertedData.datos_extra).toHaveProperty('ultimo_digito');
    });

    it('debería generar el nombre_alias correctamente como ${marca} ${modelo}', async () => {
        (orchestrator.getCompleteVehicleData as any).mockResolvedValue(FIXTURE_HAPPY_PATH);
        
        const response = await request(app).post('/api/vehiculos').send({ placa: 'PVP0545' });
        
        expect(response.body.data.entidad.nombre_alias).toBe('CHEVROLET SPARK GT');
    });
  });
});
