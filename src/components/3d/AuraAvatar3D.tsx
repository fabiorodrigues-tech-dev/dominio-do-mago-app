/**
 * AuraAvatar3D — aura procedural do mago (R3F), com proteção contra "WebGL Context Lost".
 *
 * Estratégia anti-context-lost:
 *  1. Deteta suporte WebGL antes de montar o Canvas (e liberta o contexto de teste).
 *  2. Só existe UM Canvas; é desmontado ao sair da rota (R3F faz dispose + forceContextLoss).
 *  3. Escuta `webglcontextlost` → preventDefault() (obrigatório para o browser poder restaurar).
 *     Se não restaurar em 2s, remonta o Canvas (até 3 tentativas) e depois cai para fallback CSS.
 *  4. Pausa o render (frameloop="never") fora do viewport ou com o separador oculto.
 *  5. Orçamento de GPU baixo: dpr ≤ 1.5, sem antialias, sem sombras, geometria leve.
 *  6. ErrorBoundary: qualquer exceção do Canvas vira fallback em vez de ecrã branco.
 *
 * Para trocar a aura por um modelo GLB: substitua <AuraScene/> por um componente
 * com `useGLTF('/models/avatar.glb')` (drei) mantendo o resto igual.
 */
import React, { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';

const originalWarn = console.warn;
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('THREE.Clock: This module has been deprecated')) return;
  originalWarn(...args);
};

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, Sparkles, useGLTF } from '@react-three/drei';
import type { Group } from 'three';

interface AuraAvatar3DProps {
  /** 0–100. Controla cor e tamanho da aura. */
  pranaLevel?: number;
  className?: string;
}

const MAX_RETRIES = 3;
const RESTORE_TIMEOUT_MS = 2000;

// ── Utilitários ─────────────────────────────────────────────────────────
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch {
    return false;
  }
}

function palette(prana: number) {
  if (prana <= 10) return { core: '#f43f5e', ring: '#fb7185' }; // exaustão
  if (prana >= 75) return { core: '#22d3ee', ring: '#34d399' }; // flow
  return { core: '#9D4EDD', ring: '#00D9FF' };                   // arcano
}

// ── Fallback (sem WebGL / falhas repetidas) ─────────────────────────────
const AuraFallback: React.FC<{ prana: number }> = ({ prana }) => {
  const { core, ring } = palette(prana);
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div
        className="w-3/5 aspect-square rounded-full animate-pulse-glow"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${ring}, ${core} 55%, transparent 72%)`,
          filter: 'blur(2px)',
        }}
      />
    </div>
  );
};

// ── ErrorBoundary ───────────────────────────────────────────────────────
class CanvasBoundary extends Component<
  { fallback: React.ReactNode; onError: () => void; children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

// ── Guarda do contexto WebGL (dentro do Canvas) ─────────────────────────
const ContextGuard: React.FC<{ onLost: () => void; onRestored: () => void }> = ({ onLost, onRestored }) => {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault(); // sem isto o browser nunca restaura o contexto
      onLost();
    };
    el.addEventListener('webglcontextlost', lost, false);
    el.addEventListener('webglcontextrestored', onRestored, false);
    return () => {
      el.removeEventListener('webglcontextlost', lost, false);
      el.removeEventListener('webglcontextrestored', onRestored, false);
    };
  }, [gl, onLost, onRestored]);
  return null;
};

class ModelBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: any) { console.warn("Failed to load 3D model:", error); }
  render() { return this.state.hasError ? null : this.props.children; }
}

const AvatarModel: React.FC<{ scale: number; reduced: boolean }> = ({ scale, reduced }) => {
  const modelRef = useRef<Group>(null);
  const { scene } = useGLTF('/avatar_fabio.glb');

  useFrame(({ clock }) => {
    if (reduced || !modelRef.current) return;
    const t = clock.getElapsedTime();
    // Rotation suave no eixo Y
    modelRef.current.rotation.y = Math.sin(t * 0.5) * 0.1;
    // Flutuação vertical
    modelRef.current.position.y = -1.8 + Math.sin(t * 1.5) * 0.1;
  });

  return (
    <primitive 
      ref={modelRef}
      object={scene} 
      scale={scale * 1.5} 
      position={[0, -1.8, 0]} 
    />
  );
};

// ── Cena ────────────────────────────────────────────────────────────────
const AuraScene: React.FC<{ prana: number; reduced: boolean }> = ({ prana, reduced }) => {
  const ringA = useRef<Group>(null);
  const ringB = useRef<Group>(null);
  const { core, ring } = palette(prana);
  const scale = 0.9 + (Math.min(100, Math.max(0, prana)) / 100) * 0.25;

  useFrame((_, dt) => {
    if (reduced) return;
    if (ringA.current) {
      ringA.current.rotation.z += dt * 0.4;
      ringA.current.rotation.x += dt * 0.15;
    }
    if (ringB.current) {
      ringB.current.rotation.y -= dt * 0.3;
      ringB.current.rotation.z -= dt * 0.1;
    }
  });

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[2, 5, 2]} intensity={2} />
      <pointLight position={[4, 4, 4]} intensity={10} color={ring} />
      
      <Float speed={reduced ? 0 : 1.6} rotationIntensity={0.1} floatIntensity={0.2}>
        <ModelBoundary>
          <Suspense fallback={null}>
            <AvatarModel scale={scale} reduced={reduced} />
          </Suspense>
        </ModelBoundary>
        <group ref={ringA} rotation={[1.1, 0, 0]}>
          <mesh>
            <torusGeometry args={[1.6, 0.015, 8, 96]} />
            <meshBasicMaterial color={ring} transparent opacity={0.7} />
          </mesh>
        </group>
        <group ref={ringB} rotation={[0.4, 0.9, 0]}>
          <mesh>
            <torusGeometry args={[1.9, 0.01, 8, 96]} />
            <meshBasicMaterial color={core} transparent opacity={0.5} />
          </mesh>
        </group>
      </Float>
      {!reduced && <Sparkles count={40} scale={[4, 4, 4]} size={2} speed={0.4} color={ring} />}
    </>
  );
};

// ── Componente público ──────────────────────────────────────────────────
const AuraAvatar3D: React.FC<AuraAvatar3DProps> = ({ pranaLevel = 50, className = '' }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const retries = useRef(0);
  const restoreTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [attempt, setAttempt] = useState(0); // muda a `key` → remonta o Canvas
  const [failed, setFailed] = useState(() => typeof document !== 'undefined' && !hasWebGL());
  const [active, setActive] = useState(true);

  const reduced = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // Pausa o render fora do viewport / separador oculto
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    let inView = true;
    let tabVisible = !document.hidden;
    const sync = () => setActive(inView && tabVisible);

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      sync();
    }, { threshold: 0.05 });
    io.observe(el);

    const onVis = () => {
      tabVisible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  useEffect(() => () => clearTimeout(restoreTimer.current), []);

  const giveUp = useCallback(() => setFailed(true), []);

  const handleLost = useCallback(() => {
    clearTimeout(restoreTimer.current);
    restoreTimer.current = setTimeout(() => {
      if (retries.current >= MAX_RETRIES) return setFailed(true);
      retries.current += 1;
      setAttempt((a) => a + 1); // remonta o Canvas com contexto novo
    }, RESTORE_TIMEOUT_MS);
  }, []);

  const handleRestored = useCallback(() => {
    clearTimeout(restoreTimer.current);
    retries.current = 0;
  }, []);

  return (
    <div
      ref={wrapRef}
      role="img"
      aria-label={`Aura do mago — Prana ${pranaLevel} de 100`}
      className={`relative w-full aspect-square ${className}`}
    >
      {failed ? (
        <AuraFallback prana={pranaLevel} />
      ) : (
        <CanvasBoundary key={attempt} fallback={<AuraFallback prana={pranaLevel} />} onError={giveUp}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 40 }}
            dpr={[1, 1.5]}
            frameloop={!active ? 'never' : reduced ? 'demand' : 'always'}
            gl={{ antialias: false, alpha: true, powerPreference: 'default', stencil: false }}
            style={{ background: 'transparent' }}
          >
            <ContextGuard onLost={handleLost} onRestored={handleRestored} />
            <Suspense fallback={null}>
              <AuraScene prana={pranaLevel} reduced={reduced} />
            </Suspense>
          </Canvas>
        </CanvasBoundary>
      )}
    </div>
  );
};

export default AuraAvatar3D;

useGLTF.preload('/avatar_fabio.glb');
