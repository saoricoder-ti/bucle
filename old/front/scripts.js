const API_URL = 'http://localhost:3000/api/dashboard';

let globalCiclos = [];

document.addEventListener('DOMContentLoaded', () => {
    fetchDashboard();
});

async function fetchDashboard() {
    const grid = document.getElementById('ciclos-grid');
    
    try {
        const response = await fetch(API_URL);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            globalCiclos = result.data;
            renderGrid(globalCiclos, grid);
        } else {
            grid.innerHTML = `<div class="col-span-full text-center py-20 text-gray-500">No hay ciclos activos.</div>`;
        }
    } catch (error) {
        console.error('Error fetching dashboard:', error);
        grid.innerHTML = `<div class="col-span-full p-4 bg-red-50 text-red-700 rounded-lg border border-red-100">Error de conexión con el backend. Asegúrate de ejecutar el servidor.</div>`;
    }
}

function renderGrid(ciclos, container) {
    container.innerHTML = '';

    ciclos.forEach((ciclo, index) => {
        const entidad = ciclo.entidades_monitoreadas;
        const calc = ciclo.calculo || { porcentaje: 0, texto_principal: '', texto_secundario: '' };
        const isRuc = entidad.tipo_identificador === 'RUC';
        
        let cardHtml = '';

        if (isRuc) {
            // TARJETA RUC (Con Gauge SVG y valor estimado)
            const estadoConc = entidad.datos_extra.estado_conciliacion || 'Pendiente';
            const badgeColor = estadoConc === 'Completado' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-orange-100 text-orange-700 border-orange-200';
            const badgeHtml = `<span class="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${badgeColor}">Conciliación: ${estadoConc}</span>`;
            
            // Valor estimado
            const totalPagar = entidad.datos_extra.total_pagar ? `$${entidad.datos_extra.total_pagar.toLocaleString('en-US', {minimumFractionDigits:2})}` : 'Por calcular';

            cardHtml = `
                <div onclick="selectCiclo(${index})" class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">${entidad.nombre_alias}</p>
                            <h4 class="font-bold text-gray-900 text-lg leading-tight">${ciclo.nombre}</h4>
                        </div>
                        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-blue-600 bg-blue-50">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center gap-4">
                        <div class="flex-1">
                            <div class="mb-3">${badgeHtml}</div>
                            <p class="text-xs text-gray-500 font-semibold uppercase mb-0.5">Impuesto Estimado</p>
                            <p class="text-xl font-black text-gray-900">${totalPagar}</p>
                        </div>

                        <div class="relative w-24 h-24 shrink-0">
                            <svg viewBox="0 0 36 36" class="circular-chart w-full h-full transform -rotate-90">
                                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                <path class="circle" stroke-dasharray="${calc.porcentaje}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" stroke="#3b82f6" />
                            </svg>
                            <div class="absolute inset-0 flex items-center justify-center flex-col">
                                <span class="text-sm font-black text-gray-800 leading-none text-center">${calc.texto_principal}</span>
                                <span class="text-[8px] text-gray-400 font-bold uppercase mt-1">RESTANTES</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // TARJETA PLACA (Modelo de auto, placa amarilla, linear progress bar)
            const placaHtml = `
                <div class="inline-block bg-[#facc15] border border-gray-900 rounded px-2 py-0.5 shadow-sm relative mt-1">
                    <span class="font-mono text-sm font-black text-gray-900 tracking-widest">${entidad.identificador}</span>
                </div>
            `;

            cardHtml = `
                <div onclick="selectCiclo(${index})" class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg transition-all transform hover:-translate-y-1">
                    <div class="flex justify-between items-start mb-6">
                        <div>
                            <p class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">${entidad.nombre_alias}</p>
                            <h4 class="font-bold text-gray-900 text-lg leading-tight">${ciclo.nombre}</h4>
                            ${placaHtml}
                        </div>
                        <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-purple-600 bg-purple-50">
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
                        </div>
                    </div>
                    
                    <div class="mt-4">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs font-bold text-gray-500 uppercase">Progreso de RTV</span>
                            <span class="text-xs font-bold text-purple-600">${calc.texto_principal}</span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2.5">
                            <div class="bg-purple-600 h-2.5 rounded-full" style="width: ${calc.porcentaje}%"></div>
                        </div>
                        <p class="text-xs text-gray-500 mt-2 font-medium">${calc.texto_secundario}</p>
                    </div>
                </div>
            `;
        }
        
        container.insertAdjacentHTML('beforeend', cardHtml);
    });
}

function selectCiclo(index) {
    const ciclo = globalCiclos[index];
    if (!ciclo) return;

    const panel = document.getElementById('right-sidebar');
    const entidad = ciclo.entidades_monitoreadas;
    const isRuc = entidad.tipo_identificador === 'RUC';
    
    const actionText = isRuc ? 'Generar Declaración' : 'Pagar Matrícula';
    
    // Header
    const headerHtml = `
        <div class="px-6 py-6 border-b border-gray-100 bg-white sticky top-0 z-10 flex flex-col items-center text-center">
            <div class="w-16 h-16 rounded-full bg-gray-50 mb-3 border border-gray-200 overflow-hidden flex items-center justify-center text-gray-400">
                ${isRuc 
                    ? `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>`
                    : `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`
                }
            </div>
            <h2 class="text-xl font-bold text-gray-900">${entidad.nombre_alias}</h2>
            <p class="text-sm font-medium text-gray-500 mb-3">${entidad.identificador}</p>
            <span class="px-3 py-1 bg-brand-success/10 text-brand-success font-bold text-xs rounded-full border border-brand-success/20 uppercase">
                ${entidad.datos_extra.estado_general || 'Activo'}
            </span>
        </div>
    `;

    // Stepper (Validaciones)
    let stepperHtml = '';
    const pasos = ciclo.pasos_ciclo || [];
    if (pasos.length > 0) {
        stepperHtml = `<div class="p-6 bg-white"><h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-6">Pasos del Ciclo</h3><div class="space-y-6">`;
        
        pasos.forEach((p, i) => {
            const isLast = i === pasos.length - 1;
            const completedColor = p.completado ? 'bg-brand-success text-white border-brand-success shadow-sm' : 'bg-white text-gray-300 border-gray-200';
            const textColor = p.completado ? 'text-gray-900' : 'text-gray-400';
            const dateStr = p.completado ? new Date().toLocaleDateString('es-ES') : 'Pendiente';
            
            stepperHtml += `
                <div class="flex relative">
                    ${!isLast ? `<div class="absolute top-6 left-[13px] w-0.5 h-full bg-gray-100 -ml-px z-0"></div>` : ''}
                    <div class="w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 z-10 ${completedColor}">
                        ${p.completado ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>' : '<span class="w-2 h-2 rounded-full bg-gray-200"></span>'}
                    </div>
                    <div class="ml-4 pt-1 pb-2">
                        <p class="text-sm font-bold ${textColor}">${p.titulo}</p>
                        <p class="text-xs text-gray-500 mt-0.5 font-medium">${dateStr}</p>
                    </div>
                </div>
            `;
        });
        stepperHtml += `</div></div>`;
    }

    // Call to Action
    const ctaHtml = `
        <div class="p-6 bg-white border-y border-gray-100">
            <button class="w-full py-3.5 rounded-xl bg-brand-primary text-white font-bold hover:bg-blue-800 transition-colors shadow flex justify-center items-center gap-2">
                ${actionText}
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
            </button>
        </div>
    `;

    // Documentos Recientes
    let docsHtml = '';
    const adjuntos = ciclo.adjuntos_ciclo || [];
    if (adjuntos.length > 0) {
        docsHtml = `<div class="p-6 bg-white flex-1"><h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Documentos Recientes</h3><div class="space-y-3">`;
        adjuntos.forEach(doc => {
            docsHtml += `
                <a href="${doc.url_archivo}" class="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-lg border border-gray-100 group">
                    <div class="w-8 h-8 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-brand-primary">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    </div>
                    <span class="text-sm font-medium text-gray-700 truncate">${doc.nombre_archivo}</span>
                </a>
            `;
        });
        docsHtml += `</div></div>`;
    }

    // Render in Panel
    panel.innerHTML = `<div class="flex flex-col h-full overflow-y-auto no-scrollbar pb-10">` + headerHtml + stepperHtml + ctaHtml + docsHtml + `</div>`;
    
    // Mostrar en móvil
    panel.classList.remove('translate-x-full');
}
