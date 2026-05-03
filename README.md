# ♾️ Bucle — Plataforma de Gestión Inteligente de Activos

Bucle es una plataforma empresarial para el monitoreo avanzado y gestión de activos vehiculares y tributarios en Ecuador. Simplifica el cumplimiento de obligaciones como la **Revisión Técnica Vehicular (RTV)** y las **declaraciones de impuestos (SRI)**, brindando una experiencia visual moderna, reactiva y resiliente.

> **Versión actual:** V2 — arquitectura completa en monorepo con frontend Next.js + backend Express + Supabase.

---

## 🚀 Stack Tecnológico

### Frontend (`/frontend`)
| Tecnología | Uso |
|---|---|
| [Next.js 16 (App Router)](https://nextjs.org/) | Renderizado optimizado y estructura SPA |
| **TypeScript** | Tipado estricto con Discriminated Unions |
| **Tailwind CSS** | Sistema de diseño utilitario |
| **Shadcn/ui** | Componentes accesibles (Card, Sheet, Button, Progress, Skeleton) |
| **Framer Motion** | Animaciones y transiciones fluidas |
| **Lucide React** | Iconografía vectorial |

### Backend (`/backend`)
| Tecnología | Uso |
|---|---|
| **Node.js + Express** | Servidor API REST en puerto 3001 |
| **TypeScript (ts-node)** | Seguridad de tipos en endpoints |
| **Supabase / PostgreSQL** | Persistencia de datos |
| **AbortController** | Control de timeouts en peticiones externas |

---

## 🏗️ Estructura del Monorepo

```
bucle/
├── backend/
│   ├── src/
│   │   ├── server.ts           # Servidor Express + todos los endpoints
│   │   ├── engine.ts           # Motor de reglas SRI y RTV
│   │   ├── services/
│   │   │   └── vehicleDataScraper.ts  # Scraper con timeout y fallback
│   │   └── types/
│   │       └── supabase.ts     # Tipado de entidades Supabase
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/                # Rutas Next.js (layout, page)
│   │   ├── components/
│   │   │   ├── DashboardClient.tsx   # Orquestador principal con SST
│   │   │   ├── DashboardGrid.tsx     # Tarjetas animadas de ciclos
│   │   │   ├── DetailDrawer.tsx      # Panel lateral de detalle completo
│   │   │   ├── CarImage.tsx          # Imagen del vehículo desde Unsplash
│   │   │   ├── Sidebar.tsx           # Navegación lateral
│   │   │   └── ui/                   # Componentes Shadcn
│   │   ├── lib/
│   │   │   ├── plateUtils.ts         # Decodificador de placas ecuatorianas
│   │   │   └── vehicleColorUtils.ts  # Mapeo color → clases Tailwind
│   │   └── types/
│   │       └── supabase.ts           # Tipos sincronizados con backend
│   ├── next.config.ts
│   └── package.json
└── supabase_schema.sql         # Esquema completo de la base de datos
```

---

## ✨ Funcionalidades Implementadas (3 de mayo de 2026)

### 🛡️ Persistencia y Resiliencia en DetailDrawer
- **Lógica de Bloqueo "Anti-Interrupción"**: Se implementó una orquestación de estados (`isFetchingAll`) que bloquea el cierre del panel lateral (clic fuera, tecla ESC o botón X) mientras los scrapers están en ejecución.
- **Feedback de UX Senior**: 
  - Banner superior dinámico: *"Sincronizando datos con ANT y SRI... Mantén abierta esta ventana."*
  - Desactivación visual de controles de cierre (opacidad reducida al 20% y bloqueo de eventos) durante la sincronización.
  - Overlay de carga con texto contextualizado.

### 🔍 Módulo RTV — Revisión Técnica Vehicular

#### Extractor de Datos Vehiculares (Scraper Resiliente)
- **Consulta con Timeout**: petición HTTP real a portales oficiales (ANT/SRI) con `AbortController` de 10 segundos.
- **Estrategia de Fallback**: si el scraper falla, el sistema activa automáticamente la estimación provincial basada en la codificación de la placa.
- **Detección de CAPTCHA**: flujo de validación manual integrado si se detecta bloqueo por validación humana.
- **Fuente de datos**: persistencia en Supabase con trazabilidad de origen (`real`, `estimado`, `manual`).

#### Ficha Técnica Oficial
- Grid responsivo con tarjetas de Intrinsic Sizing.
- **Sincronización en Tiempo Real**: Uso de los campos `sync_status` y `sync_message` para informar al usuario el progreso exacto del motor de sincronización.
- Campos avanzados: **Cilindraje, País de Origen, Tipo de Uso, Chasis/RAMV, Fechas de Matrícula/Caducidad**.

#### Vista Previa del Vehículo
- Integración con **Unsplash API** para visualización dinámica basada en marca, modelo y color.
- Carga progresiva con esqueletos y efectos de desenfoque.

### 📊 Dashboard y Orquestación
- **Sincronización Reactiva**: Actualización instantánea de alias y estados mediante Single Source of Truth (SST).
- **Notificaciones**: Centro de notificaciones integrado para alertas de prioridad (caducidad, multas nuevas).

---

## 🛠️ Instalación Local

### Prerrequisitos
- Node.js v18+
- Cuenta Supabase con el esquema proporcionado

### 1. Base de Datos
Ejecuta `supabase_schema.sql` en el Editor SQL de Supabase.

### 2. Backend
```bash
cd backend
npm install
npm run dev
# Puerto 3001
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
# Puerto 3000
```

---

## 🔌 Endpoints del Backend

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/dashboard` | Orquestación global de ciclos activos |
| `GET` | `/api/vehiculos/ficha/:placa` | Scraping técnico profundo (ANT) |
| `GET` | `/api/vehiculos/multas/:placa` | Consulta de multas e infracciones |
| `GET` | `/api/vehiculos/matricula/:placa` | Estado tributario y valores SRI |
| `POST` | `/api/rtv/agendar` | Gestión de turnos en centros RTV |

---

## 🛡️ Arquitectura TypeScript

Tipado estricto unificado entre Backend y Frontend:

```typescript
export type EntidadMonitoreada = 
  | { tipo_identificador: 'RUC'; ... }
  | { 
      tipo_identificador: 'PLACA'; 
      identificador: string; 
      sync_status?: string; 
      sync_message?: string;
      datos_extra: DatosVehiculo 
    };

export interface DatosVehiculo {
  ultimo_digito: number;
  marca?: string;    modelo?: string;   anio?: number;
  color?: string;    clase?: string;    servicio?: string;
  provincia?: string;
  fuente?: 'real' | 'estimado' | 'manual';
  cilindraje?: string;  pais?: string;
  tipo_uso?: string;    chasis?: string;  ramv_cpn?: string;
}
```

---

*Desarrollado con ♾️ por Saoricoder — 30 de abril de 2026*
