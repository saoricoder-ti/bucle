-- Eliminar tablas si existen (para facilitar reinicios)
DROP TABLE IF EXISTS adjuntos_ciclo CASCADE;
DROP TABLE IF EXISTS historial_servicio CASCADE;
DROP TABLE IF EXISTS pasos_ciclo CASCADE;
DROP TABLE IF EXISTS ciclos_actividad CASCADE;
DROP TABLE IF EXISTS entidades_monitoreadas CASCADE;
DROP TABLE IF EXISTS categorias_bucle CASCADE;

-- 1. Categorías Bucle
CREATE TABLE categorias_bucle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Entidades Monitoreadas (RUC o PLACA unificadas)
CREATE TABLE entidades_monitoreadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID REFERENCES categorias_bucle(id) ON DELETE SET NULL,
    tipo_identificador VARCHAR(20) NOT NULL CHECK (tipo_identificador IN ('RUC', 'PLACA')),
    identificador VARCHAR(50) NOT NULL,
    nombre_alias VARCHAR(150),
    datos_extra JSONB, -- RTV: {"ultimo_digito": 5, "estado_general": "Pendiente Matrícula"} | SRI: {"noveno_digito": 4, "estado_conciliacion": "Completado", "estado_general": "Por Declarar"}
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ciclos de Actividad (El proceso que se repite)
CREATE TABLE ciclos_actividad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad_id UUID REFERENCES entidades_monitoreadas(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    estado VARCHAR(50) DEFAULT 'ACTIVO',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Pasos del Ciclo (Stepper detallado de validaciones)
CREATE TABLE pasos_ciclo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID REFERENCES ciclos_actividad(id) ON DELETE CASCADE,
    titulo VARCHAR(150) NOT NULL,
    completado BOOLEAN DEFAULT FALSE,
    orden INT DEFAULT 1,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Historial Cronológico (Cierres de bucle años/meses anteriores)
CREATE TABLE historial_servicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID REFERENCES ciclos_actividad(id) ON DELETE CASCADE,
    periodo VARCHAR(50) NOT NULL, -- ej. "Año 2024", "Febrero 2026"
    fecha_cierre DATE NOT NULL,
    comentario TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Adjuntos del Ciclo (Documentos)
CREATE TABLE adjuntos_ciclo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID REFERENCES ciclos_actividad(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    url_archivo TEXT NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DATOS DE PRUEBA (MOCK DATA - FASE 4 UNIFICADO)
INSERT INTO categorias_bucle (id, nombre) VALUES 
('11111111-1111-1111-1111-111111111111', 'Impuestos'),
('22222222-2222-2222-2222-222222222222', 'Vehículos');

INSERT INTO entidades_monitoreadas (id, categoria_id, tipo_identificador, identificador, nombre_alias, datos_extra) VALUES 
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'RUC', '1790011647001', 'Soluciones Tech S.A.', '{"noveno_digito": 4, "estado_conciliacion": "Completado", "estado_general": "Por Declarar", "total_pagar": 1250.40}'),
('55555555-5555-5555-5555-555555555555', '22222222-2222-2222-2222-222222222222', 'PLACA', 'PBW-5675', 'Mazda 3', '{"ultimo_digito": 5, "estado_general": "Pendiente Matrícula"}');

INSERT INTO ciclos_actividad (id, entidad_id, nombre) VALUES 
('77777777-7777-7777-7777-777777777771', '33333333-3333-3333-3333-333333333333', 'Declaración IVA Mensual'),
('77777777-7777-7777-7777-777777777773', '55555555-5555-5555-5555-555555555555', 'Revisión Técnica Vehicular');

-- PASOS RTV (4 Pasos Obligatorios)
INSERT INTO pasos_ciclo (ciclo_id, titulo, completado, orden) VALUES 
('77777777-7777-7777-7777-777777777773', 'Paso 1: Pago de Multas (ANT/Municipales)', true, 1),
('77777777-7777-7777-7777-777777777773', 'Paso 2: Pago de Matrícula (SRI)', true, 2),
('77777777-7777-7777-7777-777777777773', 'Paso 3: Generación de Turno RTV', false, 3),
('77777777-7777-7777-7777-777777777773', 'Paso 4: Aprobación de Revisión', false, 4);

-- PASOS SRI (Validaciones)
INSERT INTO pasos_ciclo (ciclo_id, titulo, completado, orden) VALUES 
('77777777-7777-7777-7777-777777777771', 'Validación 1: Facturación Electrónica', true, 1),
('77777777-7777-7777-7777-777777777771', 'Validación 2: Conciliación Bancaria', true, 2),
('77777777-7777-7777-7777-777777777771', 'Validación 3: Borrador Formulario', false, 3);

-- HISTORIAL CRONOLÓGICO
INSERT INTO historial_servicio (ciclo_id, periodo, fecha_cierre, comentario) VALUES 
('77777777-7777-7777-7777-777777777773', 'Año 2024', '2024-05-15', 'Aprobado condicionado (luces) - Subsanado.'),
('77777777-7777-7777-7777-777777777773', 'Año 2025', '2025-05-10', 'Aprobado sin novedades.'),

('77777777-7777-7777-7777-777777777771', 'Enero 2026', '2026-02-14', 'Declaración a tiempo, sin multas.'),
('77777777-7777-7777-7777-777777777771', 'Febrero 2026', '2026-03-12', 'Generó saldo a favor.');

-- DOCUMENTOS ADJUNTOS
INSERT INTO adjuntos_ciclo (ciclo_id, nombre_archivo, url_archivo) VALUES 
('77777777-7777-7777-7777-777777777773', 'Matricula_2025.pdf', '#'),
('77777777-7777-7777-7777-777777777773', 'Pago_Multas_Marzo.pdf', '#'),
('77777777-7777-7777-7777-777777777771', 'Declaracion_Previa.pdf', '#'),
('77777777-7777-7777-7777-777777777771', 'Reporte_Ventas_Feb.xlsx', '#');
