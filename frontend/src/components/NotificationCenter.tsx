'use client';

import { useState, useEffect } from 'react';
import { Bell, X, Calendar, AlertTriangle, FileClock, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationCenter() {
  const [notifs, setNotifs] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/notificaciones');
      const json = await res.json();
      if (json.success) setNotifs(json.data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    // Refresh every minute
    const interval = setInterval(fetchNotifs, 60000);
    return () => clearInterval(interval);
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`http://localhost:3001/api/notificaciones/${id}/leer`, { method: 'POST' });
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const unreadCount = notifs.filter(n => !n.leida).length;

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'CADUCIDAD': return <FileClock className="w-4 h-4 text-orange-500" />;
      case 'MULTA_NUEVA': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'CALENDARIO': return <Calendar className="w-4 h-4 text-blue-500" />;
      default: return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-6 h-6 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-3 w-80 max-h-[450px] bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  Notificaciones
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                      {unreadCount} nuevas
                    </span>
                  )}
                </h3>
                <button onClick={() => setIsOpen(false)}>
                  <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
                ) : notifs.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center gap-3">
                    <CheckCircle className="w-10 h-10 text-emerald-200" />
                    <p className="text-slate-400 text-sm font-medium">Todo al día. No tienes alertas.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {notifs.map((n) => (
                      <div 
                        key={n.id} 
                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.leida ? 'bg-blue-50/30' : ''}`}
                        onClick={() => markAsRead(n.id)}
                      >
                        {!n.leida && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                        )}
                        <div className="flex gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${n.tipo === 'MULTA_NUEVA' ? 'bg-red-50' : n.tipo === 'CADUCIDAD' ? 'bg-orange-50' : 'bg-blue-50'}`}>
                            {getIcon(n.tipo)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold ${!n.leida ? 'text-slate-900' : 'text-slate-600'}`}>
                              {n.titulo}
                            </p>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {n.mensaje}
                            </p>
                            <div className="flex justify-between items-center mt-2">
                              <span className="text-[10px] font-bold text-blue-600 uppercase">
                                {n.entidades_monitoreadas?.nombre_alias || n.entidades_monitoreadas?.identificador}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {new Date(n.creado_en).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <button className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                  Ver todas las alertas
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
