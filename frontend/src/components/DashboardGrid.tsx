import { FileText, Car } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CicloActividad } from "../types/supabase";
import { motion, AnimatePresence } from "framer-motion";

interface DashboardGridProps {
  ciclos: CicloActividad[];
  onSelect: (c: CicloActividad) => void;
  updatedIds?: Set<string>;
}

export default function DashboardGrid({ ciclos, onSelect, updatedIds }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      {ciclos.map((ciclo, idx) => {
        const entidad = ciclo.entidades_monitoreadas;
        const calc = ciclo.calculo || { porcentaje: 0, texto_principal: '', texto_secundario: '' };
        const isRuc = entidad.tipo_identificador === 'RUC';
        const wasUpdated = updatedIds?.has(ciclo.id) ?? false;

        return (
          <motion.div
            key={ciclo.id || idx}
            layout
            animate={wasUpdated ? {
              boxShadow: [
                '0 0 0px 0px rgba(99,102,241,0)',
                '0 0 0px 6px rgba(99,102,241,0.25)',
                '0 0 0px 0px rgba(99,102,241,0)',
              ],
            } : {}}
            transition={{ duration: 1.2, ease: 'easeInOut' }}
          >
            <Card 
              onClick={() => onSelect(ciclo)}
              className={`cursor-pointer hover:shadow-md transition-all transform hover:-translate-y-1 rounded-2xl ${wasUpdated ? 'ring-2 ring-indigo-400/40' : ''}`}
            >
              <CardHeader className="flex flex-row justify-between items-start pb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={entidad.nombre_alias}
                      className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 truncate"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.35 }}
                    >
                      {entidad.nombre_alias}
                    </motion.p>
                  </AnimatePresence>
                  <CardTitle className="font-bold text-slate-900 text-lg leading-tight">{ciclo.nombre}</CardTitle>
                  {!isRuc && (
                    <div className="inline-block bg-[#facc15] border border-slate-900 rounded px-2 py-0.5 shadow-sm relative mt-2">
                      <span className="font-mono text-sm font-black text-slate-900 tracking-widest">{entidad.identificador}</span>
                    </div>
                  )}
                  {wasUpdated && (
                    <motion.span
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 bg-indigo-50 border border-indigo-200 rounded-full text-[10px] font-bold text-indigo-600 uppercase tracking-wider"
                    >
                      ✦ Actualizado
                    </motion.span>
                  )}
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isRuc ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {isRuc ? <FileText className="w-5 h-5" /> : <Car className="w-5 h-5" />}
                </div>
              </CardHeader>
              <CardContent>
              {isRuc && entidad.tipo_identificador === 'RUC' ? (
                <div className="flex justify-between items-center gap-4 mt-2">
                  <div className="flex-1">
                    <div className="mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase border ${
                        entidad.datos_extra.estado_conciliacion === 'Completado' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        Conciliación: {entidad.datos_extra.estado_conciliacion || 'Pendiente'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold uppercase mb-0.5">Impuesto Estimado</p>
                    <p className="text-xl font-black text-slate-900">
                      {entidad.datos_extra.total_pagar ? `$${entidad.datos_extra.total_pagar.toLocaleString('en-US', {minimumFractionDigits:2})}` : 'Por calcular'}
                    </p>
                  </div>

                  <div className="relative w-24 h-24 shrink-0">
                    <svg viewBox="0 0 36 36" className="block mx-auto max-w-full max-h-[250px] transform -rotate-90">
                      <path className="fill-none stroke-slate-100 stroke-[3.8]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                      <path 
                        className="fill-none stroke-[2.8] stroke-blue-600 rounded-full transition-all duration-1000 ease-out" 
                        strokeDasharray={`${calc.porcentaje}, 100`} 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-sm font-black text-slate-800 leading-none text-center">{calc.texto_principal}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase mt-1">RESTANTES</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Progreso de RTV</span>
                    <span className="text-xs font-bold text-purple-600">{calc.texto_principal}</span>
                  </div>
                  <Progress value={calc.porcentaje} className="h-2.5 bg-slate-100 [&>div]:bg-purple-600" />
                  <p className="text-xs text-slate-500 mt-3 font-medium">{calc.texto_secundario}</p>
                </div>
              )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
