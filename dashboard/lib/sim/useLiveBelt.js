'use client';

import { useEffect, useRef, useState } from 'react';
import { createSim, step, addLiveBox } from './engine';

const POLL_MS = 1500;
const DELAY_MIN_MS = 2000; // a box appears 2-5 s after CiRA + bridge counted it
const DELAY_MAX_MS = 5000;

/**
 * Conveyor animation driven by REAL inspections (MongoDB via /api/events).
 * Nothing is random about the result: each new event puts one box on the belt,
 * it passes the camera, and goes to the exit (PASS) or a reject bin (FAIL)
 * exactly like the real decision. Events that existed before the page was opened
 * are not replayed.
 */
export function useLiveBelt() {
  const simRef = useRef(null);
  if (simRef.current === null) simRef.current = createSim({ live: true });
  const [frame, setFrame] = useState(0);
  const [info, setInfo] = useState({ received: 0, waiting: 0, lastAt: null, error: null });

  // engine + drawing loop (same timing approach as the simulation page)
  useEffect(() => {
    let last = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      let dt = Math.min((now - last) / 1000, 2);
      last = now;
      while (dt > 0) {
        const h = Math.min(dt, 0.05);
        step(simRef.current, h);
        dt -= h;
      }
    }, 33);
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

  // poll new inspections and drop each one on the belt after a short delay
  useEffect(() => {
    const seen = new Set();
    let first = true;
    let stopped = false;
    const timeouts = new Set();
    let waiting = 0;
    let received = 0;

    async function poll() {
      try {
        const res = await fetch('/api/events?limit=50', { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
        const list = (data.events || []).slice().reverse(); // oldest first
        const fresh = [];
        for (const ev of list) {
          if (seen.has(ev.eventId)) continue;
          seen.add(ev.eventId);
          if (!first) fresh.push(ev);
        }
        first = false;
        fresh.forEach((ev, i) => {
          waiting += 1;
          const delay = DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS) + i * 400;
          const id = setTimeout(() => {
            timeouts.delete(id);
            if (stopped) return;
            addLiveBox(simRef.current, ev);
            waiting -= 1;
            setInfo((s) => ({ ...s, waiting }));
          }, delay);
          timeouts.add(id);
        });
        if (fresh.length) received += fresh.length;
        setInfo((s) => ({ received, waiting, lastAt: fresh.length ? Date.now() : s.lastAt, error: null }));
      } catch (err) {
        setInfo((s) => ({ ...s, error: err.message || 'Network error' }));
      }
    }

    poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
      timeouts.forEach(clearTimeout);
    };
  }, []);

  return { sim: simRef.current, frame, info };
}
