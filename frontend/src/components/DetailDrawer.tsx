import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Check, FileText, ArrowRight, Activity, Receipt, AlertCircle, ShieldCheck, MapPin, CarFront, Ban, TriangleAlert, ExternalLink, Loader2, RefreshCw, Car, Palette, Calendar, Zap, Globe, Cog, Hash, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { decodeEcuadorianPlate } from "../lib/plateUtils";
import { getVehicleColorClass } from "../lib/vehicleColorUtils";
import CarImage from "./CarImage";
import { CicloActividad } from "../types/supabase";
import { motion, AnimatePresence } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};

export default function DetailDrawer({ ciclo, onClose, onUpdate }: { ciclo: CicloActividad | null, onClose: () => void, onUpdate?: () => void }) {
  const entidad = ciclo?.entidades_monitoreadas;
  const isRuc = entidad?.tipo_identificador === 'RUC';

  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimisticMultas, setOptimisticMultas] = useState<boolean | null>(null);
  
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [showMore, setShowMore] = useState(false);
  
  const [manualForm, setManualForm] = useState({ marca: '', modelo: '', anio: '', clase: '' });
  const [isSavingManual, setIsSavingManual] = useState(false);

  const [localDatosExtra, setLocalDatosExtra] = useState<any>({});
  const [localNombreAlias, setLocalNombreAlias] = useState<string>('');

  useEffect(() => {
    setOptimisticMultas(null);
    setIsVerifying(false);
    setScrapeError(null);
    setCaptchaRequired(false);
    setShowMore(false);
    if (entidad) {
      setLocalDatosExtra(entidad.datos_extra || {});
      const alias = entidad.nombre_alias || entidad.identificador || '';
      setLocalNombreAlias(alias);
    }
  }, [ciclo?.id]);

  if (!ciclo || !entidad) return null;
  
  const pasos = ciclo.pasos_ciclo || [];
  const historial = ciclo.historial_servicio || [];
  const adjuntos = ciclo.adjuntos_ciclo || [];
  const datosExtra = localDatosExtra;
  const actionText = isRuc ? 'Generar Declaración' : 'Pagar Matrícula';
  
  const estadoGeneral = isRuc && entidad.tipo_identificador === 'RUC' 
      ? datosExtra.estado_general 
      : !isRuc && entidad.tipo_identificador === 'PLACA' 
      ? datosExtra.estado_general 
      : 'Activo';

  const pasoMultas = pasos.find(p => p.titulo.toLowerCase().includes('multas'));
  const actualMultasCompletadas = pasoMultas?.completado ?? true;
  const multasCompletadas = optimisticMultas !== null ? optimisticMultas : actualMultasCompletadas;
  
  const plateInfo = !isRuc && entidad.tipo_identificador === 'PLACA' ? decodeEcuadorianPlate(entidad.identificador) : null;

  const handleConsultarAxisCloud = () => {
    navigator.clipboard.writeText(entidad.identificador);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    window.open('https://servicios.axiscloud.ec/AutoServicio/inicio.jsp?ps_empresa=16&ps_accion=P55', '_blank');
  };

  const handleUpdateFichaTecnica = async () => {
    if (isRuc) return;
    setIsScraping(true);
    setScrapeError(null);
    setCaptchaRequired(false);
    try {
      const res = await fetch(`http://localhost:3001/api/vehiculos/info/${entidad.identificador}`);
      const data = await res.json();
      if (res.status === 403 && data.error === 'CAPTCHA_REQUIRED') {
        setCaptchaRequired(true);
        if (plateInfo) {
          setManualForm({ marca: '', modelo: '', anio: '', clase: '' });
        }
      } else if (res.ok && data.success) {
        setLocalDatosExtra(data.data);
        if (data.data.marca && data.data.modelo && data.data.marca !== 'Desconocido') {
          setLocalNombreAlias(`${data.data.marca} ${data.data.modelo}`);
        }
        if (onUpdate) onUpdate();
      } else {
        setScrapeError('No se pudo sincronizar con la base de datos externa. Por favor, verifica la placa o ingresa los datos manualmente.');
      }
    } catch (err) {
      setScrapeError('No se pudo sincronizar con la base de datos externa. Por favor, verifica la placa o ingresa los datos manualmente.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSaveManual = async () => {
    setIsSavingManual(true);
    try {
      const payload = {
        marca: manualForm.marca,
        modelo: manualForm.modelo,
        anio: parseInt(manualForm.anio) || 0,
        clase: manualForm.clase,
        servicio: plateInfo?.serviceType || 'Particular',
        provincia: plateInfo?.province || 'Desconocido'
      };
      
      const res = await fetch(`http://localhost:3001/api/vehiculos/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: entidad.identificador, manualData: payload })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCaptchaRequired(false);
        setLocalDatosExtra(data.data);
        if (data.data.marca && data.data.modelo && data.data.marca !== 'Desconocido') {
          setLocalNombreAlias(`${data.data.marca} ${data.data.modelo}`);
        }
        if (onUpdate) onUpdate();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleVerifyMultas = async (checked: boolean) => {
    if (!checked || !pasoMultas || !ciclo.id) return;
    
    // Optimistic UI Update
    setOptimisticMultas(true);
    setIsVerifying(true);
    
    try {
      const res = await fetch('http://localhost:3001/api/multas/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: ciclo.id, paso_id: pasoMultas.id })
      });
      if (res.ok && onUpdate) {
        onUpdate();
      } else {
        setOptimisticMultas(false); // Revert on fail
      }
    } catch (error) {
      console.error(error);
      setOptimisticMultas(false); // Revert on fail
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Sheet open={!!ciclo} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 flex flex-col bg-slate-50 overflow-hidden border-l border-slate-200">
        
        <motion.div 
          className="flex-1 overflow-y-auto no-scrollbar"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Vehicle Image Banner — only for PLACA with known make/model */}
          {!isRuc && (
            <motion.div
              variants={itemVariants}
              className="w-full overflow-hidden"
            >
              <CarImage
                marca={datosExtra.marca}
                modelo={datosExtra.modelo}
                color={datosExtra.color}
                fuente={datosExtra.fuente}
              />
            </motion.div>
          )}

          {/* Header */}
          <motion.div variants={itemVariants} className="px-8 pt-6 pb-8 border-b border-slate-200 bg-white sticky top-0 z-10 flex flex-col items-center text-center shadow-sm">
            {(() => {
              const colorClasses = getVehicleColorClass(datosExtra.color, datosExtra.fuente);
              return isRuc ? (
                <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center mb-4 shadow-sm">
                  <Receipt className="w-8 h-8 text-blue-600" />
                </div>
              ) : (
                <motion.div
                  key={datosExtra.color ?? 'default'}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-14 h-14 rounded-full ${colorClasses.bg} border ${colorClasses.border} flex items-center justify-center mb-3 shadow-sm`}
                >
                  <Car className={`w-7 h-7 ${colorClasses.text}`} />
                </motion.div>
              );
            })()}
            <h2 className="text-2xl font-bold leading-tight text-slate-900 break-words whitespace-normal px-4">{localNombreAlias}</h2>
            <div className="flex items-center justify-center gap-2 mb-4 mt-1">
              <p className="text-sm font-medium text-slate-500">{entidad.identificador}</p>
              {!isRuc && (
                <button 
                  onClick={handleUpdateFichaTecnica} 
                  disabled={isScraping}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-blue-600 disabled:opacity-50 border border-slate-200 shadow-sm"
                  title="Actualizar Ficha Técnica"
                >
                  {isScraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-full border border-slate-200 uppercase tracking-wider">
              {estadoGeneral || 'Activo'}
            </span>
          </motion.div>

          {/* SRI View */}
          {isRuc && (
            <div className="p-6 space-y-6">
              <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Resumen de Impuestos</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600 font-medium">IVA Ventas (12%)</span>
                    <span className="text-sm font-bold text-slate-900">$1,500.00</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                    <span className="text-sm text-slate-600 font-medium">IVA Compras (12%)</span>
                    <span className="text-sm font-bold text-emerald-600">-$249.60</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm font-bold text-slate-900">Total a Pagar</span>
                    <span className="text-xl font-black text-blue-700">${(datosExtra as any).total_pagar || '1,250.40'}</span>
                  </div>
                </div>
              </motion.div>

              {adjuntos.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Documentos de Soporte</h3>
                  <div className="space-y-3">
                    {adjuntos.map((doc, i) => (
                      <a key={i} href={doc.url_archivo} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl border border-slate-100 group">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-blue-600 shadow-sm">
                          <FileText className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate">{doc.nombre_archivo}</span>
                      </a>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* RTV View */}
          {!isRuc && (
            <div className="p-6 space-y-6">
              
              {/* Scrape Error Message */}
              {scrapeError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start shadow-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 font-medium leading-relaxed">
                    {scrapeError}
                  </p>
                </motion.div>
              )}

              {/* Fallback Warning Message */}
              {!captchaRequired && datosExtra.fuente === 'estimado' && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 items-start shadow-sm"
                >
                  <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800 font-medium leading-relaxed">
                    Mostrando datos de registro provincial. La sincronización detallada no está disponible en este momento.
                  </p>
                </motion.div>
              )}

              {/* CAPTCHA Required UI */}
              {captchaRequired && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex gap-3 items-start">
                    <ShieldCheck className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-orange-900 font-bold mb-1">
                        Se requiere validación humana
                      </p>
                      <p className="text-xs text-orange-800/80 mb-3 leading-relaxed">
                        El portal oficial ha bloqueado la extracción automática. Por favor, abre el portal oficial, resuelve el captcha e ingresa los datos extraídos a continuación.
                      </p>
                      <Button 
                        onClick={() => window.open('https://consultasecuador.com/en-linea/transito/consulta-vehiculo', '_blank')}
                        variant="outline" 
                        size="sm"
                        className="bg-white border-orange-200 text-orange-700 hover:bg-orange-100 flex gap-2 h-8 text-xs"
                      >
                        Abrir Portal Oficial <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Manual Form */}
                  <div className="bg-white p-4 rounded-xl border border-orange-100 grid grid-cols-2 gap-3 mt-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Marca</label>
                      <input 
                        type="text" value={manualForm.marca} onChange={e => setManualForm({...manualForm, marca: e.target.value})}
                        className="w-full text-sm border-b border-slate-200 py-1 focus:outline-none focus:border-orange-400 bg-transparent"
                        placeholder="Ej. Toyota"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Modelo</label>
                      <input 
                        type="text" value={manualForm.modelo} onChange={e => setManualForm({...manualForm, modelo: e.target.value})}
                        className="w-full text-sm border-b border-slate-200 py-1 focus:outline-none focus:border-orange-400 bg-transparent"
                        placeholder="Ej. Yaris"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Año</label>
                      <input 
                        type="number" value={manualForm.anio} onChange={e => setManualForm({...manualForm, anio: e.target.value})}
                        className="w-full text-sm border-b border-slate-200 py-1 focus:outline-none focus:border-orange-400 bg-transparent"
                        placeholder="Ej. 2020"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Clase</label>
                      <input 
                        type="text" value={manualForm.clase} onChange={e => setManualForm({...manualForm, clase: e.target.value})}
                        className="w-full text-sm border-b border-slate-200 py-1 focus:outline-none focus:border-orange-400 bg-transparent"
                        placeholder="Ej. Automóvil"
                      />
                    </div>
                    <div className="col-span-2 pt-2">
                      <Button onClick={handleSaveManual} disabled={isSavingManual} className="w-full h-9 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs gap-2">
                        {isSavingManual ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Guardar Ficha
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Ficha Técnica */}
              {datosExtra.marca && (
                <motion.div layout variants={itemVariants} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex justify-between items-center">
                    Ficha Técnica Oficial
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        <Car className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Marca / Modelo</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.marca} {datosExtra.modelo}</p>
                      </div>
                    </motion.div>
                    <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Año</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.anio}</p>
                      </div>
                    </motion.div>
                    <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                        <Palette className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Color</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.color}</p>
                      </div>
                    </motion.div>
                    <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 shrink-0" />
                      </div>
                      <div className="min-w-0 w-full">
                        <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Clase</p>
                        <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.clase}</p>
                      </div>
                    </motion.div>
                  </div>

                  <button 
                    onClick={() => setShowMore(!showMore)}
                    className="w-full mt-4 py-2 flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                  >
                    {showMore ? 'Ver menos detalles' : 'Ver más detalles'}
                    {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <AnimatePresence>
                    {showMore && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3 pt-3 border-t border-slate-100"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <Zap className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 w-full">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Cilindraje</p>
                              <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.cilindraje || '-'}</p>
                            </div>
                          </motion.div>
                          <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                            <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center shrink-0">
                              <Globe className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 w-full">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">País de Origen</p>
                              <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.pais || '-'}</p>
                            </div>
                          </motion.div>
                          <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                            <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center shrink-0">
                              <Cog className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 w-full">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Tipo de Uso</p>
                              <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.tipo_uso || '-'}</p>
                            </div>
                          </motion.div>
                          <motion.div layout className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full h-auto">
                            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                              <Hash className="w-5 h-5 shrink-0" />
                            </div>
                            <div className="min-w-0 w-full">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Chasis / RAMV</p>
                              <p className="text-sm font-bold text-slate-900 leading-tight whitespace-normal break-words">{datosExtra.chasis || '-'}</p>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}

              {plateInfo && (
                <motion.div variants={itemVariants} className={`bg-white p-5 rounded-2xl border shadow-sm ${
                  plateInfo.colorTheme === 'orange' ? 'border-orange-200' :
                  plateInfo.colorTheme === 'gold' ? 'border-amber-200' :
                  plateInfo.colorTheme === 'green' ? 'border-emerald-200' :
                  'border-slate-200'
                }`}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Origen de Registro</h3>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 font-medium mb-0.5">Ubicación</p>
                          <p className="text-sm font-bold text-slate-900">📍 Origen: {plateInfo.province}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 w-full sm:w-auto pt-3 border-t sm:border-t-0 sm:pt-0 border-slate-200">
                        <div className="flex-1 sm:flex-none">
                          <p className="text-xs text-slate-500 font-medium text-left sm:text-right mb-0.5">Servicio</p>
                          <p className="text-sm font-bold text-slate-900 text-left sm:text-right">{plateInfo.serviceType}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm border ${
                          plateInfo.colorTheme === 'orange' ? 'bg-orange-100 text-orange-600 border-orange-200' :
                          plateInfo.colorTheme === 'gold' ? 'bg-amber-100 text-amber-600 border-amber-200' :
                          plateInfo.colorTheme === 'green' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                          'bg-white text-slate-700 border-slate-200'
                        }`}>
                          <CarFront className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Restricción Vehicular</h4>
                      <div className={`flex items-center gap-3 p-4 rounded-xl border shadow-sm ${
                        plateInfo.hasRestrictionToday 
                          ? 'bg-red-50 border-red-200' 
                          : 'bg-emerald-50 border-emerald-200'
                      }`}>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                          plateInfo.hasRestrictionToday ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          {plateInfo.hasRestrictionToday ? <Ban className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                        </div>
                        <div>
                          <p className={`text-sm font-bold ${
                            plateInfo.hasRestrictionToday ? 'text-red-900' : 'text-emerald-900'
                          }`}>
                            {plateInfo.hasRestrictionToday ? 'Restringido Hoy' : 'Libre Circulación'}
                          </p>
                          <p className={`text-xs mt-1 ${
                            plateInfo.hasRestrictionToday ? 'text-red-700' : 'text-emerald-700'
                          }`}>
                            {plateInfo.hasRestrictionToday 
                              ? `Este vehículo no puede circular el día de hoy por medida de restricción (${plateInfo.restrictionDay}).`
                              : `El vehículo puede circular sin restricciones el día de hoy. (Pico y Placa: ${plateInfo.restrictionDay})`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div variants={itemVariants} className={`p-5 rounded-2xl border ${multasCompletadas ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-red-200 shadow-sm'}`}>
                <div className="flex gap-3">
                  <div className="mt-0.5">
                    {multasCompletadas ? <ShieldCheck className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className={`text-sm font-bold ${multasCompletadas ? 'text-emerald-900' : 'text-red-900'}`}>
                      Estado de Multas: {multasCompletadas ? 'Al Día' : 'Validación Requerida'}
                    </h4>
                    <p className={`text-xs mt-1 ${multasCompletadas ? 'text-emerald-700' : 'text-slate-600'}`}>
                      {multasCompletadas 
                        ? 'No tienes infracciones de tránsito pendientes. Puedes avanzar con la matriculación.'
                        : 'Verifica y cancela tus infracciones en AxisCloud para desbloquear el proceso de matriculación.'}
                    </p>
                    
                    {!multasCompletadas && (
                      <div className="mt-5 space-y-4">
                        <Button 
                          onClick={handleConsultarAxisCloud}
                          className={`w-full text-white flex items-center justify-center gap-2 text-xs h-10 rounded-xl transition-all ${
                            copied ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-slate-900 hover:bg-slate-800'
                          }`}
                        >
                          {copied ? (
                            <>
                              Placa {entidad.identificador} copiada
                              <Check className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            <>
                              Consultar Multas en AxisCloud
                              <ExternalLink className="w-3.5 h-3.5" />
                            </>
                          )}
                        </Button>
                        
                        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <input 
                            type="checkbox" 
                            id="multas-pagadas"
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                            onChange={(e) => handleVerifyMultas(e.target.checked)}
                            disabled={isVerifying}
                          />
                          <label htmlFor="multas-pagadas" className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                            {isVerifying ? 'Verificando...' : 'He verificado y pagado mis multas'}
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>

              {!multasCompletadas && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3 items-center shadow-sm"
                >
                  <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                    <TriangleAlert className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-orange-900">
                    Pendiente: Validación de multas requerida
                  </p>
                </motion.div>
              )}

              {pasos.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Proceso de Matriculación</h3>
                  <div className="space-y-6 relative ml-2">
                    <div className="absolute top-3 bottom-3 left-[11px] w-0.5 bg-slate-100" />
                    {pasos.map((p, i) => {
                      const isCompleted = p.completado;
                      const isBlocked = !multasCompletadas && p.orden > 1; // Blocked if previous multas are not paid
                      return (
                        <div key={i} className={`flex relative z-10 ${isBlocked ? 'opacity-50' : ''}`}>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 bg-white ${
                            isCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'
                          }`}>
                            {isCompleted ? <Check className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />}
                          </div>
                          <div className="ml-4 -mt-1">
                            <p className={`text-sm font-bold ${isCompleted ? 'text-slate-900' : 'text-slate-600'}`}>{p.titulo}</p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                              {isCompleted ? new Date().toLocaleDateString('es-ES') : isBlocked ? 'Bloqueado' : 'Pendiente'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
              
              {historial.length > 0 && (
                <motion.div variants={itemVariants} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-5">Historial de Cierres</h3>
                  <div className="space-y-4">
                    {historial.map((h: any, i: number) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                        <div>
                          <p className="text-sm font-bold text-slate-900">{h.periodo}</p>
                          <p className="text-xs text-slate-500 mt-1">{h.comentario}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1.5 uppercase">{new Date(h.fecha_cierre).toLocaleDateString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* Action Button Fixed at Bottom */}
        <div className="p-6 bg-white border-t border-slate-200 shrink-0 z-20">
          <Button 
            disabled={!isRuc && !multasCompletadas}
            className="w-full py-6 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {actionText}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}
