# ♾️ Proyecto Bucle - Gestión Integral de Activos

Bucle es una plataforma unificada diseñada para el monitoreo avanzado y la gestión de activos, enfocada específicamente en simplificar el cumplimiento de obligaciones como la Revisión Técnica Vehicular (RTV) y las declaraciones de impuestos (SRI) en Ecuador.

## 🚀 Características Principales

*   **Layout Moderno de 3 Columnas:** Una interfaz limpia que maximiza el espacio en pantalla con una barra lateral de navegación, un grid central interactivo y un panel lateral derecho (Drawer) para detalles profundos.
*   **Motor Híbrido de Cálculos:** 
    *   **Impuestos (RUC):** El motor calcula los días restantes hacia la fecha de declaración usando la regla oficial del 9no dígito, indicando también el estado de conciliación bancaria.
    *   **Vehículos (Placa):** El motor utiliza una lógica de *stepper* calculando el porcentaje de preparación basado en la compleción de 4 pasos obligatorios (Multas, Matrícula, Turno, Revisión).
*   **Visualización Dinámica:** Tarjetas polimórficas que cambian su interfaz (Medidores SVG circulares o barras de progreso lineal) dependiendo del tipo de identificador.
*   **Tracking Histórico:** Un sistema de bitácora que registra cierres de bucle pasados para tener auditoría de mantenimientos y declaraciones.

## 🏗️ Arquitectura del Sistema

El proyecto está dividido en dos módulos claramente separados:

### 1. Cliente (`/front`)
Construido con un enfoque minimalista y de alto rendimiento.
*   **Tecnologías:** HTML5, Vanilla JavaScript, Tailwind CSS (vía CDN para desarrollo rápido).
*   **Estructura:**
    *   `index.html`: Define la cuadrícula CSS/Flexbox de 3 columnas fijas.
    *   `scripts.js`: Lógica de consumo de API (fetch), renderizado dinámico del DOM y manejo de animaciones/transiciones del panel lateral.

### 2. Servidor (`/back`)
Una API REST ligera que procesa las reglas de negocio antes de enviar la información al frontend.
*   **Tecnologías:** Node.js, Express, `@supabase/supabase-js`, `dotenv`.
*   **Estructura:**
    *   `server.js`: Contiene el "Engine Híbrido" (`calcularSRI`, `calcularRTV`) y el endpoint unificado `GET /api/dashboard`.

### 3. Base de Datos (Supabase / PostgreSQL)
Un esquema relacional flexible:
*   `categorias_bucle`: Impuestos, Vehículos, etc.
*   `entidades_monitoreadas`: Almacena el Activo (ej. Mazda 3) y sus metadatos (`datos_extra` JSON).
*   `ciclos_actividad`: Los procesos que se repiten (ej. "Revisión Técnica").
*   `pasos_ciclo`: Validaciones o requisitos para completar un ciclo.
*   `historial_servicio`: Cierres de bucles pasados.
*   `adjuntos_ciclo`: Enlaces a documentos y evidencias (PDFs, Excels).

---

## 🛠️ Instalación y Uso Local

### Prerrequisitos
- Node.js (v18+)
- Cuenta en Supabase

### Pasos de Configuración

1. **Base de Datos:**
   - Ve a tu proyecto en [Supabase](https://supabase.com/).
   - Abre el SQL Editor y ejecuta el contenido completo del archivo `supabase_schema.sql` que se encuentra en la raíz del proyecto. Esto creará las tablas e insertará datos simulados (Mock Data).

2. **Backend:**
   - Navega a la carpeta del servidor:
     ```bash
     cd back
     ```
   - Instala las dependencias:
     ```bash
     npm install
     ```
   - Crea un archivo `.env` basándote en el formato esperado y añade tus credenciales de Supabase:
     ```env
     PORT=3000
     SUPABASE_URL=tu_url_de_supabase
     SUPABASE_ANON_KEY=tu_anon_key_de_supabase
     ```
   - Inicia el servidor:
     ```bash
     node server.js
     ```

3. **Frontend:**
   - Asegúrate de que el backend esté corriendo.
   - Abre el archivo `/front/index.html` en tu navegador web. (Para una mejor experiencia, utiliza extensiones como Live Server).

## 🎨 Decisiones de Diseño (UI/UX)
- **Paleta de Colores Corporativa:** Fondo `gray-50` (#F9FAFB), tarjetas blancas con sombras ligeras, acentos en Azul (`blue-600`) para SRI y Morado (`purple-600`) para RTV, indicando éxito con Verde Esmeralda (`emerald-500`).
- **Tipografía:** Se emplea la familia *Inter* (Google Fonts) para legibilidad extrema y aspecto moderno.
- **Micro-interacciones:** Transiciones fluidas en el Hover de las tarjetas y deslizamiento del panel lateral derecho para no abrumar al usuario con información.
