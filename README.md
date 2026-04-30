# ♾️ Proyecto Bucle - Gestión Integral de Activos

Bucle es una plataforma empresarial unificada diseñada para el monitoreo avanzado y la gestión de activos, enfocada en simplificar el cumplimiento de obligaciones como la Revisión Técnica Vehicular (RTV) y las declaraciones de impuestos (SRI) en Ecuador.

> **Nota:** Esta es la versión V2 de Bucle, completamente refactorizada hacia un ecosistema moderno, escalable y fuertemente tipado.

## 🚀 Tecnologías Core (V2)

La arquitectura actualiza el prototipo inicial a un stack profesional de grado producción:

*   **Frontend (`/frontend`)**: 
    *   [Next.js (App Router)](https://nextjs.org/) para renderizado optimizado y estructura SPA.
    *   **TypeScript** estricto con Uniones Discriminadas para polimorfismo seguro.
    *   **Tailwind CSS** para estilizado utilitario.
    *   **Shadcn/ui** nativo (Card, Sheet, Button, Progress, Skeleton) logrando una interfaz accesible y minimalista.
    *   **Lucide React** para iconografía vectorial.
*   **Backend (`/backend`)**:
    *   [Node.js](https://nodejs.org/) con [Express](https://expressjs.com/).
    *   **TypeScript** (`ts-node`) garantizando seguridad en los endpoints.
    *   **Supabase / PostgreSQL** para persistencia de datos.

## 🏗️ Estructura del Monorepo

El proyecto está dividido en dos micro-entornos independientes para facilitar el despliegue separado (ej. Vercel para frontend y Render/Railway para backend).

### `/frontend`
- Contiene el Layout principal de 3 columnas fijas (`Sidebar.tsx`, `DashboardGrid.tsx`, `DetailDrawer.tsx`).
- Maneja animaciones fluidas utilizando el `<Sheet>` de Shadcn para la navegación lateral.
- Consume la API del backend mediante `fetch` estándar y gestiona estados locales con React.

### `/backend`
- `src/server.ts`: Inicializa el servidor Express en el puerto 3001.
- `src/engine.ts`: Contiene la lógica pura e hibrida ("El Motor"):
    - **SRI:** Regla oficial de vencimiento por el 9no dígito.
    - **RTV:** Asignación de meses basados en el último dígito y conteo de pasos obligatorios.
- `src/types/supabase.ts`: Tipado estricto que modela la base de datos de Supabase, utilizando **Discriminated Unions** para diferenciar entre entidades `RUC` y `PLACA`.

---

## 🛠️ Instalación y Uso Local

### Prerrequisitos
- Node.js (v18+)
- Cuenta en Supabase

### 1. Base de Datos (Supabase)
Ejecuta el archivo `supabase_schema.sql` (ubicado en la raíz del proyecto original) en el SQL Editor de tu instancia de Supabase. Esto generará el esquema unificado (RUC y PLACA mezclados) y la tabla de `adjuntos_ciclo`.

### 2. Levantar el Backend (API)
```bash
cd backend
npm install
# Asegúrate de configurar el archivo ../back/.env con SUPABASE_URL y SUPABASE_ANON_KEY
npx ts-node src/server.ts
```
> El backend se ejecutará en `http://localhost:3001` y se conectará directamente a Supabase.

### 3. Levantar el Frontend (UI)
Abre una nueva terminal.
```bash
cd frontend
npm install
npm run dev
```
> El cliente web de Next.js estará disponible en `http://localhost:3000`.

## 🛡️ Principios de Arquitectura TypeScript Aplicados
El proyecto implementa polimorfismo tipado a través de **Uniones Discriminadas**. Esto asegura que el compilador conozca los campos específicos de cada entidad sin usar `any`.

Ejemplo implementado:
```typescript
export type EntidadMonitoreada = 
  | { tipo_identificador: 'RUC'; datos_extra: { noveno_digito: number, estado_conciliacion: string } }
  | { tipo_identificador: 'PLACA'; datos_extra: { ultimo_digito: number } };
```
Gracias a esto, si intentas pedir `entidad.datos_extra.noveno_digito` siendo una `PLACA`, el linter arrojará error de inmediato.
