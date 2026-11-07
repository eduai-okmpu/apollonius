/* Canvas drawing: a 100 x 70 world fitted to the canvas. Colors come from CSS tokens. */
window.RENDER = (function () {
  const W = 100, H = 70;
  let palette = null;

  function readPalette() {
    const s = getComputedStyle(document.documentElement);
    const g = (k) => s.getPropertyValue(k).trim();
    palette = { ink: g("--ink"), soft: g("--ink-soft"), pencil: g("--pencil"), accent: g("--accent"), marker: g("--marker"), paper: g("--paper"), rule: g("--rule") };
    return palette;
  }

  /* Prepare a canvas for crisp drawing; returns a context in world units.
     view = { cx, cy, z }: the world point at the canvas centre and the zoom factor. */
  const INFO = new WeakMap();
  let clip = { x: W / 2, y: H / 2, R: 80 };
  function setup(canvas, view, fixed) {
    const rect = fixed ? { width: canvas.width, height: canvas.height } : canvas.getBoundingClientRect();
    const dpr = fixed ? fixed.dpr : window.devicePixelRatio || 1;
    const w = fixed ? canvas.width : Math.max(1, Math.round(rect.width * dpr));
    const h = fixed ? canvas.height : Math.max(1, Math.round((rect.height || rect.width * 0.7) * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d");
    const v = view || { cx: W / 2, cy: H / 2, z: 1 };
    const base = Math.min(w / W, h / H), k = base * v.z;
    const ox = w / 2 - v.cx * k, oy = h / 2 - v.cy * k;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.setTransform(k, 0, 0, k, ox, oy);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    clip = { x: v.cx, y: v.cy, R: Math.hypot(w, h) / 2 / k + 2 };
    INFO.set(canvas, { k, ox, oy, dpr, w, h, base, rect });
    return { ctx, k, px: dpr / k }; // px: one CSS pixel in world units
  }
  /* Screen (client) coordinates to world coordinates for the last drawn frame. */
  function toWorld(canvas, clientX, clientY) {
    const i = INFO.get(canvas), r = canvas.getBoundingClientRect();
    if (!i) return { x: 0, y: 0 };
    return { x: ((clientX - r.left) * i.dpr - i.ox) / i.k, y: ((clientY - r.top) * i.dpr - i.oy) / i.k };
  }
  /* Visible world rectangle of the last drawn frame. */
  function visible(canvas) {
    const i = INFO.get(canvas);
    if (!i) return { x0: 0, y0: 0, x1: W, y1: H };
    return { x0: -i.ox / i.k, y0: -i.oy / i.k, x1: (i.w - i.ox) / i.k, y1: (i.h - i.oy) / i.k };
  }
  /* View that keeps world point (ax, ay) under client point (sx, sy) at zoom z. */
  function anchorView(canvas, ax, ay, sx, sy, z) {
    const i = INFO.get(canvas), r = canvas.getBoundingClientRect(), k = i.base * z;
    return { z, cx: ax - ((sx - r.left) * i.dpr - i.w / 2) / k, cy: ay - ((sy - r.top) * i.dpr - i.h / 2) / k };
  }

  const pal = () => palette || readPalette();

  function stroke(ctx, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.stroke();
  }

  /* Infinite line, cut to the visible area so dashes stay cheap. */
  function line(ctx, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    const t = (clip.x - x1) * ux + (clip.y - y1) * uy, fx = x1 + ux * t, fy = y1 + uy * t;
    const off = Math.hypot(clip.x - fx, clip.y - fy);
    ctx.beginPath();
    if (off > clip.R) return;
    const E = Math.sqrt(clip.R * clip.R - off * off) + 1;
    ctx.moveTo(fx - ux * E, fy - uy * E); ctx.lineTo(fx + ux * E, fy + uy * E);
  }
  /* Circle, drawn only where it crosses the visible area. Huge circles become short polylines. */
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    r = Math.max(0, r);
    const d = Math.hypot(x - clip.x, y - clip.y), D = clip.R;
    if (d + r <= D || r <= D) { ctx.arc(x, y, r, 0, Math.PI * 2); return; }
    if (Math.abs(d - r) >= D) return;
    const phi = Math.atan2(clip.y - y, clip.x - x);
    const a = Math.acos(Math.max(-1, Math.min(1, (d * d + r * r - D * D) / (2 * d * r))));
    if (r < 4000) { ctx.arc(x, y, r, phi - a, phi + a); return; }
    const n = 48;
    for (let i = 0; i <= n; i++) {
      const th = phi - a + (2 * a * i) / n, px = x + r * Math.cos(th), py = y + r * Math.sin(th);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  }
  function dot(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function label(ctx, text, x, y, size, color, italic) {
    ctx.font = `${italic ? "italic " : ""}500 ${size}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x, y);
  }

  /* Draw the given elements. opts: { px, labels, active (index), handles } */
  function drawGivens(ctx, els, opts) {
    const c = pal(), px = opts.px;
    const nm = window.CONSTRUCT ? CONSTRUCT.names(els) : { P: ["A", "B", "C"], L: ["l₁", "l₂", "l₃"], C: ["ω₁", "ω₂", "ω₃"] };
    let np = 0, nl = 0, nc = 0;
    els.forEach((e, i) => {
      const hot = opts.active === i;
      const col = hot ? c.marker : c.ink;
      if (e.t === "L") {
        line(ctx, e.x1, e.y1, e.x2, e.y2); stroke(ctx, col, 1.6 * px);
        if (opts.handles) { dot(ctx, e.x1, e.y1, 3.2 * px, col); dot(ctx, e.x2, e.y2, 3.2 * px, col); }
        if (opts.labels) label(ctx, nm.L[nl], e.x2 + 1.2, e.y2 - 1.2, 4, c.soft, true);
        nl++;
      } else if (e.t === "C") {
        circle(ctx, e.x, e.y, e.r); stroke(ctx, col, 1.6 * px);
        if (opts.handles) { dot(ctx, e.x, e.y, 2.6 * px, col); dot(ctx, e.x + e.r, e.y, 3.2 * px, col); }
        if (opts.labels) label(ctx, nm.C[nc], e.x + e.r * 0.72 + 0.8, e.y - e.r * 0.72 - 0.8, 4, c.soft, true);
        nc++;
      }
    });
    els.forEach((e, i) => {
      if (e.t !== "P") return;
      const hot = opts.active === i;
      dot(ctx, e.x, e.y, (opts.handles ? 4 : 3) * px, hot ? c.marker : c.ink);
      if (opts.labels) label(ctx, nm.P[np], e.x + 1.6, e.y - 1.6, 4.4, hot ? c.marker : c.ink, true);
      np++;
    });
  }
  const sub = (n) => "₀₁₂₃₄₅₆₇₈₉"[n] || n;

  /* Draw the construction items of steps 0..step. Earlier steps in pencil, the current one in ink. */
  function drawItems(ctx, steps, step, px) {
    const c = pal(), labels = [];
    const sols = [];
    steps.slice(0, step + 1).forEach((st, i) => {
      const cur = i === step, col = cur ? c.accent : c.pencil, w = (cur ? 1.3 : 1) * px;
      st.items.forEach((it) => {
        if (it.k === "line") { line(ctx, it.a.x, it.a.y, it.b.x, it.b.y); stroke(ctx, col, w, [4 * px, 3 * px]); }
        else if (it.k === "seg") { ctx.beginPath(); ctx.moveTo(it.a.x, it.a.y); ctx.lineTo(it.b.x, it.b.y); stroke(ctx, col, w); }
        else if (it.k === "circ") { circle(ctx, it.c.x, it.c.y, it.r); stroke(ctx, col, w, [3 * px, 2.5 * px]); }
        else if (it.k === "arc") {
          const ang = Math.atan2(it.at.y - it.c.y, it.at.x - it.c.x), span = Math.min(0.35, 4 / Math.max(it.r, 1));
          ctx.beginPath(); ctx.arc(it.c.x, it.c.y, it.r, ang - span, ang + span); stroke(ctx, col, w);
        }
        else if (it.k === "sol") sols.push({ it, cur });
        else if (it.k === "pt") labels.push({ it, cur });
      });
    });
    sols.forEach(({ it, cur }) => { circle(ctx, it.c.x, it.c.y, it.r); stroke(ctx, c.accent, (cur ? 2.6 : 2) * px); });
    return (showLabels) => labels.forEach(({ it, cur }) => {
      const col = cur ? c.accent : c.soft;
      dot(ctx, it.p.x, it.p.y, 2.4 * px, col);
      if (it.label && showLabels !== false) label(ctx, it.label, it.p.x + 1.4, it.p.y + 4.6, 4, col, true);
    });
  }

  function drawScene(canvas, els, o) {
    o = o || {};
    const { ctx, px } = setup(canvas, o.view);
    const after = o.steps ? drawItems(ctx, o.steps, o.step || 0, px) : null;
    drawGivens(ctx, els, { px, labels: o.labels, active: o.active, handles: o.handles });
    if (after) after();
  }

  /* Figure for print: fixed pixel size, its own palette, optional paper background and grid. */
  const PRINT = {
    color: { ink: "#1b2430", soft: "#4a5563", pencil: "#8e99a6", accent: "#2c41c4", marker: "#b06f12", paper: "#ffffff", rule: "#c8d0d9", grid: "#e6eaef" },
    bw: { ink: "#000000", soft: "#333333", pencil: "#8a8a8a", accent: "#000000", marker: "#000000", paper: "#ffffff", rule: "#999999", grid: "#e8e8e8" }
  };
  function drawFigure(canvas, els, o) {
    const saved = palette;
    palette = PRINT[o.scheme] || PRINT.color;
    try {
      const ctx = canvas.getContext("2d");
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      const { px } = setup(canvas, o.view, { dpr: o.dpr || 2 });
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = palette.paper; ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
      if (o.grid) {
        const b = visible(canvas);
        ctx.lineWidth = px * 0.8; ctx.strokeStyle = palette.grid; ctx.setLineDash([]);
        ctx.beginPath();
        for (let x = Math.ceil(b.x0 / 5) * 5; x <= b.x1; x += 5) { ctx.moveTo(x, b.y0); ctx.lineTo(x, b.y1); }
        for (let y = Math.ceil(b.y0 / 5) * 5; y <= b.y1; y += 5) { ctx.moveTo(b.x0, y); ctx.lineTo(b.x1, y); }
        ctx.stroke();
      }
      const after = o.steps ? drawItems(ctx, o.steps, o.step || 0, px) : null;
      drawGivens(ctx, els, { px, labels: o.labels, handles: false });
      if (after) after(o.labels);
    } finally { palette = saved; }
  }

  function drawThumb(canvas, els) {
    const { ctx, px } = setup(canvas);
    drawGivens(ctx, els, { px: px * 0.9 });
  }

  /* Hero: three drifting circles and every circle tangent to all three. */
  function hero(canvas, t) {
    const c = pal();
    const { ctx, px } = setup(canvas);
    const base = [
      { x: 24 + 3 * Math.sin(t * 0.31), y: 22 + 2 * Math.cos(t * 0.27), r: 8.5 },
      { x: 75 + 2.5 * Math.cos(t * 0.23), y: 25 + 2.5 * Math.sin(t * 0.35), r: 11 },
      { x: 48 + 3 * Math.sin(t * 0.19 + 1), y: 53 + 1.5 * Math.cos(t * 0.29), r: 7.5 }
    ];
    const sols = GEO.tangentCircles(base);
    sols.forEach((s, i) => {
      circle(ctx, s.x, s.y, s.r);
      stroke(ctx, i === 0 ? c.accent : c.pencil, (i === 0 ? 2 : 1) * px, i === 0 ? [] : [3 * px, 2.5 * px]);
    });
    base.forEach((b, i) => {
      circle(ctx, b.x, b.y, b.r); stroke(ctx, c.ink, 1.8 * px);
      dot(ctx, b.x, b.y, 1.8 * px, c.ink);
      label(ctx, "ω" + sub(i + 1), b.x + b.r * 0.75 + 0.6, b.y - b.r * 0.75 - 0.6, 4, c.soft, true);
    });
    return sols.length;
  }

  /* Hit test for dragging. Returns { i, part } or null. */
  function hit(els, x, y, tol) {
    let best = null, bd = tol;
    const consider = (i, part, d) => { if (d < bd) { bd = d; best = { i, part }; } };
    els.forEach((e, i) => {
      if (e.t === "P") consider(i, "p", GEO.dist(x, y, e.x, e.y));
      else if (e.t === "L") {
        consider(i, "a", GEO.dist(x, y, e.x1, e.y1) * 0.8);
        consider(i, "b", GEO.dist(x, y, e.x2, e.y2) * 0.8);
        const dx = e.x2 - e.x1, dy = e.y2 - e.y1, len = Math.hypot(dx, dy) || 1;
        consider(i, "line", Math.abs((x - e.x1) * dy - (y - e.y1) * dx) / len * 1.4);
      } else if (e.t === "C") {
        consider(i, "center", GEO.dist(x, y, e.x, e.y) * 0.8);
        consider(i, "rim", Math.abs(GEO.dist(x, y, e.x, e.y) - e.r));
      }
    });
    return best;
  }

  return { W, H, readPalette, drawScene, drawThumb, drawFigure, hero, hit, toWorld, visible, anchorView };
})();
