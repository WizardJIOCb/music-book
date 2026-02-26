/* Romana's Book — Gold Dust (Super) */
(function () {
  "use strict";

  const CONFIG = {
    // quality
    maxParticles: 520,
    spawnRate: 32,          // particles/sec at full quality
    dprCap: 2,

    // lifetime
    lifeDust: [900, 1900],  // ms
    lifeSpark: [400, 900],  // ms

    // motion (px/sec)
    speedDust: [10, 45],
    speedSpark: [70, 160],
    spread: 0.85,           // angular spread around upward
    buoyancy: -55,          // px/sec^2 (negative -> up)
    drift: 10,              // random sideways drift strength
    drag: 0.985,            // velocity damping per frame (approx)

    // look
    dustSize: [1.0, 3.0],
    sparkSize: [2.0, 5.5],
    sparkChance: 0.10,
    glowDust: 10,
    glowSpark: 16,
    composite: "lighter",   // "lighter" (more fire) or "screen" (calmer)

    // emission
    alphaThreshold: 18,     // for raster mask
    maxEmissionPoints: 9000,
    svgStep: 6,             // sampling step along SVG path length

    // colors (gold ramp)
    colors: [
      [255, 244, 210], // highlight
      [244, 206, 120], // gold
      [212, 154, 42],  // amber
      [140, 86, 18],   // deep
    ],

    // behavior
    prefersReducedMotion: true,
    autoDegradeFps: 48,
  };

  let canvas, ctx, heroEl, logoImgEl, logoSvgEl;
  let cssW = 0, cssH = 0, dpr = 1;

  // Emission mapping
  let logoRect = null; // in hero coords
  let raster = { w: 0, h: 0, points: [] }; // for IMG mask
  let svg = { vb: null, points: [] };      // for SVG sampling
  let useFallback = false;

  // Particles
  const particles = [];
  let poolIndex = 0;

  // Animation
  let lastT = 0;
  let spawnAcc = 0;
  let rafId = 0;
  let visible = true;
  let reducedMotion = false;

  // Adaptive quality
  let currentSpawnRate = CONFIG.spawnRate;
  let fpsAvg = 60;
  const fpsBuf = [];

  // Pre-rendered sprites
  let dustSprites = [];
  let sparkSprites = [];

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2)/2; }

  // Simple smooth-ish noise (cheap)
  function noise2(seed, t) {
    return Math.sin(seed * 12.9898 + t * 0.0013) * 0.5 +
           Math.sin(seed * 78.233  + t * 0.0009) * 0.5;
  }

  // ---------- Particles ----------
  function makeParticle() {
    return {
      active: false,
      type: "dust", // dust|spark
      x: 0, y: 0, px: 0, py: 0,
      vx: 0, vy: 0,
      size: 2, baseSize: 2,
      a: 1, baseA: 1,
      life: 0, ttl: 1000,
      rot: 0, spin: 0,
      seed: Math.random() * 1000,
      colorT: 0, // 0..1 (for ramp)
    };
  }

  function initPool() {
    particles.length = 0;
    for (let i = 0; i < CONFIG.maxParticles; i++) particles.push(makeParticle());
  }

  function getParticle() {
    // find inactive
    for (let i = 0; i < particles.length; i++) {
      poolIndex = (poolIndex + 1) % particles.length;
      const p = particles[poolIndex];
      if (!p.active) return p;
    }
    // reuse
    poolIndex = (poolIndex + 1) % particles.length;
    return particles[poolIndex];
  }

  // ---------- Sprites ----------
  function makeDustSprite(radiusPx) {
    const r = Math.max(6, Math.ceil(radiusPx * 6));
    const c = document.createElement("canvas");
    c.width = c.height = r * 2;
    const g = c.getContext("2d");

    const grad = g.createRadialGradient(r, r, 0, r, r, r);
    grad.addColorStop(0.00, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.beginPath();
    g.arc(r, r, r, 0, Math.PI * 2);
    g.fill();

    return c;
  }

  function makeSparkSprite(lengthPx, thicknessPx) {
    const w = Math.max(18, Math.ceil(lengthPx * 4));
    const h = Math.max(10, Math.ceil(thicknessPx * 6));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");

    const cx = w * 0.35;
    const cy = h * 0.5;
    const rx = w * 0.45;
    const ry = h * 0.35;

    const grad = g.createRadialGradient(cx, cy, 0, cx, cy, rx);
    grad.addColorStop(0.00, "rgba(255,255,255,1)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.75)");
    grad.addColorStop(1.00, "rgba(255,255,255,0)");
    g.fillStyle = grad;

    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();

    return c;
  }

  function buildSprites() {
    dustSprites = [
      makeDustSprite(1.2),
      makeDustSprite(1.8),
      makeDustSprite(2.6),
    ];
    sparkSprites = [
      makeSparkSprite(10, 1.2),
      makeSparkSprite(14, 1.6),
      makeSparkSprite(18, 2.0),
    ];
  }

  // ---------- Emission points ----------
  function updateLogoRect() {
    if (!heroEl) return;
    const heroRect = heroEl.getBoundingClientRect();
    let rect = null;

    if (logoImgEl) rect = logoImgEl.getBoundingClientRect();
    if (logoSvgEl) rect = logoSvgEl.getBoundingClientRect();
    if (!rect) return;

    logoRect = {
      left: rect.left - heroRect.left,
      top: rect.top - heroRect.top,
      width: rect.width,
      height: rect.height,
    };
  }

  function extractFromSVG() {
    if (!logoSvgEl) return false;

    const vb = logoSvgEl.viewBox && logoSvgEl.viewBox.baseVal
      ? { x: logoSvgEl.viewBox.baseVal.x, y: logoSvgEl.viewBox.baseVal.y, w: logoSvgEl.viewBox.baseVal.width, h: logoSvgEl.viewBox.baseVal.height }
      : null;

    if (!vb || vb.w <= 0 || vb.h <= 0) return false;
    svg.vb = vb;

    const points = [];
    const els = logoSvgEl.querySelectorAll("path, line, polyline, polygon, circle, ellipse, rect");

    els.forEach((el) => {
      if (typeof el.getTotalLength !== "function") return;
      let len = 0;
      try { len = el.getTotalLength(); } catch { return; }
      if (!isFinite(len) || len <= 0) return;

      const step = CONFIG.svgStep;
      const n = Math.max(10, Math.floor(len / step));
      for (let i = 0; i <= n; i++) {
        const p = el.getPointAtLength((len * i) / n);
        points.push({ x: p.x, y: p.y });
      }
    });

    if (points.length === 0) return false;

    // downsample
    if (points.length > CONFIG.maxEmissionPoints) {
      const k = Math.ceil(points.length / CONFIG.maxEmissionPoints);
      svg.points = points.filter((_, i) => i % k === 0);
    } else {
      svg.points = points;
    }
    useFallback = false;
    return true;
  }

  function extractFromRaster() {
    if (!logoImgEl || !logoImgEl.complete || logoImgEl.naturalWidth === 0) return false;

    try {
      const w = (raster.w = logoImgEl.naturalWidth);
      const h = (raster.h = logoImgEl.naturalHeight);

      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const g = off.getContext("2d", { willReadFrequently: true });
      g.clearRect(0, 0, w, h);
      g.drawImage(logoImgEl, 0, 0);

      const img = g.getImageData(0, 0, w, h);
      const d = img.data;

      const th = CONFIG.alphaThreshold;
      const pts = [];

      // edge detection: alpha > th and any neighbor <= th
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const i = (y * w + x) * 4 + 3;
          const a = d[i];
          if (a <= th) continue;

          const n1 = d[((y - 1) * w + x) * 4 + 3];
          const n2 = d[((y + 1) * w + x) * 4 + 3];
          const n3 = d[(y * w + (x - 1)) * 4 + 3];
          const n4 = d[(y * w + (x + 1)) * 4 + 3];

          if (n1 <= th || n2 <= th || n3 <= th || n4 <= th) {
            // keep most edges + a little randomness for density
            if (Math.random() < 0.45) pts.push({ x, y });
          }
        }
      }

      if (pts.length === 0) return false;

      if (pts.length > CONFIG.maxEmissionPoints) {
        const k = Math.ceil(pts.length / CONFIG.maxEmissionPoints);
        raster.points = pts.filter((_, i) => i % k === 0);
      } else {
        raster.points = pts;
      }
      useFallback = false;
      return true;
    } catch (e) {
      // file:// or CORS => canvas tainted
      useFallback = true;
      raster.points = [];
      return false;
    }
  }

  function rebuildEmission() {
    // prefer SVG (best quality, no CORS pain)
    if (extractFromSVG()) return;

    // else try raster
    if (extractFromRaster()) return;

    // else fallback (still ok-ish)
    useFallback = true;
  }

  function pickEmissionPoint() {
    if (!logoRect) return { x: 0, y: 0 };

    // SVG emission
    if (!useFallback && svg.points.length && svg.vb) {
      const p = pick(svg.points);
      const vb = svg.vb;
      const nx = (p.x - vb.x) / vb.w;
      const ny = (p.y - vb.y) / vb.h;
      return {
        x: logoRect.left + nx * logoRect.width,
        y: logoRect.top + ny * logoRect.height,
      };
    }

    // Raster emission
    if (!useFallback && raster.points.length && raster.w && raster.h) {
      const p = pick(raster.points);
      return {
        x: logoRect.left + (p.x / raster.w) * logoRect.width,
        y: logoRect.top + (p.y / raster.h) * logoRect.height,
      };
    }

    // Fallback: emit more from top curves / edges (looks better than plain rect)
    const edgeBand = 0.18;
    const r = Math.random();
    let x, y;

    if (r < 0.55) {
      // upper half bias (fire)
      x = logoRect.left + Math.random() * logoRect.width;
      y = logoRect.top + Math.random() * logoRect.height * 0.55;
    } else if (r < 0.85) {
      // edges
      const side = (Math.random() * 4) | 0;
      if (side === 0) { x = logoRect.left + Math.random() * logoRect.width; y = logoRect.top + Math.random() * logoRect.height * edgeBand; }
      if (side === 1) { x = logoRect.left + Math.random() * logoRect.width; y = logoRect.top + logoRect.height * (1 - edgeBand) + Math.random() * logoRect.height * edgeBand; }
      if (side === 2) { x = logoRect.left + Math.random() * logoRect.width * edgeBand; y = logoRect.top + Math.random() * logoRect.height; }
      if (side === 3) { x = logoRect.left + logoRect.width * (1 - edgeBand) + Math.random() * logoRect.width * edgeBand; y = logoRect.top + Math.random() * logoRect.height; }
    } else {
      x = logoRect.left + Math.random() * logoRect.width;
      y = logoRect.top + Math.random() * logoRect.height;
    }

    return { x, y };
  }

  // ---------- Color ramp ----------
  function rampColor(t) {
    const cols = CONFIG.colors;
    const n = cols.length - 1;
    const x = clamp(t, 0, 1) * n;
    const i = Math.floor(x);
    const f = x - i;
    const c0 = cols[i];
    const c1 = cols[Math.min(i + 1, n)];
    return [
      (lerp(c0[0], c1[0], f)) | 0,
      (lerp(c0[1], c1[1], f)) | 0,
      (lerp(c0[2], c1[2], f)) | 0,
    ];
  }

  // ---------- Spawn / Update ----------
  function spawnOne() {
    const p = getParticle();
    const pos = pickEmissionPoint();

    p.active = true;
    p.x = p.px = pos.x;
    p.y = p.py = pos.y;

    const isSpark = Math.random() < CONFIG.sparkChance;
    p.type = isSpark ? "spark" : "dust";

    p.life = 0;
    p.ttl = isSpark ? rand(CONFIG.lifeSpark[0], CONFIG.lifeSpark[1]) : rand(CONFIG.lifeDust[0], CONFIG.lifeDust[1]);

    p.baseSize = isSpark ? rand(CONFIG.sparkSize[0], CONFIG.sparkSize[1]) : rand(CONFIG.dustSize[0], CONFIG.dustSize[1]);
    p.size = p.baseSize;

    p.baseA = isSpark ? rand(0.55, 0.95) : rand(0.15, 0.65);
    p.a = p.baseA;

    // mostly upward
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * CONFIG.spread;
    const sp = isSpark ? rand(CONFIG.speedSpark[0], CONFIG.speedSpark[1]) : rand(CONFIG.speedDust[0], CONFIG.speedDust[1]);
    p.vx = Math.cos(angle) * sp + rand(-CONFIG.drift, CONFIG.drift) * 0.4;
    p.vy = Math.sin(angle) * sp;

    p.rot = Math.random() * Math.PI * 2;
    p.spin = (Math.random() - 0.5) * (isSpark ? 2.2 : 1.2);

    p.seed = Math.random() * 1000;
    p.colorT = Math.random() * 0.15; // start closer to highlight
  }

  function updateOne(p, dtMs, nowMs) {
    if (!p.active) return;

    p.life += dtMs;
    if (p.life >= p.ttl) { p.active = false; return; }

    const dt = dtMs / 1000;

    // store prev
    p.px = p.x; p.py = p.y;

    // buoyancy + turbulence
    const t = p.life;
    const n = noise2(p.seed, nowMs);
    const wobble = n * (p.type === "spark" ? 22 : 12);

    p.vx += wobble * dt * 0.7;
    p.vy += (CONFIG.buoyancy + wobble * 0.2) * dt;

    // drag
    p.vx *= Math.pow(CONFIG.drag, dtMs / 16.67);
    p.vy *= Math.pow(CONFIG.drag, dtMs / 16.67);

    // integrate
    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // life ratio
    const r = p.life / p.ttl;

    // fade & size curve
    const fade = 1 - easeOutCubic(r);
    p.a = p.baseA * (0.25 + 0.75 * fade);

    // slightly shrink at end
    p.size = p.baseSize * (0.85 + 0.15 * (1 - r));

    // color shifts darker over life
    p.colorT = clamp(r * 0.95, 0, 1);

    // rotation
    p.rot += p.spin * dt;
  }

  // ---------- Render ----------
  function clear() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);
  }

  function render() {
    clear();
    ctx.globalCompositeOperation = CONFIG.composite;

    for (const p of particles) {
      if (!p.active) continue;
      if (p.a < 0.01) continue;

      const [r, g, b] = rampColor(p.colorT);

      ctx.save();
      ctx.translate(p.x, p.y);

      // glow
      ctx.shadowBlur = (p.type === "spark" ? CONFIG.glowSpark : CONFIG.glowDust);
      ctx.shadowColor = `rgba(${r},${g},${b},${p.a})`;

      // draw sprite
      const sprite = p.type === "spark" ? pick(sparkSprites) : pick(dustSprites);

      // sparks rotate by velocity direction
      if (p.type === "spark") {
        const ang = Math.atan2(p.y - p.py, p.x - p.px);
        ctx.rotate(ang);
      } else {
        ctx.rotate(p.rot);
      }

      ctx.globalAlpha = p.a;

      // tint: multiply-like via fillRect trick on sprite? (simple: just draw white sprite with colored shadow + colored fill)
      // We'll do colored draw by drawing sprite to offscreen would be heavier; instead use fillStyle + "source-atop"
      // Fast trick: draw sprite in white, then overlay colored with source-atop
      const w = sprite.width;
      const h = sprite.height;
      const scale = p.size / 2.2;
      const dw = w * scale;
      const dh = h * scale;

      // 1) white sprite
      ctx.drawImage(sprite, -dw / 2, -dh / 2, dw, dh);

      // 2) color overlay
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = `rgba(${r},${g},${b},${p.a})`;
      ctx.fillRect(-dw / 2, -dh / 2, dw, dh);

      // restore composite for next particle
      ctx.globalCompositeOperation = CONFIG.composite;

      // spark trail (subtle)
      if (p.type === "spark") {
        ctx.globalAlpha = p.a * 0.35;
        ctx.shadowBlur = 0;
        ctx.strokeStyle = `rgba(${r},${g},${b},${p.a * 0.35})`;
        ctx.lineWidth = Math.max(1, p.size * 0.35);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const trail = Math.min(18, Math.hypot(p.x - p.px, p.y - p.py) * 1.6);
        ctx.lineTo(-trail, 0);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  // ---------- Loop ----------
  function tick(t) {
    rafId = requestAnimationFrame(tick);

    if (!visible) return;
    if (reducedMotion) return;

    const dtMs = lastT ? (t - lastT) : 16.67;
    lastT = t;

    // FPS smoothing
    const fps = 1000 / Math.max(1, dtMs);
    fpsBuf.push(fps);
    if (fpsBuf.length > 30) fpsBuf.shift();
    fpsAvg = fpsBuf.reduce((a, b) => a + b, 0) / fpsBuf.length;

    // Auto degrade
    if (fpsAvg < CONFIG.autoDegradeFps) currentSpawnRate = Math.max(10, currentSpawnRate * 0.96);
    else currentSpawnRate = Math.min(CONFIG.spawnRate, currentSpawnRate * 1.01);

    // Spawn
    spawnAcc += dtMs;
    const interval = 1000 / currentSpawnRate;
    while (spawnAcc >= interval) {
      spawnOne();
      spawnAcc -= interval;
    }

    // Update
    for (const p of particles) updateOne(p, dtMs, t);

    // Render
    render();
  }

  // ---------- Canvas setup ----------
  function setupCanvas() {
    if (!canvas || !heroEl) return;

    dpr = Math.min(window.devicePixelRatio || 1, CONFIG.dprCap);

    const rect = heroEl.getBoundingClientRect();
    cssW = rect.width;
    cssH = rect.height;

    canvas.width = Math.max(1, Math.floor(cssW * dpr));
    canvas.height = Math.max(1, Math.floor(cssH * dpr));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";

    updateLogoRect();
  }

  function handleVisibility() {
    visible = !document.hidden;
    if (visible) {
      lastT = 0;
      spawnAcc = 0;
    }
  }

  function checkReducedMotion() {
    reducedMotion = CONFIG.prefersReducedMotion
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

    if (reducedMotion) {
      // stop particles
      particles.forEach((p) => (p.active = false));
      clear();
    }
  }

  function debounce(fn, ms) {
    let id = 0;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), ms);
    };
  }

  function throttle(fn, ms) {
    let last = 0;
    return (...args) => {
      const now = performance.now();
      if (now - last >= ms) { last = now; fn(...args); }
    };
  }

  // ---------- Init ----------
  function init() {
    heroEl = document.querySelector(".hero");
    canvas = document.getElementById("gold-dust-canvas");

    // prefer svg
    logoSvgEl = document.getElementById("romanas-logo-svg");
    // fallback to img
    logoImgEl = document.getElementById("romanas-logo");

    if (!heroEl || !canvas || (!logoSvgEl && !logoImgEl)) return;

    ctx = canvas.getContext("2d", { alpha: true });

    buildSprites();
    initPool();
    checkReducedMotion();

    setupCanvas();
    rebuildEmission();

    // observe changes
    const ro = new ResizeObserver(
      debounce(() => {
        setupCanvas();
        updateLogoRect();
        rebuildEmission();
      }, 120)
    );
    ro.observe(heroEl);
    if (logoSvgEl) ro.observe(logoSvgEl);
    if (logoImgEl) ro.observe(logoImgEl);

    window.addEventListener("resize", debounce(setupCanvas, 120));
    window.addEventListener("scroll", throttle(updateLogoRect, 60), { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    mq.addEventListener?.("change", checkReducedMotion);

    // if img load later
    if (logoImgEl && (!logoImgEl.complete || logoImgEl.naturalWidth === 0)) {
      logoImgEl.addEventListener("load", () => {
        updateLogoRect();
        rebuildEmission();
      });
    }

    rafId = requestAnimationFrame(tick);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();