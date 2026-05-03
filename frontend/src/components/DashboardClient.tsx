'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './Sidebar';
import DashboardGrid from './DashboardGrid';
import DetailDrawer from './DetailDrawer';
import NotificationCenter from './NotificationCenter';
import { Skeleton } from './ui/skeleton';
import { Plus, X, Loader2 } from 'lucide-react';

import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

export default function DashboardClient() {
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCiclo, setSelectedCiclo] = useState<any | null>(null);
  const [updatedIds, setUpdatedIds] = useState<Set<string>>(new Set());
  
  // Ref to always access latest selectedCiclo without stale closure
  const selectedCicloRef = useRef<any | null>(null);
  useEffect(() => { selectedCicloRef.current = selectedCiclo; }, [selectedCiclo]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'entidades_monitoreadas',
        },
        (payload) => {
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Detect sync completion
          if (newData.sync_status === 'COMPLETADO' && oldData.sync_status !== 'COMPLETADO') {
            toast.success(`Sincronización Exitosa`, {
              description: `El vehículo ${newData.identificador} ha sido procesado correctamente.`,
              duration: 5000,
            });
            fetchCiclos();
          }

          // Detect sync failure
          if (['FALLO_PORTAL', 'CAPTCHA_DETECTADO'].includes(newData.sync_status) && oldData.sync_status !== newData.sync_status) {
            toast.error(`Atención en ${newData.identificador}`, {
              description: newData.sync_message || 'Hubo un problema con la sincronización oficial.',
              duration: 6000,
            });
            fetchCiclos();
          }
          
          // If the updated entity is the one currently open, we might need to refresh it
          if (selectedCicloRef.current?.entidades_monitoreadas?.id === newData.id) {
            fetchCiclos();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const [showNewModal, setShowNewModal] = useState(false);
  const [newPlaca, setNewPlaca] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [creationStep, setCreationStep] = useState('');

  const handleCreateNew = async () => {
    if (!newPlaca || newPlaca.length < 6) return;
    setIsCreating(true);
    setCreationStep('Iniciando validación oficial...');
    
    const steps = [
      'Obteniendo información de ANT y SRI...',
      'Extrayendo ficha técnica técnica...',
      'Sincronizando valores de deuda...',
      'Finalizando registro en Bucle...'
    ];
    
    let stepIdx = 0;
    const interval = setInterval(() => {
      if (stepIdx < steps.length) {
        setCreationStep(steps[stepIdx]);
        stepIdx++;
      }
    }, 1800);

    try {
      const res = await fetch('http://localhost:3001/api/vehiculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: newPlaca })
      });
      
      clearInterval(interval);
      
      if (res.ok) {
        const result = await res.json();
        setCreationStep('¡Vehículo registrado con éxito!');
        
        // Brief pause to show success message
        setTimeout(async () => {
          setShowNewModal(false);
          setNewPlaca('');
          setCreationStep('');
          
          // Refresh list
          const refreshRes = await fetch('http://localhost:3001/api/dashboard');
          const refreshData = await refreshRes.json();
          if (refreshData.success) {
            setCiclos(refreshData.data);
            // Find the new cycle and open it
            const newCycle = refreshData.data.find((c: any) => c.entidades_monitoreadas?.identificador === newPlaca.toUpperCase());
            if (newCycle) setSelectedCiclo(newCycle);
          }
        }, 1000);
        
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Error al crear');
        setCreationStep('');
      }
    } catch (err) {
      alert('Error de red');
      setCreationStep('');
    } finally {
      clearInterval(interval);
      setIsCreating(false);
    }
  };

  const fetchCiclos = useCallback(() => {
    fetch('http://localhost:3001/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const newCiclos: any[] = data.data;
          
          // Detect which cards changed their nombre_alias to flash them
          setCiclos(prev => {
            const changed = new Set<string>();
            newCiclos.forEach((c: any) => {
              const old = prev.find((p: any) => p.id === c.id);
              if (old && old.entidades_monitoreadas?.nombre_alias !== c.entidades_monitoreadas?.nombre_alias) {
                changed.add(c.id);
              }
            });
            if (changed.size > 0) {
              setUpdatedIds(changed);
              // Clear flash after animation completes
              setTimeout(() => setUpdatedIds(new Set()), 1800);
            }
            return newCiclos;
          });

          // Update selectedCiclo using ref to avoid stale closure
          const current = selectedCicloRef.current;
          if (current) {
            const updated = newCiclos.find((c: any) => c.id === current.id);
            if (updated) setSelectedCiclo(updated);
          }
        } else {
          setError('Error de conexión con el servidor');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('Error de conexión con el servidor');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchCiclos();
  }, []);

  return (
    <>
      <Sidebar />
      <div className="flex-1 h-full flex flex-col relative overflow-hidden">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shadow-sm shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Hola, Saoricoder</h2>
            <p className="text-sm text-slate-500 font-medium mt-0.5">Aquí está el resumen de tus ciclos activos.</p>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <div className="w-10 h-10 rounded-full border border-slate-200 shadow-sm overflow-hidden bg-slate-50">
               {/* Initials placeholder */}
               <div className="w-full h-full flex items-center justify-center font-bold text-slate-400">SA</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Ciclos Activos</h3>
            <button 
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Agregar Nuevo Auto
            </button>
          </div>
          
          {loading ? (
             <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <Skeleton className="h-48 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
             </div>
          ) : error ? (
             <div className="text-center py-20 text-red-500 font-medium bg-red-50 border border-red-100 rounded-2xl">
               {error}
             </div>
          ) : ciclos.length > 0 ? (
            <DashboardGrid ciclos={ciclos} onSelect={setSelectedCiclo} updatedIds={updatedIds} />
          ) : (
            <div className="text-center py-20 text-slate-500 font-medium bg-slate-50 border border-slate-200 rounded-2xl">
              No tienes activos registrados. ¡Empieza agregando tu primer RUC o Vehículo!
            </div>
          )}
        </div>

        {/* Modal for New Vehicle */}
        {showNewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">Nuevo Vehículo</h3>
                <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-4">Ingresa la placa del vehículo que deseas gestionar.</p>
              <input 
                type="text" 
                placeholder="Ej. AAA0123" 
                value={newPlaca}
                onChange={(e) => setNewPlaca(e.target.value.toUpperCase())}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 mb-4 uppercase focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                maxLength={8}
              />
              <button 
                onClick={handleCreateNew}
                disabled={isCreating || newPlaca.length < 6}
                className="w-full flex flex-col justify-center items-center gap-2 bg-slate-900 text-white rounded-xl py-4 text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-lg shadow-slate-200"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-[10px] uppercase tracking-widest opacity-70 animate-pulse">{creationStep}</span>
                  </>
                ) : (
                  <span>Registrar Auto</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
      {selectedCiclo && (
        <DetailDrawer 
          ciclo={selectedCiclo} 
          onClose={() => setSelectedCiclo(null)} 
          onUpdate={fetchCiclos} 
        />
      )}
    </>
  );
}
