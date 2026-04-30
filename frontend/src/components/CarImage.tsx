'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Car } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { getVehicleColorClass } from '../lib/vehicleColorUtils';

interface CarImageProps {
  marca?: string;
  modelo?: string;
  color?: string;
  fuente?: string;
}

/**
 * Calls our backend proxy which follows the Unsplash redirect server-side
 * and returns the final CDN image URL.
 */
async function fetchCarImage(marca: string, modelo: string): Promise<string | null> {
  try {
    const query = `${marca} ${modelo}`;
    const res = await fetch(
      `http://localhost:3001/api/imagen/vehiculo?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.success && data.url ? data.url : null;
  } catch {
    return null;
  }
}

function hasValidData(marca?: string, modelo?: string) {
  return (
    marca && modelo &&
    marca !== 'Desconocido' && marca !== '' &&
    modelo !== 'Desconocido' && modelo !== ''
  );
}

function FallbackIllustration({ color, fuente }: { color?: string; fuente?: string }) {
  const classes = getVehicleColorClass(color, fuente);
  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-3 ${classes.bg}`}>
      <Car className={`w-14 h-14 ${classes.text} opacity-50`} strokeWidth={1.2} />
      <p className="text-xs font-semibold text-slate-400 tracking-widest uppercase">
        Vista no disponible
      </p>
    </div>
  );
}

export default function CarImage({ marca, modelo, color, fuente }: CarImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');

  useEffect(() => {
    if (!hasValidData(marca, modelo)) {
      setImageUrl(null);
      setLoadState('idle');
      return;
    }

    setLoadState('fetching');
    setImageUrl(null);

    fetchCarImage(marca!, modelo!).then((url) => {
      if (url) {
        setImageUrl(url);
        setLoadState('ready');
      } else {
        setLoadState('error');
      }
    });
  }, [marca, modelo]);

  const showFallback = loadState === 'idle' || loadState === 'error';
  const showSkeleton = loadState === 'fetching';

  return (
    <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>

      {/* Skeleton — while resolving URL */}
      <AnimatePresence>
        {showSkeleton && (
          <motion.div
            key="skeleton"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Skeleton className="absolute inset-0 w-full h-full rounded-none" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fallback illustration */}
      <AnimatePresence>
        {showFallback && (
          <motion.div
            key="fallback"
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <FallbackIllustration color={color} fuente={fuente} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real image — fade-in + subtle zoom on reveal */}
      <AnimatePresence>
        {imageUrl && loadState === 'ready' && (
          <motion.div
            key={imageUrl}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={`${marca} ${modelo}`}
              className="w-full h-full object-cover"
              onError={() => setLoadState('error')}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom gradient overlay */}
      {loadState === 'ready' && (
        <div
          className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(to top, rgba(248,250,252,1) 0%, rgba(248,250,252,0) 100%)',
          }}
        />
      )}
    </div>
  );
}
