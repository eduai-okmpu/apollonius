/* Plain geometry helpers in world coordinates. */
window.GEO = (function () {
  const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

  /* Two circle intersections, or [] when they do not meet. */
  function circleCircle(x1, y1, r1, x2, y2, r2) {
    const d = dist(x1, y1, x2, y2);
    if (d < 1e-9 || d > r1 + r2 || d < Math.abs(r1 - r2)) return [];
    const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
    const mx = x1 + (a * (x2 - x1)) / d, my = y1 + (a * (y2 - y1)) / d;
    const ox = (-(y2 - y1) * h) / d, oy = ((x2 - x1) * h) / d;
    return [{ x: mx + ox, y: my + oy }, { x: mx - ox, y: my - oy }];
  }

  /* Intersection of line p1p2 with line p3p4, or null when parallel. */
  function lineLine(p1, p2, p3, p4) {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d) < 1e-9) return null;
    const a = p1.x * p2.y - p1.y * p2.x, b = p3.x * p4.y - p3.y * p4.x;
    return { x: (a * (p3.x - p4.x) - (p1.x - p2.x) * b) / d, y: (a * (p3.y - p4.y) - (p1.y - p2.y) * b) / d };
  }

  /* Compass construction of the perpendicular bisector of AB.
     Returns the arc radius and the two arc crossings that define the bisector. */
  function bisector(A, B) {
    const d = dist(A.x, A.y, B.x, B.y);
    const r = d * 0.72;
    const pts = circleCircle(A.x, A.y, r, B.x, B.y, r);
    return { r, pts };
  }

  /* Circumcircle of three points (null when collinear). */
  function circumcircle(A, B, C) {
    const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
    if (Math.abs(d) < 1e-6) return null;
    const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
    const x = (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d;
    const y = (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d;
    return { x, y, r: dist(x, y, A.x, A.y) };
  }

  /* All circles tangent to three given circles (algebraic, used for the hero figure). */
  function tangentCircles(c) {
    const out = [];
    const [a, b, e] = c;
    for (let m = 0; m < 8; m++) {
      const s = [m & 1 ? -1 : 1, m & 2 ? -1 : 1, m & 4 ? -1 : 1];
      const row = (ci, si) => ({
        A: 2 * (ci.x - a.x),
        B: 2 * (ci.y - a.y),
        C: -2 * (si * ci.r - s[0] * a.r),
        D: (ci.x * ci.x + ci.y * ci.y - a.x * a.x - a.y * a.y) - (ci.r * ci.r - a.r * a.r)
      });
      const r2 = row(b, s[1]), r3 = row(e, s[2]);
      const det = r2.A * r3.B - r3.A * r2.B;
      if (Math.abs(det) < 1e-9) continue;
      const px = (r2.D * r3.B - r3.D * r2.B) / det, qx = (r2.C * r3.B - r3.C * r2.B) / det;
      const py = (r2.A * r3.D - r3.A * r2.D) / det, qy = (r2.A * r3.C - r3.A * r2.C) / det;
      const u = px - a.x, v = py - a.y;
      const k2 = qx * qx + qy * qy - 1;
      const k1 = 2 * (qx * u + qy * v - s[0] * a.r);
      const k0 = u * u + v * v - a.r * a.r;
      const roots = [];
      if (Math.abs(k2) < 1e-9) { if (Math.abs(k1) > 1e-9) roots.push(-k0 / k1); }
      else {
        const disc = k1 * k1 - 4 * k2 * k0;
        if (disc >= 0) { const sq = Math.sqrt(disc); roots.push((-k1 + sq) / (2 * k2), (-k1 - sq) / (2 * k2)); }
      }
      roots.forEach((r) => {
        if (r <= 1e-6) return;
        const x = px + qx * r, y = py + qy * r;
        if (!out.some((o) => Math.abs(o.x - x) + Math.abs(o.y - y) + Math.abs(o.r - r) < 1e-4)) out.push({ x, y, r });
      });
    }
    return out;
  }

  return { dist, circleCircle, lineLine, bisector, circumcircle, tangentCircles };
})();
