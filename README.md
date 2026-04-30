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

## ✨ Funcionalidades Implementadas (30 Abril 2026)

### 🔍 Módulo RTV — Revisión Técnica Vehicular

#### Extractor de Datos Vehiculares (Scraper Resiliente)
- **Consulta con Timeout**: petición HTTP real a `consultasecuador.com` con `AbortController` de 8 segundos. Si el sitio externo no responde, la operación se cancela sin bloquear al usuario.
- **Estrategia de Fallback**: si el scraper falla, el sistema activa automáticamente la estimación provincial basada en la codificación de la placa (provincia + tipo de servicio).
- **Detección de CAPTCHA**: si la placa termina en `7`, el sistema simula un bloqueo y activa el flujo de validación manual.
- **Fuente de datos**: cada ficha técnica se persiste en Supabase con el campo `fuente: 'real' | 'estimado' | 'manual'`.

#### Ficha Técnica Oficial
- Grid responsivo (`grid-cols-1 md:grid-cols-2`) con tarjetas de Intrinsic Sizing — sin truncado de texto.
- Campos básicos: **Marca/Modelo, Año, Color, Clase**.
- Campos avanzados (acordeón animado con Framer Motion): **Cilindraje, País de Origen, Tipo de Uso, Chasis/RAMV**.
- El texto del titular del drawer (`Chevrolet Spark GT`) y el icono del auto **se actualizan en tiempo real** sin cerrar el panel.

#### Iconografía Dinámica por Color
- El ícono del vehículo en el header del drawer cambia de color automáticamente según el dato extraído (`ROJO` → fondo rojo, `NEGRO` → zinc oscuro, etc.).
- Animación `spring` de Framer Motion al actualizar.

#### Vista Previa del Vehículo
- Imagen real obtenida desde **Unsplash** mediante un proxy en el backend (`GET /api/imagen/vehiculo?q=`).
- El backend resuelve el redirect 302 de `source.unsplash.com` y devuelve la URL CDN directa.
- Estados: Skeleton → imagen con blur-to-clear + zoom suave → fallback ilustrado si falla.

#### Gatekeeper de Multas (AxisCloud)
- El Paso 1 (Pago de Multas) bloquea el avance del ciclo hasta su verificación.
- Botón que copia la placa al portapapeles y abre `servicios.axiscloud.ec` simultáneamente.
- Switch de confirmación con **Optimistic UI**: se marca inmediatamente y revierte si el backend falla.

#### Flujo CAPTCHA con Formulario Manual
- Banner naranja con botón de acceso directo al portal oficial.
- Formulario de rescate pre-llenado (Marca, Modelo, Año, Clase) para ingresar los datos visualmente extraídos.
- Al guardar, se persiste en Supabase con `fuente: 'manual'` y el drawer se actualiza al instante.

### 📊 Dashboard Principal

#### Registro de Nuevos Activos
- Botón **"+ Agregar Nuevo Auto"** en la cabecera del dashboard.
- Modal que solicita solo la placa y crea en Supabase: `entidad → ciclo → 3 pasos predeterminados`.

#### Sincronización Reactiva (Single Source of Truth)
- `fetchCiclos` usa `useCallback` + `useRef` para evitar el problema de **stale closure** al actualizar `selectedCiclo`.
- Cuando el scraper actualiza un vehículo, la tarjeta del dashboard recibe el nuevo `nombre_alias` y anima el texto con `AnimatePresence`.
- Badge **"✦ Actualizado"** en indigo con animación pulsante temporal (1.8 s) para indicar cambios en tiempo real.

### 🧠 Motor de Reglas (`engine.ts`)
- **SRI**: vencimiento calculado por 9no dígito del RUC.
- **RTV**: asignación de mes según último dígito de placa + conteo de pasos.
- **Exoneración automática**: vehículos con menos de 4 años se marcan como exonerados sin intervención manual.

---

## 🛠️ Instalación Local

### Prerrequisitos
- Node.js v18+
- Cuenta Supabase con las tablas del esquema

### 1. Base de Datos
Ejecuta `supabase_schema.sql` en el SQL Editor de tu proyecto Supabase.

### 2. Variables de Entorno
Crea `backend/.env` con:
```env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGci...
PORT=3001
```

### 3. Backend
```bash
cd backend
npm install
npx ts-node src/server.ts
# → http://localhost:3001
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

---

## 🔌 Endpoints del Backend

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/dashboard` | Devuelve todos los ciclos procesados por el motor |
| `GET` | `/api/vehiculos/info/:placa` | Scraping + persistencia de ficha técnica |
| `POST` | `/api/vehiculos` | Crea nuevo activo vehicular con ciclo inicial |
| `POST` | `/api/vehiculos/manual` | Guarda ficha técnica ingresada manualmente |
| `POST` | `/api/multas/verificar` | Marca el paso de multas como completado |
| `GET` | `/api/imagen/vehiculo?q=` | Resuelve URL de imagen desde Unsplash |

---

## 🛡️ Arquitectura TypeScript

Polimorfismo tipado mediante **Discriminated Unions**:

```typescript
export type EntidadMonitoreada =
  | { tipo_identificador: 'RUC';   datos_extra: DatosRUC }
  | { tipo_identificador: 'PLACA'; datos_extra: DatosVehiculo };

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
