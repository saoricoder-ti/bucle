require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseKey || 'placeholder');

// --- LÓGICA DEL ENGINE UNIFICADO ---

function calcularSRI(novenoDigito) {
    if (typeof novenoDigito !== 'number') return null;
    let dia = (novenoDigito * 2) + 8;
    if (novenoDigito === 0) dia = 28;
    
    const hoy = new Date();
    let anio = hoy.getFullYear();
    let mes = hoy.getMonth() + 1; 
    if (mes > 11) { mes = 0; anio++; }
    
    const fechaVencimiento = new Date(anio, mes, dia);
    
    const diffTime = fechaVencimiento - hoy;
    const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Porcentaje visual (asumiendo 30 días como 100%)
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

function calcularRTV(ultimoDigito, pasos) {
    if (typeof ultimoDigito !== 'number') return null;
    
    const mapaMeses = {1:1, 2:2, 3:3, 4:4, 5:5, 6:6, 7:7, 8:8, 9:9, 0:10};
    const mesVencimiento = mapaMeses[ultimoDigito];
    const anio = new Date().getFullYear();
    const fechaVencimiento = new Date(anio, mesVencimiento + 1, 0); // Último día del mes
    
    const nombresMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Cálculo por Pasos (Stepper)
    let completados = 0;
    const total = pasos.length;
    if (total > 0) {
        completados = pasos.filter(p => p.completado).length;
    }
    const porcentaje = total > 0 ? (completados / total) * 100 : 0;

    return {
        porcentaje: Math.round(porcentaje),
        texto_principal: `${porcentaje}%`,
        texto_secundario: `Mes: ${nombresMeses[mesVencimiento]}`
    };
}

function aplicarEngine(ciclo) {
    const entidad = ciclo.entidades_monitoreadas;
    if (!entidad || !entidad.datos_extra) return ciclo;

    if (entidad.tipo_identificador === 'RUC') {
        ciclo.calculo = calcularSRI(entidad.datos_extra.noveno_digito);
    } else if (entidad.tipo_identificador === 'PLACA') {
        ciclo.calculo = calcularRTV(entidad.datos_extra.ultimo_digito, ciclo.pasos_ciclo || []);
    }

    return ciclo;
}

// --- ENDPOINTS ---

app.get('/api/dashboard', async (req, res) => {
    try {
        const { data: ciclos, error } = await supabase
            .from('ciclos_actividad')
            .select(`
                id,
                nombre,
                estado,
                entidades_monitoreadas (
                    id,
                    tipo_identificador,
                    identificador,
                    nombre_alias,
                    datos_extra
                ),
                pasos_ciclo (
                    id,
                    titulo,
                    completado,
                    orden
                ),
                historial_servicio (
                    id,
                    periodo,
                    fecha_cierre,
                    comentario
                ),
                adjuntos_ciclo (
                    id,
                    nombre_archivo,
                    url_archivo
                )
            `);

        if (error) throw error;

        // Formatear respuesta
        const ciclosProcesados = ciclos.map(c => {
            if (c.pasos_ciclo) c.pasos_ciclo.sort((a, b) => a.orden - b.orden);
            if (c.historial_servicio) c.historial_servicio.sort((a, b) => new Date(b.fecha_cierre) - new Date(a.fecha_cierre));
            return aplicarEngine(c);
        });

        res.json({ success: true, data: ciclosProcesados });
    } catch (err) {
        console.error('Error al obtener dashboard:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Backend Unificado corriendo en http://localhost:${PORT}`);
});
