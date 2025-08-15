'use client';

import { useEffect, useRef } from 'react';

export function HeroParticles() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    let raf = 0;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.floor(width * DPR);
      canvas.height = Math.floor(height * DPR);
      ctx.scale(DPR, DPR);
    }
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    resize();

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      vx: (Math.random() - 0.5) * 0.6,
      vy: (Math.random() - 0.5) * 0.6,
      r: Math.random() * 1.8 + 0.7,
    }));

    function loop() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;

        const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        g1.addColorStop(0, 'rgba(168,85,247,0.8)');
        g1.addColorStop(1, 'rgba(168,85,247,0)');
        ctx.fillStyle = g1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 -z-10 opacity-30" />;
}



