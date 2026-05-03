'use client';

import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Check, FileText, ArrowRight, Activity, Receipt, AlertCircle, ShieldCheck, 
  MapPin, CarFront, Ban, TriangleAlert, ExternalLink, Loader2, RefreshCw, 
  Car, Palette, Calendar, Zap, Globe, Cog, Hash, ChevronDown, ChevronUp, 
  Save, Library, Key, Briefcase, CalendarClock, TimerReset, CheckCircle2, Circle
} from 'lucide-react';
import { decodeEcuadorianPlate } from "../lib/plateUtils";
import { getVehicleColorClass } from "../lib/vehicleColorUtils";
import CarImage from "./CarImage";
import { CicloActividad } from "../types/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

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
  if (!ciclo || !ciclo.entidades_monitoreadas) return null;

  const entidad = ciclo.entidades_monitoreadas;
  const isRuc = entidad.tipo_identificador === 'RUC';

  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimisticMultas, setOptimisticMultas] = useState<boolean | null>(null);
  
  const [isScrapingFicha, setIsScrapingFicha] = useState(false);
  const [isScrapingMultas, setIsScrapingMultas] = useState(false);
  const [isScrapingMatricula, setIsScrapingMatricula] = useState(false);
  const [fichaError, setFichaError] = useState<string | null>(null);
  const [fineError, setFineError] = useState<string | null>(null);
  const [matriculaError, setMatriculaError] = useState<string | null>(null);
  const [rtvError, setRtvError] = useState<string | null>(null);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  
  const [showMore, setShowMore] = useState(false);
  const [manualForm, setManualForm] = useState({ marca: '', modelo: '', anio: '', clase: '' });
  const [isSavingManual, setIsSavingManual] = useState(false);
  // Combined loading flag for all fetches
  const isFetchingAll = isScrapingFicha || isScrapingMultas || isScrapingMatricula;

  const [localDatosExtra, setLocalDatosExtra] = useState<any>({});
  const [localNombreAlias, setLocalNombreAlias] = useState<string>('');
  const [localFineData, setLocalFineData] = useState<{ tieneMultas: boolean; totalMultas: number; detalleMultas: any[] }>({
    tieneMultas: false,
    totalMultas: 0,
    detalleMultas: []
  });
  const [localMatriculaData, setLocalMatriculaData] = useState<{ total: number; estado: string; exonerado: boolean }>({
    total: 0,
    estado: 'PAGADO',
    exonerado: false
  });

  // Turno & Closure states
  const [amtCenters, setAmtCenters] = useState<any[]>([]);
  const [isLoadingTurnos, setIsLoadingTurnos] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Sync status
  const [syncStatus, setSyncStatus] = useState<string>(entidad.sync_status || 'IDLE');
  const [syncMessage, setSyncMessage] = useState<string>(entidad.sync_message || '');

  // Real-time subscription placeholder
  // In a real app, you would use supabase.channel().on('postgres_changes', ...)
  // For now, we will update local state if the component re-renders with new props
  useEffect(() => {
    if (entidad) {
      setSyncStatus(entidad.sync_status || 'IDLE');
      setSyncMessage(entidad.sync_message || '');
    }
  }, [entidad]);

  const fetchFicha = async () => {
    if (isRuc) return;
    setIsScrapingFicha(true);
    setFichaError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/vehiculos/ficha/${entidad.identificador}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalDatosExtra(data.data);
        if (data.data.marca && data.data.modelo) {
          setLocalNombreAlias(`${data.data.marca} ${data.data.modelo}`.toUpperCase());
        }
      } else {
        setFichaError(data.error || 'Error al obtener ficha técnica');
      }
    } catch (err) {
      setFichaError('Error de conexión');
    } finally {
      setIsScrapingFicha(false);
    }
  };

  const fetchMultas = async () => {
    if (isRuc) return;
    setIsScrapingMultas(true);
    setFineError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/vehiculos/multas/${entidad.identificador}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalFineData(data.data);
      } else {
        setFineError(data.error || 'Error al consultar multas');
      }
    } catch (err) {
      setFineError('Error de conexión');
    } finally {
      setIsScrapingMultas(false);
    }
  };

  const fetchMatricula = async () => {
    if (isRuc) return;
    setIsScrapingMatricula(true);
    setMatriculaError(null);
    try {
      const res = await fetch(`http://localhost:3001/api/vehiculos/matricula/${entidad.identificador}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setLocalMatriculaData(data.data);
      } else {
        setMatriculaError(data.error || 'Error al consultar matrícula');
      }
    } catch (err) {
      setMatriculaError('Error de conexión');
    } finally {
      setIsScrapingMatricula(false);
    }
  };

  useEffect(() => {
    setAmtCenters([]);
    setSelectedCenter(null);
    setOptimisticMultas(null);
    setIsVerifying(false);
    setFichaError(null);
    setFineError(null);
    setMatriculaError(null);
    setShowMore(false);

    if (entidad) {
      setLocalDatosExtra(entidad.datos_extra || {});
      setLocalNombreAlias(entidad.nombre_alias || entidad.identificador || '');
      setLocalFineData({
        tieneMultas: (ciclo.total_multas || 0) > 0,
        totalMultas: ciclo.total_multas || 0,
        detalleMultas: ciclo.detalle_multas || []
      });
      setLocalMatriculaData({
        total: (ciclo as any).valor_matricula || 0,
        estado: (ciclo as any).estado_pago_sri || 'PAGADO',
        exonerado: false
      });

      // Modular Trigger
      fetchFicha();
      fetchMultas();
      fetchMatricula();
    }
  }, [ciclo?.id]);

  const handleCheckTurnoAvailability = async () => {
    setIsLoadingTurnos(true);
    try {
      const res = await fetch(`http://localhost:3001/api/rtv/disponibilidad/${entidad.identificador}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAmtCenters(data.data);
      } else {
        setRtvError(data.error || 'No se pudo consultar disponibilidad de turnos.');
      }
    } catch (err) {
      setRtvError('Error al conectar con AMT.');
    } finally {
      setIsLoadingTurnos(false);
    }
  };

  const handleBookTurno = async (center: any) => {
    setIsBooking(true);
    try {
      const res = await fetch(`http://localhost:3001/api/rtv/agendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ciclo_id: ciclo?.id,
          centro: center.nombre,
          fecha: center.disponibilidad
        })
      });
      if (res.ok) {
        if (onUpdate) onUpdate();
        setAmtCenters([]);
      }
    } catch (err) {
      setRtvError('Error al agendar turno.');
    } finally {
      setIsBooking(false);
    }
  };

  const handleFinalizarCiclo = async () => {
    setIsFinalizing(true);
    try {
      const res = await fetch(`http://localhost:3001/api/rtv/finalizar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: ciclo?.id })
      });
      if (res.ok) {
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      setRtvError('Error al finalizar el ciclo.');
    } finally {
      setIsFinalizing(false);
    }
  };

  
  const handleStartStep = async (stepId: string) => {
    try {
      await fetch(`http://localhost:3001/api/rtv/paso/proceso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: ciclo?.id, step_id: stepId })
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error updating step status');
    }
  };

  const pasos = ciclo.pasos_ciclo || [];
  const historial = ciclo.historial_servicio || [];
  const adjuntos = ciclo.adjuntos_ciclo || [];
  const datosExtra = localDatosExtra;
  const actionText = isRuc ? 'Generar Declaración' : 'Iniciar Proceso RTV';

  // --- ESTANDARIZACIÓN DE 4 PASOS ---
  const rawPasos = ciclo.pasos_ciclo || [];
  const standardPasos = [
    { id: 'multas', titulo: 'Pago de Multas (ANT/Municipales)', orden: 1 },
    { id: 'matricula', titulo: 'Pago de Matrícula (SRI)', orden: 2 },
    { id: 'turno', titulo: 'Generación de Turno RTV', orden: 3 },
    { id: 'revision', titulo: 'Aprobación de Revisión', orden: 4 }
  ];

  const pasosProcesados = standardPasos.map(sp => {
    const dbPaso = rawPasos.find(rp => rp.titulo.toLowerCase().includes(sp.id) || (sp.id === 'matricula' && rp.titulo.toLowerCase().includes('matrícula')));
    
    // Real-time evaluation
    let isCompleted = dbPaso?.completado || false;
    let pendingValue = 0;
    let isPending = false;

    if (sp.id === 'multas') {
      isCompleted = !localFineData.tieneMultas;
      pendingValue = localFineData.totalMultas;
      isPending = localFineData.tieneMultas;
    } else if (sp.id === 'matricula') {
      isCompleted = localMatriculaData.total === 0;
      pendingValue = localMatriculaData.total;
      isPending = localMatriculaData.total > 0;
    } else {
      // Step 3 and 4 depend on DB status
      isCompleted = dbPaso?.completado || false;
      isPending = !isCompleted;
    }

    return {
      ...sp,
      completado: isCompleted,
      isPending,
      pendingValue,
      dbId: dbPaso?.id
    };
  });
  
  const estadoGeneral = isRuc && entidad.tipo_identificador === 'RUC' 
      ? datosExtra.estado_general 
      : !isRuc && entidad.tipo_identificador === 'PLACA' 
      ? datosExtra.estado_general 
      : 'Activo';

  const pasoMultas = pasos.find(p => p.titulo.toLowerCase().includes('multas'));
  const actualMultasCompletadas = pasoMultas?.completado ?? true;
  
  // Real-time source of truth: Completed if no fines are detected OR if optimistic verification is active
  const multasCompletadas = optimisticMultas !== null 
    ? optimisticMultas 
    : (actualMultasCompletadas && !localFineData.tieneMultas);
  
  const plateInfo = !isRuc && entidad.tipo_identificador === 'PLACA' ? decodeEcuadorianPlate(entidad.identificador) : null;

  const handleConsultarAxisCloud = () => {
    navigator.clipboard.writeText(entidad.identificador);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    window.open('https://antmultas.org/', '_blank');
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
    <Sheet open={!!ciclo} onOpenChange={(open) => { if (!open && isFetchingAll) return; if (!open) onClose(); }}>
      <SheetContent 
        side="right" 
        className={cn(
          "w-full sm:w-[450px] p-0 flex flex-col bg-slate-50 overflow-hidden border-l border-slate-200",
          isFetchingAll && "[&_[data-slot=sheet-close]]:opacity-20 [&_[data-slot=sheet-close]]:pointer-events-none transition-all duration-500"
        )}
      >
        {/* Persistence Banner */}
        {isFetchingAll && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-600 text-white px-4 py-2 text-center text-xs font-bold z-20 sticky top-0 shadow-md"
          >
            Sincronizando datos con ANT y SRI... Mantén abierta esta ventana.
          </motion.div>
        )}

        {isFetchingAll && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-slate-700">Sincronizando datos con ANT y SRI...</span>
            </div>
          </div>
        )}

        
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
            <div className="px-4 flex flex-col items-center">
              <div className="flex items-center justify-center gap-3">
                <h2 className="text-2xl font-bold leading-tight text-slate-900 break-words whitespace-normal text-center">{localNombreAlias}</h2>
              </div>
              <div className="flex items-center justify-center gap-2 mb-4 mt-1">
                <p className="text-sm font-medium text-slate-500">{entidad.identificador}</p>
                {!isRuc && (
                  <button 
                    onClick={fetchFicha} 
                    disabled={isScrapingFicha}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-blue-600 disabled:opacity-50 border border-slate-200 shadow-sm"
                    title="Actualizar Ficha Técnica"
                  >
                    {isScrapingFicha ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  </button>
                )}
              </div>
            </div>
            <span className="px-4 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-full border border-slate-200 uppercase tracking-wider">
              {estadoGeneral || 'Activo'}
            </span>

            {/* Sync Status Banner */}
            {syncStatus !== 'IDLE' && syncStatus !== 'COMPLETADO' && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full max-w-sm bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600 leading-none mb-1">{syncStatus.replace('_', ' ')}</p>
                  <p className="text-[11px] font-medium text-blue-800 leading-tight">{syncMessage || 'Sincronizando datos oficiales...'}</p>
                </div>
              </motion.div>
            )}

            {syncStatus === 'FALLO_PORTAL' || syncStatus === 'CAPTCHA_DETECTADO' ? (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 w-full max-w-sm bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-3 shadow-sm"
              >
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                    <TriangleAlert className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-[10px] font-black uppercase tracking-tighter text-amber-600 leading-none mb-1">ATENCIÓN REQUERIDA</p>
                  <p className="text-[11px] font-medium text-amber-800 leading-tight">{syncMessage}</p>
                </div>
              </motion.div>
            ) : null}
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
              
              {/* RTV Error Message */}
              {rtvError && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3 items-start shadow-sm"
                >
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-800 font-medium leading-relaxed">
                    {rtvError}
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
                    <button 
                      onClick={fetchFicha}
                      disabled={isScrapingFicha}
                      className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-blue-600 disabled:opacity-50"
                      title="Actualizar ficha técnica"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isScrapingFicha ? 'animate-spin' : ''}`} />
                    </button>
                  </h3>
                  {/* Especificaciones Principales */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {[
                      { key: 'marca', label: 'Marca', icon: Library, color: 'text-blue-600', bg: 'bg-blue-50' },
                      { key: 'modelo', label: 'Modelo', icon: CarFront, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                      { key: 'año_fabricacion', label: 'Año Fab.', icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
                      { key: 'color_oficial', label: 'Color', icon: Palette, color: 'text-purple-600', bg: 'bg-purple-50' },
                      { key: 'cilindraje', label: 'Cilindraje', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    ].map((item) => {
                      const val = (datosExtra as any)[item.key] || (datosExtra as any)[item.key === 'año_fabricacion' ? 'anio' : item.key === 'color_oficial' ? 'color' : ''];
                      const isMissing = !val || val === '-' || val === 'No disponible';
                      
                      return (
                        <motion.div 
                          key={item.key} 
                          layout 
                          className={`p-4 ${item.bg} rounded-2xl border border-slate-100 flex items-start gap-3 shadow-sm hover:shadow-md transition-all duration-300`}
                        >
                          <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shrink-0 shadow-sm ${item.color}`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-0.5">{item.label}</p>
                            {isScrapingFicha ? (
                              <div className="h-4 bg-slate-200 animate-pulse rounded-md w-full mt-1" />
                            ) : (
                              <p className={`text-sm font-bold leading-tight whitespace-normal break-words ${isMissing ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                                {isMissing ? 'Pendiente de sincronización' : val}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => setShowMore(!showMore)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-dashed border-blue-200"
                  >
                    {showMore ? 'Ocultar detalles técnicos' : 'Ver ficha técnica completa'}
                    {showMore ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showMore && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3 pt-3 border-t border-slate-100"
                      >
                        <div className="grid grid-cols-1 gap-2.5">
                          {[
                            { key: 'ramv_cpn', label: 'RAMV / CPN', icon: Hash, color: 'text-slate-600' },
                            { key: 'numero_chasis', label: 'Número de Chasis', icon: Key, color: 'text-slate-600' },
                            { key: 'tipo_servicio', label: 'Tipo de Servicio', icon: Briefcase, color: 'text-slate-600' },
                            { key: 'pais_origen', label: 'País de Origen', icon: Globe, color: 'text-slate-600' },
                            { key: 'anio_matricula', label: 'Año Matrícula', icon: FileText, color: 'text-slate-600' },
                            { key: 'fecha_matricula', label: 'Fecha Matrícula', icon: CalendarClock, color: 'text-slate-600' },
                            { key: 'fecha_caducidad', label: 'Fecha Caducidad', icon: TimerReset, color: 'text-slate-600' },
                            { key: 'estado_polarizado', label: 'Estado Polarizado', icon: ShieldCheck, color: 'text-slate-600' },
                          ].map((subItem) => {
                            const subVal = (datosExtra as any)[subItem.key];
                            const isSubMissing = !subVal || subVal === '-' || subVal === 'No disponible';

                            return (
                              <motion.div 
                                key={subItem.key} 
                                layout 
                                className="flex items-center gap-4 p-3 bg-zinc-50 rounded-xl border border-zinc-100/50"
                              >
                                <div className={`w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 shadow-sm ${subItem.color}`}>
                                  <subItem.icon className="w-4 h-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[9px] uppercase font-bold text-slate-400 tracking-tighter mb-0.5">{subItem.label}</p>
                                  {isScrapingFicha ? (
                                    <div className="h-3 bg-slate-200 animate-pulse rounded-md w-1/2 mt-1" />
                                  ) : (
                                    <p className={`text-xs font-bold leading-tight break-all whitespace-normal ${isSubMissing ? 'text-slate-400 italic' : 'text-slate-800'}`}>
                                      {isSubMissing ? 'Pendiente' : subVal}
                                    </p>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
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

              {/* Sección de Multas - Automatizada */}
              <motion.div 
                variants={itemVariants}
                layout
                className={`p-5 rounded-2xl border transition-all duration-500 ${
                  fineError 
                    ? 'bg-red-50 border-red-200'
                    : !localFineData.tieneMultas 
                    ? 'bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-100/50' 
                    : 'bg-white border-red-200 shadow-lg shadow-red-50'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`mt-1 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    fineError ? 'bg-red-100 text-red-600' :
                    !localFineData.tieneMultas ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}>
                    {fineError ? <Ban className="w-6 h-6" /> :
                     !localFineData.tieneMultas ? <ShieldCheck className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className={`text-base font-bold ${fineError ? 'text-red-900' : !localFineData.tieneMultas ? 'text-emerald-900' : 'text-red-900'}`}>
                        Estado de Multas: {fineError ? 'Error' : !localFineData.tieneMultas ? 'Al Día' : 'Pendientes'}
                      </h4>
                      <button 
                        onClick={fetchMultas}
                        disabled={isScrapingMultas}
                        className="p-1 hover:bg-black/5 rounded-md transition-colors disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScrapingMultas ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                    {isScrapingMultas ? (
                      <div className="space-y-2 mt-2">
                        <div className="h-3 bg-black/5 animate-pulse rounded w-3/4" />
                        <div className="h-3 bg-black/5 animate-pulse rounded w-1/2" />
                      </div>
                    ) : (
                      <>
                        <p className={`text-xs mt-1 leading-relaxed ${fineError ? 'text-red-700' : !localFineData.tieneMultas ? 'text-emerald-700' : 'text-slate-600'}`}>
                          {fineError ? fineError :
                           !localFineData.tieneMultas 
                            ? 'No tienes infracciones de tránsito pendientes.'
                            : `Total: $${localFineData.totalMultas.toFixed(2)} (${localFineData.detalleMultas.length} multas).`}
                        </p>
                        {fineError && (
                          <button 
                            onClick={fetchMultas}
                            className="mt-2 text-[10px] font-bold uppercase tracking-wider text-red-600 hover:underline flex items-center gap-1"
                          >
                            <RefreshCw className="w-2.5 h-2.5" /> Reintentar búsqueda
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Desglose de Infracciones - Solo si tiene multas */}
                <AnimatePresence>
                  {localFineData.tieneMultas && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-6 pt-5 border-t border-slate-100 space-y-4"
                    >
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Desglose de Infracciones</h5>
                      <div className="space-y-2">
                        {localFineData.detalleMultas.map((multa, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: idx * 0.1 }}
                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-red-200 hover:bg-red-50/30 transition-colors"
                          >
                            <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">{multa.infraccion}</p>
                              <p className="text-[10px] text-slate-500 font-medium">{multa.fecha}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-red-600">${multa.valor.toFixed(2)}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <Button 
                          onClick={handleConsultarAxisCloud}
                          className="w-full bg-slate-900 hover:bg-black text-white rounded-xl h-11 text-xs font-bold gap-2 shadow-md shadow-slate-200"
                        >
                          Ir al Portal de Pago Oficial <ExternalLink className="w-4 h-4" />
                        </Button>
                        <p className="text-[10px] text-slate-400 text-center mt-2 italic font-medium">
                          Nota: En el portal de ANTMultas, selecciona <b>"Placa"</b> e ingresa <b>{entidad.identificador}</b>
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                    {pasosProcesados.map((p, i) => {
                        const isCompleted = p.completado;
                        const isPending = p.isPending;
                        const hasDebt = p.pendingValue > 0;
                        
                        // A step is blocked if the previous one is not completed
                        const isBlocked = i > 0 && !pasosProcesados[i-1].completado;
                        
                        return (
                          <motion.div 
                            key={p.id} 
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`flex relative z-10 ${isBlocked ? 'opacity-40 grayscale-[0.5]' : ''}`}
                          >
                            <div className="flex flex-col items-center shrink-0">
                              <motion.div 
                                animate={isCompleted ? { scale: [1, 1.1, 1] } : {}}
                                className={`w-6 h-6 rounded-full flex items-center justify-center bg-white transition-all duration-500 ${
                                  isCompleted ? 'text-emerald-500' : 
                                  isPending ? 'text-orange-500' : 'text-slate-300'
                                }`}
                              >
                                {isCompleted ? (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                    <CheckCircle2 className="w-6 h-6 fill-emerald-50" />
                                  </motion.div>
                                ) : isPending && !isBlocked ? (
                                  <AlertCircle className="w-6 h-6 fill-orange-50" />
                                ) : (
                                  <Circle className="w-6 h-6" />
                                )}
                              </motion.div>
                            </div>

                            <div className="ml-4 -mt-0.5 flex-1 pb-6">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <p className={`text-sm font-bold transition-colors duration-500 ${
                                    isCompleted ? 'text-slate-900' : isBlocked ? 'text-slate-400' : 'text-slate-600'
                                  }`}>
                                    {p.titulo}
                                  </p>
                                  {p.id === 'matricula' && !isBlocked && (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); fetchMatricula(); }}
                                      disabled={isScrapingMatricula}
                                      className="p-1 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                                    >
                                      <RefreshCw className={`w-3 h-3 text-slate-400 ${isScrapingMatricula ? 'animate-spin' : ''}`} />
                                    </button>
                                  )}
                                </div>
                                
                                {hasDebt && !isBlocked && (
                                  <motion.div 
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center gap-2"
                                  >
                                    <span className="text-[10px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                                      ${p.pendingValue.toFixed(2)}
                                    </span>
                                  </motion.div>
                                )}

                                {isCompleted && (
                                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                    Listo
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 mt-1">
                                <p className="text-xs text-slate-500 font-medium">
                                  {isCompleted ? (
                                    <span className="flex items-center gap-1.5 text-emerald-600 font-bold">
                                      <ShieldCheck className="w-3 h-3" /> {p.id === 'turno' ? `Cita: ${ciclo.fecha_turno ? new Date(ciclo.fecha_turno).toLocaleString() : 'Confirmada'}` : 'Verificado al día'}
                                    </span>
                                  ) : isPending && !isBlocked ? (
                                    <span className="flex items-center gap-1.5 text-orange-600 font-bold">
                                      {p.id === 'matricula' || p.id === 'multas' ? (
                                        <a href={p.id === 'matricula' ? "https://srienlinea.sri.gob.ec" : "https://servicios.axiscloud.ec"} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                                          Pendiente de pago <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ) : 'Por tramitar'}
                                    </span>
                                  ) : 'Pendiente'}
                                </p>

                                {/* PHASE 3: Turno Interaction */}
                                {p.id === 'turno' && !isCompleted && !isBlocked && (
                                  <div className="mt-2 space-y-3">
                                    <div className="flex flex-col gap-2">
                                      <Button 
                                        onClick={() => {
                                          handleStartStep('turno');
                                          window.open('https://web.amt.gob.ec/web/citaPrevia/#/home', '_blank');
                                        }}
                                        disabled={isBlocked}
                                        variant="default"
                                        size="sm"
                                        className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-blue-100 flex items-center gap-2"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Ir al Portal de Turnos Oficial
                                      </Button>
                                      
                                      {isBlocked && (
                                        <p className="text-[10px] text-red-500 font-bold italic flex items-center gap-1 mt-1">
                                          <AlertCircle className="w-3 h-3" /> 
                                          Debes estar al día con Multas y Matrícula para agendar el turno.
                                        </p>
                                      )}
                                    </div>

                                    <div className="pt-2 border-t border-slate-100">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-2">Asistente de Cupos Bucle</p>
                                      {amtCenters.length === 0 ? (
                                        <Button 
                                          onClick={handleCheckTurnoAvailability}
                                          disabled={isLoadingTurnos || isBlocked}
                                          variant="outline"
                                          size="sm"
                                          className="h-8 text-[10px] font-bold uppercase tracking-widest border-blue-200 text-blue-600 hover:bg-blue-50"
                                        >
                                          {isLoadingTurnos ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : <CalendarClock className="w-3 h-3 mr-2" />}
                                          Consultar Disponibilidad Interna
                                        </Button>
                                      ) : (
                                        <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 space-y-2">
                                          {amtCenters.map((c, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100 shadow-sm">
                                              <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 truncate">{c.nombre}</p>
                                                <p className="text-[9px] text-slate-500">{c.disponibilidad}</p>
                                              </div>
                                              <Button 
                                                onClick={() => handleBookTurno(c)}
                                                disabled={isBooking}
                                                size="sm"
                                                className="h-7 px-3 text-[9px] font-black bg-blue-600 hover:bg-blue-700"
                                              >
                                                {isBooking ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : 'Agendar'}
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* PHASE 4: Finalize Interaction */}
                                {p.id === 'revision' && !isCompleted && !isBlocked && (
                                  <div className="mt-2">
                                    <Button 
                                      onClick={handleFinalizarCiclo}
                                      disabled={isFinalizing}
                                      className="h-9 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl shadow-md shadow-emerald-100"
                                    >
                                      {isFinalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
                                      Finalizar y Cerrar Ciclo
                                    </Button>
                                    <p className="text-[9px] text-slate-400 mt-2 italic font-medium">Esta acción moverá el vehículo al historial de cierres aprobados.</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
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
            disabled={(!isRuc && localFineData.tieneMultas && localFineData.totalMultas > 0) || !!fineError}
            className="w-full py-6 rounded-xl bg-blue-700 text-white font-bold hover:bg-blue-800 transition-all shadow-sm flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {fineError ? 'Servicio no disponible' : actionText}
            {!fineError && <ArrowRight className="w-4 h-4" />}
          </Button>
        </div>

      </SheetContent>
    </Sheet>
  );
}
