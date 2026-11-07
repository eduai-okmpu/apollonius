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

  /* Prepare a canvas for crisp drawing; returns a context in world units. */
  function setup(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(rect.width * dpr)), h = Math.max(1, Math.round(rect.width * 0.7 * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext("2d");
    const k = w / W;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    return { ctx, k, px: 1 / k * dpr }; // px: one CSS pixel in world units
  }

  const pal = () => palette || readPalette();

  function stroke(ctx, color, width, dash) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.stroke();
  }

  function line(ctx, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, E = 400;
    ctx.beginPath(); ctx.moveTo(x1 - ux * E, y1 - uy * E); ctx.lineTo(x2 + ux * E, y2 + uy * E);
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2); }
  function dot(ctx, x, y, r, color) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); }
  function label(ctx, text, x, y, size, color, italic) {
    ctx.font = `${italic ? "italic " : ""}500 ${size}px "Cormorant Garamond", Georgia, serif`;
    ctx.fillStyle = color; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText(text, x, y);
  }

  /* Draw the given elements. opts: { px, labels, active (index), handles } */
  function drawGivens(ctx, els, opts) {
    const c = pal(), px = opts.px;
    let np = 0, nl = 0, nc = 0;
    els.forEach((e, i) => {
      const hot = opts.active === i;
      const col = hot ? c.marker : c.ink;
      if (e.t === "L") {
        line(ctx, e.x1, e.y1, e.x2, e.y2); stroke(ctx, col, 1.6 * px);
        nl++;
        if (opts.handles) { dot(ctx, e.x1, e.y1, 3.2 * px, col); dot(ctx, e.x2, e.y2, 3.2 * px, col); }
        if (opts.labels) label(ctx, "l" + sub(nl), e.x2 + 1.2, e.y2 - 1.2, 3.6, c.soft, true);
      } else if (e.t === "C") {
        circle(ctx, e.x, e.y, e.r); stroke(ctx, col, 1.6 * px);
        nc++;
        if (opts.handles) { dot(ctx, e.x, e.y, 2.6 * px, col); dot(ctx, e.x + e.r, e.y, 3.2 * px, col); }
        if (opts.labels) label(ctx, "ω" + sub(nc), e.x + e.r * 0.72 + 0.8, e.y - e.r * 0.72 - 0.8, 3.6, c.soft, true);
      }
    });
    els.forEach((e, i) => {
      if (e.t !== "P") return;
      const hot = opts.active === i;
      dot(ctx, e.x, e.y, (opts.handles ? 4 : 3) * px, hot ? c.marker : c.ink);
      if (opts.labels) label(ctx, "ABC"[np] || "P", e.x + 1.6, e.y - 1.6, 4.4, hot ? c.marker : c.ink, true);
      np++;
    });
  }
  const sub = (n) => "₀₁₂₃₄₅₆₇₈₉"[n] || n;

  /* Construction drawings keyed by STEPS id. step: 0-based index of the current step. */
  const CONSTRUCTIONS = {
    ppp(ctx, els, step, px) {
      const c = pal();
      const [A, B, Cc] = els.filter((e) => e.t === "P");
      const tone = (s) => (s === step ? c.accent : c.pencil);
      const bis = (P1, P2, s) => {
        const b = GEO.bisector(P1, P2);
        ctx.beginPath(); ctx.moveTo(P1.x, P1.y); ctx.lineTo(P2.x, P2.y); stroke(ctx, tone(s), 1 * px);
        b.pts.forEach((q) => {
          [P1, P2].forEach((O) => {
            const ang = Math.atan2(q.y - O.y, q.x - O.x);
            ctx.beginPath(); ctx.arc(O.x, O.y, b.r, ang - 0.22, ang + 0.22); stroke(ctx, tone(s), 1 * px);
          });
        });
        if (b.pts.length === 2) { line(ctx, b.pts[0].x, b.pts[0].y, b.pts[1].x, b.pts[1].y); stroke(ctx, tone(s), 1 * px, [4 * px, 3 * px]); }
        return b.pts;
      };
      let b1, b2;
      if (step >= 1) b1 = bis(A, B, 1);
      if (step >= 2) b2 = bis(B, Cc, 2);
      if (step >= 3 && b1 && b2 && b1.length === 2 && b2.length === 2) {
        const O = GEO.lineLine(b1[0], b1[1], b2[0], b2[1]);
        if (O && Math.abs(O.x) < 1e4) {
          if (step >= 4) {
            circle(ctx, O.x, O.y, GEO.dist(O.x, O.y, A.x, A.y)); stroke(ctx, c.accent, 2.2 * px);
          }
          ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(A.x, A.y); stroke(ctx, step === 4 ? c.accent : c.pencil, 1 * px, [1.5 * px, 2.5 * px]);
          dot(ctx, O.x, O.y, 3.2 * px, c.accent);
          label(ctx, "O", O.x + 1.6, O.y + 4.4, 4.4, c.accent, true);
        }
      }
    }
  };

  function drawScene(canvas, els, o) {
    o = o || {};
    const { ctx, px } = setup(canvas);
    if (o.construction && CONSTRUCTIONS[o.construction]) CONSTRUCTIONS[o.construction](ctx, els, o.step || 0, px);
    drawGivens(ctx, els, { px, labels: o.labels, active: o.active, handles: o.handles });
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

  return { W, H, readPalette, drawScene, drawThumb, hero, hit };
})();
