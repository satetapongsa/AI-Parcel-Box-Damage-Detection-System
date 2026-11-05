'use client';

import { useEffect, useRef, useState } from 'react';
import { createSim, step, snapshot, applySettings, getSettings, DEFAULT_SETTINGS } from './engine';

const STORAGE_KEY = 'spdi.sim.settings.v1';

/** Saved control-panel settings live in this browser only (localStorage). */
export function loadSaved() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSettings(sim) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...getSettings(sim), savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

export function clearSaved(sim) {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: nothing to clear */
  }
  applySettings(sim, DEFAULT_SETTINGS);
}

/**
 * Runs the simulation.
 *  - The engine is stepped by a timer (~30 Hz). Browsers slow timers down in background tabs,
 *    so each tick uses the real elapsed time (sub-stepped) and the line keeps "running" like a
 *    real factory monitor even when the tab is hidden.
 *  - frame: re-render counter from requestAnimationFrame (only the conveyor scene needs it)
 *  - snap:  plain-data snapshot refreshed 4x per second (KPIs, charts, logs)
 */
export function useSim() {
  const simRef = useRef(null);
  if (simRef.current === null) simRef.current = createSim();
  const [frame, setFrame] = useState(0);
  const [snap, setSnap] = useState(() => snapshot(simRef.current));

  // restore saved settings once, after mount (localStorage is not available on the server)
  useEffect(() => {
    const saved = loadSaved();
    if (saved) {
      applySettings(simRef.current, saved);
      setSnap(snapshot(simRef.current));
    }
  }, []);

  useEffect(() => {
    let last = performance.now();
    let lastSnap = 0;
    const tick = () => {
      const now = performance.now();
      let dt = Math.min((now - last) / 1000, 2); // cap long gaps (sleep, debugger)
      last = now;
      while (dt > 0) {
        const h = Math.min(dt, 0.05);
        step(simRef.current, h);
        dt -= h;
      }
      if (now - lastSnap > 250) {
        lastSnap = now;
        setSnap(snapshot(simRef.current));
      }
    };
    const timer = setInterval(tick, 33);

    let raf = 0;
    const draw = () => {
      setFrame((f) => (f + 1) % 1e9);
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      clearInterval(timer);
      cancelAnimationFrame(raf);
    };
  }, []);

  const refresh = () => setSnap(snapshot(simRef.current));
  return { sim: simRef.current, frame, snap, refresh };
}
