/* Compass-and-straightedge constructions for all ten Apollonius problems.
   CONSTRUCT.run(code, els) returns { steps, sols, caseId }.
   Each step: { t: {kz, en}, items: [...drawables], ref?: "PPL", none?: true }.
   Drawables: pt, line (infinite), seg, circ (helper), arc (compass mark), sol (answer). */
window.CONSTRUCT = (function () {
  const EPS = 0.6;   // "lies on" tolerance in world units
  const TOL = 0.06;  // tangency check tolerance
  const SUB = "₀₁₂₃₄₅₆₇₈₉";

  /* ---------- vectors and lines ---------- */
  const v = (x, y) => ({ x, y });
  const add = (a, b) => v(a.x + b.x, a.y + b.y);
  const sub = (a, b) => v(a.x - b.x, a.y - b.y);
  const mul = (a, k) => v(a.x * k, a.y * k);
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const cross = (a, b) => a.x * b.y - a.y * b.x;
  const len = (a) => Math.hypot(a.x, a.y);
  const dist = (a, b) => len(sub(a, b));
  const unit = (a) => { const l = len(a) || 1; return v(a.x / l, a.y / l); };
  const perp = (a) => v(-a.y, a.x);
  const mid = (a, b) => v((a.x + b.x) / 2, (a.y + b.y) / 2);

  const L2 = (a, b) => ({ p: a, d: unit(sub(b, a)) });
  const sd = (l, q) => cross(l.d, sub(q, l.p));                 // signed distance
  const proj = (l, q) => add(l.p, mul(l.d, dot(sub(q, l.p), l.d)));
  const reflect = (l, q) => sub(mul(proj(l, q), 2), q);
  const shift = (l, s) => ({ p: add(l.p, mul(perp(l.d), s)), d: l.d });
  const parallel = (l1, l2) => Math.abs(cross(l1.d, l2.d)) < 0.02;
  function meet(l1, l2) {
    const c = cross(l1.d, l2.d);
    if (Math.abs(c) < 1e-9) return null;
    return add(l1.p, mul(l1.d, cross(sub(l2.p, l1.p), l2.d) / c));
  }
  function lineCircle(l, c, r) {
    const f = proj(l, c), s = dist(f, c), h2 = r * r - s * s;
    if (h2 < -1e-6) return [];
    const h = Math.sqrt(Math.max(0, h2));
    if (h < 1e-4) return [f];
    return [add(f, mul(l.d, h)), add(f, mul(l.d, -h))];
  }
  const cc = (a, ra, b, rb) => GEO.circleCircle(a.x, a.y, ra, b.x, b.y, rb);
  function tangentPoints(M, o, r) {
    const d = dist(M, o);
    if (d <= r + 1e-9) return [];
    return cc(mid(M, o), d / 2, o, r);
  }
  const circum = (a, b, c) => GEO.circumcircle(a, b, c);

  /* ---------- drawables ---------- */
  const I = {
    pt: (p, label) => ({ k: "pt", p, label }),
    line: (a, b) => ({ k: "line", a, b }),
    ln: (l) => ({ k: "line", a: l.p, b: add(l.p, l.d) }),
    seg: (a, b) => ({ k: "seg", a, b }),
    circ: (c, r) => ({ k: "circ", c, r }),
    arc: (c, r, at) => ({ k: "arc", c, r, at }),
    sol: (c, r) => ({ k: "sol", c, r })
  };
  const T = (kz, en) => ({ kz, en });

  /* ---------- recorders ---------- */
  class Rec {
    constructor() { this.steps = []; }
    step(t, items, extra) { this.steps.push(Object.assign({ t, items: items || [] }, extra || {})); }
  }
  /* Collects a sub-construction into one step: no labels, answers become helper circles. */
  class Merge {
    constructor() { this.items = []; }
    step(t, items) {
      (items || []).forEach((it) => {
        const c = Object.assign({}, it);
        if (c.k === "pt") c.label = null;
        if (c.k === "sol") c.k = "circ";
        if (c.k !== "arc") this.items.push(c);
      });
    }
  }
  const SILENT = { step() {} };

  /* ---------- compass building blocks ---------- */
  function bisector(A, B) {
    const d = dist(A, B), r = d * 0.72;
    const line = { p: mid(A, B), d: unit(perp(sub(B, A))) };
    const items = [];
    cc(A, r, B, r).forEach((q) => items.push(I.arc(A, r, q), I.arc(B, r, q)));
    items.push(I.ln(line));
    return { line, items };
  }
  function perpThrough(q, l) {
    const s = Math.abs(sd(l, q)), R = s < EPS ? 7 : s + 6;
    const f = proj(l, q), h = Math.sqrt(Math.max(0, R * R - s * s));
    const U = add(f, mul(l.d, h)), W = add(f, mul(l.d, -h));
    const b = bisector(U, W);
    return { line: { p: q, d: perp(l.d) }, foot: f, items: [I.arc(q, R, U), I.arc(q, R, W)].concat(b.items) };
  }
  function angleBis(V, d1, d2, u) {
    const R = 9;
    const a = mul(d1, Math.sign(dot(d1, u)) || 1), b = mul(d2, Math.sign(dot(d2, u)) || 1);
    const X = add(V, mul(a, R)), Y = add(V, mul(b, R)), Z = sub(add(X, Y), V);
    return { line: { p: V, d: u }, items: [I.arc(V, R, X), I.arc(V, R, Y), I.arc(X, R, Z), I.arc(Y, R, Z), I.line(V, Z)] };
  }
  const circleOut = (c, r) => ({ x: c.x, y: c.y, r });

  /* ---------- verification ---------- */
  function fits(Q, rho, els) {
    const tol = TOL + 2e-5 * rho;
    if (!(rho > 0.05) || rho > 1e5) return false;
    return els.every((e) => {
      if (e.t === "P") return Math.abs(dist(Q, e.p) - rho) < tol;
      if (e.t === "L") return Math.abs(Math.abs(sd(e.l, Q)) - rho) < tol;
      const d = dist(Q, e.o);
      if (d < tol && Math.abs(rho - e.r) < tol) return false; // the given circle itself
      return Math.abs(d - (rho + e.r)) < tol || Math.abs(d - Math.abs(rho - e.r)) < tol;
    });
  }
  function radiiFor(Q, e) {
    if (e.t === "P") return [dist(Q, e.p)];
    if (e.t === "L") return [Math.abs(sd(e.l, Q))];
    const d = dist(Q, e.o);
    return [d + e.r, Math.abs(d - e.r)];
  }
  function dedupe(list) {
    const out = [];
    list.forEach((s) => {
      if (!out.some((o) => Math.abs(o.x - s.x) + Math.abs(o.y - s.y) + Math.abs(o.r - s.r) < 0.05 + 1e-4 * s.r)) out.push(s);
    });
    return out;
  }
  /* Answers whose centres are given, with radii chosen to fit all elements. */
  function fromCentres(centres, els) {
    const out = [];
    centres.forEach((Q) => radiiFor(Q, els[0]).forEach((rho) => { if (fits(Q, rho, els)) out.push(circleOut(Q, rho)); }));
    return dedupe(out);
  }

  const D = { A: "A", B: "B", C: "C", P: "P", l: "l", l1: "l₁", l2: "l₂", l3: "l₃", w: "ω", O: "O",
    w1: "ω₁", w2: "ω₂", w3: "ω₃", O1: "O₁", O2: "O₂", O3: "O₃" };
  const none = (R, t) => { R.step(t, [], { none: true }); return []; };
  const qLabel = (i, n) => (n === 1 ? "Q" : "Q" + SUB[i + 1]);

  /* =====================  PPP  ===================== */
  function ppp(A, B, C, R, n) {
    n = n || D;
    const b1 = bisector(A, B), b2 = bisector(B, C);
    R.step(T(`${n.A}${n.B} кесіндісінің орта перпендикулярын салыңыз. Циркульді ${n.A}${n.B} кесіндісінің жартысынан үлкен етіп ашып, ${n.A} және ${n.B} нүктелерінен доғалар сызыңыз, доғалардың қиылысу нүктелерін сызғышпен қосыңыз.`,
      `Draw the perpendicular bisector of ${n.A}${n.B}. Open the compass wider than half of ${n.A}${n.B}, draw arcs from ${n.A} and from ${n.B}, and join the two crossings with the straightedge.`), b1.items);
    R.step(T(`Дәл осылай ${n.B}${n.C} кесіндісінің орта перпендикулярын салыңыз.`,
      `Do the same for ${n.B}${n.C} to get its perpendicular bisector.`), b2.items);
    const collinear = Math.abs(sd(L2(A, B), C)) < EPS * 0.5 || dist(A, B) < EPS || dist(B, C) < EPS;
    const O = collinear ? null : meet(b1.line, b2.line);
    if (!O) return none(R, T(`Перпендикулярлар параллель, өйткені ${n.A}, ${n.B}, ${n.C} нүктелері бір түзуде жатыр. Олар қиылыспайды, сондықтан шешім жоқ.`,
      `The bisectors are parallel because ${n.A}, ${n.B}, ${n.C} lie on one line. They never meet, so there is no solution.`));
    R.step(T(`Перпендикулярлар O нүктесінде қиылысады. O нүктесі ${n.A}, ${n.B}, ${n.C} нүктелерінен бірдей қашықтықта жатыр.`,
      `The bisectors meet at O, which is equally far from ${n.A}, ${n.B} and ${n.C}.`), [I.pt(O, "O")]);
    const r = dist(O, A);
    R.step(T(`Циркуль ұшын O нүктесіне қойып, оны ${n.A} нүктесіне дейін ашыңыз да, шеңбер сызыңыз. Ол үш нүктенің бәрі арқылы өтеді.`,
      `Put the compass point on O, open it to ${n.A} and draw the circle. It passes through all three points.`), [I.seg(O, A), I.sol(O, r)]);
    return [circleOut(O, r)];
  }

  /* =====================  PPL  ===================== */
  function ppl(A, B, l, R, n) {
    n = n || D;
    if (dist(A, B) < EPS) return none(R, T("Екі нүкте беттесіп тұр. Оларды бір-бірінен алшақтатыңыз.", "The two points coincide. Move them apart."));
    const sA = sd(l, A), sB = sd(l, B), onA = Math.abs(sA) < EPS, onB = Math.abs(sB) < EPS;
    if (onA && onB) return none(R, T(`${n.A} және ${n.B} нүктелерінің екеуі де ${n.l} түзуінде жатыр. Түзуді жанайтын шеңбердің онымен бір ғана ортақ нүктесі болады, сондықтан шешім жоқ.`,
      `Both ${n.A} and ${n.B} lie on ${n.l}. A circle touching a line shares only one point with it, so there is no solution.`));
    if (!onA && !onB && sA * sB < 0) return none(R, T(`${n.A} және ${n.B} нүктелері ${n.l} түзуінің екі жағында жатыр. Олар арқылы өтетін кез келген шеңбер ${n.l} түзуін қиып өтеді, жанай алмайды. Шешім жоқ.`,
      `${n.A} and ${n.B} lie on opposite sides of ${n.l}. Every circle through them crosses ${n.l} instead of touching it. No solution.`));
    const bis = bisector(A, B);

    if (onA || onB) {
      const Q = onA ? A : B, nQ = onA ? n.A : n.B;
      const pq = perpThrough(Q, l);
      R.step(T(`${nQ} нүктесі ${n.l} түзуінде жатыр, демек шеңбер ${n.l} түзуін дәл осы нүктеде жанайды. ${nQ} нүктесі арқылы ${n.l} түзуіне перпендикуляр тұрғызыңыз: центр осы перпендикулярда жатады.`,
        `${nQ} lies on ${n.l}, so the circle touches ${n.l} exactly at ${nQ}. Draw the perpendicular to ${n.l} at ${nQ}: the centre lies on it.`), pq.items);
      R.step(T(`${n.A}${n.B} кесіндісінің орта перпендикулярын салыңыз: центр осы түзуде де жатады.`,
        `Draw the perpendicular bisector of ${n.A}${n.B}: the centre lies on it too.`), bis.items);
      const O = meet(pq.line, bis.line);
      if (!O) return none(R, T("Түзулер қиылыспайды. Шешім жоқ.", "The lines do not meet. No solution."));
      const r = dist(O, Q);
      R.step(T(`Екі түзу Q нүктесінде қиылысады. Центрі Q, радиусы Q${nQ} болатын шеңбер сызыңыз.`,
        `The two lines meet at Q. Draw the circle with centre Q and radius Q${nQ}.`), [I.pt(O, "Q"), I.sol(O, r)]);
      return [circleOut(O, r)];
    }

    if (Math.abs(sA - sB) < EPS * 0.5) {
      const T0 = meet(bis.line, l);
      R.step(T(`${n.A}${n.B} кесіндісі ${n.l} түзуіне параллель. ${n.A}${n.B} кесіндісінің орта перпендикулярын салыңыз. Ол ${n.l} түзуін T нүктесінде қияды: симметрия бойынша шеңбер ${n.l} түзуін осы нүктеде жанайды.`,
        `${n.A}${n.B} is parallel to ${n.l}. Draw the perpendicular bisector of ${n.A}${n.B}. It meets ${n.l} at T, and by symmetry the circle touches ${n.l} at T.`), bis.items.concat([I.pt(T0, "T")]));
      const b2 = bisector(A, T0), O = meet(bis.line, b2.line);
      R.step(T(`${n.A}T кесіндісінің орта перпендикулярын салыңыз. Ол алдыңғы перпендикулярды Q нүктесінде қияды.`,
        `Draw the perpendicular bisector of ${n.A}T. It meets the first bisector at Q.`), b2.items.concat([I.pt(O, "Q")]));
      const r = dist(O, T0);
      R.step(T("Центрі Q, радиусы QT болатын шеңбер сызыңыз. Бір шешім.", "Draw the circle with centre Q and radius QT. One solution."), [I.seg(O, T0), I.sol(O, r)]);
      return [circleOut(O, r)];
    }

    const M = meet(L2(A, B), l);
    R.step(T(`${n.A}${n.B} түзуін жүргізіңіз. Ол ${n.l} түзуін M нүктесінде қияды.`, `Draw line ${n.A}${n.B}. It meets ${n.l} at M.`),
      [I.line(A, B), I.pt(M, "M")]);
    const K = mid(A, B), rk = dist(A, B) / 2;
    R.step(T(`${n.A}${n.B} кесіндісінің орта перпендикулярымен оның ортасы K нүктесін табыңыз. Диаметрі ${n.A}${n.B} болатын шеңбер сызыңыз.`,
      `Use the perpendicular bisector of ${n.A}${n.B} to find its midpoint K. Draw the circle with diameter ${n.A}${n.B}.`), bis.items.concat([I.pt(K, "K"), I.circ(K, rk)]));
    const tp = tangentPoints(M, K, rk)[0];
    if (!tp) return none(R, T("Жанама жүргізу мүмкін емес. Шешім жоқ.", "No tangent can be drawn. No solution."));
    R.step(T(`M нүктесінен осы шеңберге жанама жүргізіңіз: MK кесіндісін диаметр етіп шеңбер сызыңыз, ол алдыңғы шеңберді T нүктесінде қияды. Сонда MT² = M${n.A}·M${n.B}.`,
      `Draw a tangent from M to this circle: draw the circle with diameter MK. It crosses the first circle at T, and MT² = M${n.A}·M${n.B}.`),
      [I.circ(mid(M, K), dist(M, K) / 2), I.pt(tp, "T"), I.seg(M, tp)]);
    const t = dist(M, tp), T1 = add(M, mul(l.d, t)), T2 = add(M, mul(l.d, -t));
    R.step(T(`Циркульді MT кесіндісіне тең етіп ашып, M нүктесінен ${n.l} түзуінде T₁ және T₂ нүктелерін белгілеңіз. Ізделінді шеңберлер ${n.l} түзуін осы нүктелерде жанайды.`,
      `Open the compass to MT and, from M, mark T₁ and T₂ on ${n.l}. The answer circles touch ${n.l} at these points.`),
      [I.arc(M, t, T1), I.arc(M, t, T2), I.pt(T1, "T₁"), I.pt(T2, "T₂")]);
    const p1 = perpThrough(T1, l), p2 = perpThrough(T2, l);
    const Q1 = meet(p1.line, bis.line), Q2 = meet(p2.line, bis.line);
    R.step(T(`T₁ және T₂ нүктелерінде ${n.l} түзуіне перпендикулярлар тұрғызыңыз. Олар ${n.A}${n.B} кесіндісінің орта перпендикулярын Q₁ және Q₂ нүктелерінде қияды.`,
      `Draw perpendiculars to ${n.l} at T₁ and T₂. They meet the perpendicular bisector of ${n.A}${n.B} at Q₁ and Q₂.`),
      p1.items.concat(p2.items, [I.pt(Q1, "Q₁"), I.pt(Q2, "Q₂")]));
    const sols = [circleOut(Q1, dist(Q1, T1)), circleOut(Q2, dist(Q2, T2))];
    R.step(T(`Центрлері Q₁ және Q₂, ${n.A} нүктесі арқылы өтетін шеңберлерді сызыңыз. Екі шешім.`,
      `Draw the circles with centres Q₁ and Q₂ through ${n.A}. Two solutions.`), sols.map((s) => I.sol(s, s.r)));
    return sols;
  }

  /* =====================  PPC  ===================== */
  function ppc(A, B, c, R, n) {
    n = n || D;
    const els = [{ t: "P", p: A }, { t: "P", p: B }, { t: "C", o: c.o, r: c.r }];
    if (dist(A, B) < EPS) return none(R, T("Екі нүкте беттесіп тұр. Оларды бір-бірінен алшақтатыңыз.", "The two points coincide. Move them apart."));
    const pA = dist(A, c.o) - c.r, pB = dist(B, c.o) - c.r, onA = Math.abs(pA) < EPS, onB = Math.abs(pB) < EPS;
    if (onA && onB) return none(R, T(`${n.A} және ${n.B} нүктелерінің екеуі де ${n.w} шеңберінде жатыр. Олар арқылы өтетін және ${n.w} шеңберін жанайтын басқа шеңбер жоқ.`,
      `Both ${n.A} and ${n.B} lie on ${n.w}. No other circle through them can touch ${n.w}.`));
    if (!onA && !onB && pA * pB < 0) return none(R, T(`${n.A} және ${n.B} нүктелерінің бірі ${n.w} шеңберінің ішінде, екіншісі сыртында. Олар арқылы өтетін кез келген шеңбер ${n.w} шеңберін қиып өтеді. Шешім жоқ.`,
      `One of ${n.A}, ${n.B} is inside ${n.w} and the other is outside. Every circle through them crosses ${n.w}. No solution.`));
    const bis = bisector(A, B);

    if (onA || onB) {
      const Q = onA ? A : B, nQ = onA ? n.A : n.B;
      R.step(T(`${nQ} нүктесі ${n.w} шеңберінде жатыр, демек ізделінді шеңбер ${n.w} шеңберін осы нүктеде жанайды. Сондықтан оның центрі ${n.O}${nQ} түзуінде жатады. Осы түзуді жүргізіңіз.`,
        `${nQ} lies on ${n.w}, so the answer circle touches ${n.w} exactly at ${nQ}. Its centre is on line ${n.O}${nQ}. Draw this line.`), [I.line(c.o, Q)]);
      R.step(T(`${n.A}${n.B} кесіндісінің орта перпендикулярын салыңыз: центр осы түзуде де жатады.`,
        `Draw the perpendicular bisector of ${n.A}${n.B}: the centre lies on it too.`), bis.items);
      const O = meet(L2(c.o, Q), bis.line);
      if (!O) return none(R, T("Түзулер қиылыспайды. Шешім жоқ.", "The lines do not meet. No solution."));
      const r = dist(O, Q);
      R.step(T(`Екі түзу Q нүктесінде қиылысады. Центрі Q, радиусы Q${nQ} болатын шеңбер сызыңыз.`,
        `The two lines meet at Q. Draw the circle with centre Q and radius Q${nQ}.`), [I.pt(O, "Q"), I.sol(O, r)]);
      return fits(O, r, els) ? [circleOut(O, r)] : [];
    }

    if (Math.abs(sd(bis.line, c.o)) < 0.3) {
      const Ts = lineCircle(bis.line, c.o, c.r);
      R.step(T(`${n.A}${n.B} кесіндісінің орта перпендикулярын салыңыз. ${n.O} центрі осы түзуде жатыр, сондықтан симметрия бойынша ізделінді шеңберлер ${n.w} шеңберін перпендикуляр мен шеңбердің қиылысу нүктелерінде (T₁, T₂) жанайды.`,
        `Draw the perpendicular bisector of ${n.A}${n.B}. The centre ${n.O} lies on it, so by symmetry the answer circles touch ${n.w} where the bisector meets it (T₁, T₂).`),
        bis.items.concat(Ts.map((p, i) => I.pt(p, "T" + SUB[i + 1]))));
      const sols = [], items = [];
      Ts.forEach((Tp, i) => {
        const b2 = bisector(A, Tp), Q = meet(b2.line, bis.line);
        if (!Q) return;
        const r = dist(Q, Tp);
        items.push(...b2.items, I.pt(Q, "Q" + SUB[i + 1]), I.sol(Q, r));
        if (fits(Q, r, els)) sols.push(circleOut(Q, r));
      });
      R.step(T(`${n.A}T₁ және ${n.A}T₂ кесінділерінің орта перпендикулярлары центрлерді (Q₁, Q₂) береді. Шеңберлерді сызыңыз.`,
        `The perpendicular bisectors of ${n.A}T₁ and ${n.A}T₂ give the centres Q₁, Q₂. Draw the circles.`), items);
      return sols;
    }

    // helper circle through A, B crossing ω, with a clear radical centre M
    const K = mid(A, B), ab = L2(A, B);
    let best = null;
    for (let t = -60; t <= 60; t += 2) {
      const Q = add(K, mul(bis.line.d, t)), r0 = dist(Q, A);
      const xs = cc(Q, r0, c.o, c.r);
      if (xs.length < 2) continue;
      const M = meet(L2(xs[0], xs[1]), ab);
      if (!M || dist(M, K) > 1e5) continue;
      const score = Math.min(dist(xs[0], xs[1]), 25) - 0.15 * r0 - 0.02 * Math.min(dist(M, K), 2000);
      if (!best || score > best.score) best = { score, Q, r0, xs, M };
    }
    if (!best) return none(R, T("Көмекші шеңбер табылмады.", "No helper circle could be found."));
    R.step(T(`${n.A} және ${n.B} нүктелері арқылы өтетін, ${n.w} шеңберін қиятын кез келген көмекші шеңбер сызыңыз. Оның центрі ${n.A}${n.B} кесіндісінің орта перпендикулярында жатады.`,
      `Draw any helper circle through ${n.A} and ${n.B} that crosses ${n.w}. Its centre lies on the perpendicular bisector of ${n.A}${n.B}.`),
      bis.items.concat([I.circ(best.Q, best.r0)]));
    const M = best.M;
    R.step(T(`Көмекші шеңбер мен ${n.w} шеңберінің ортақ хордасын және ${n.A}${n.B} түзуін жүргізіңіз. Олар M нүктесінде қиылысады. M нүктесінің ${n.w} шеңберіне және ${n.A}, ${n.B} арқылы өтетін кез келген шеңберге қатысты дәрежесі бірдей: M${n.A}·M${n.B} = MT².`,
      `Draw the common chord of the helper circle and ${n.w}, and line ${n.A}${n.B}. They meet at M. M has the same power with respect to ${n.w} and to every circle through ${n.A} and ${n.B}: M${n.A}·M${n.B} = MT².`),
      [I.line(best.xs[0], best.xs[1]), I.line(A, B), I.pt(M, "M")]);
    const Ts = tangentPoints(M, c.o, c.r);
    R.step(T(`M нүктесінен ${n.w} шеңберіне жанамалар жүргізіңіз: M${n.O} кесіндісін диаметр етіп шеңбер сызыңыз. Ол ${n.w} шеңберін T₁ және T₂ жанасу нүктелерінде қияды.`,
      `Draw the tangents from M to ${n.w}: draw the circle with diameter M${n.O}. It meets ${n.w} at the tangent points T₁ and T₂.`),
      [I.circ(mid(M, c.o), dist(M, c.o) / 2)].concat(Ts.map((p, i) => I.pt(p, "T" + SUB[i + 1])), Ts.map((p) => I.seg(M, p))));
    const Qs = Ts.map((p) => meet(L2(c.o, p), bis.line));
    R.step(T(`${n.O}T₁ және ${n.O}T₂ түзулерін жүргізіңіз. Олар ${n.A}${n.B} кесіндісінің орта перпендикулярын Q₁ және Q₂ нүктелерінде қияды.`,
      `Draw lines ${n.O}T₁ and ${n.O}T₂. They meet the perpendicular bisector of ${n.A}${n.B} at Q₁ and Q₂.`),
      Ts.map((p) => I.line(c.o, p)).concat(Qs.filter(Boolean).map((q, i) => I.pt(q, "Q" + SUB[i + 1]))));
    const sols = Qs.filter(Boolean).map((q) => circleOut(q, dist(q, A))).filter((s) => fits(s, s.r, els));
    R.step(T(`Центрлері Q₁ және Q₂, ${n.A} нүктесі арқылы өтетін шеңберлерді сызыңыз.`,
      `Draw the circles with centres Q₁ and Q₂ through ${n.A}.`), sols.map((s) => I.sol(s, s.r)));
    return sols;
  }

  /* =====================  PLL  ===================== */
  function pll(P, l1, l2, R, n) {
    n = n || D;
    if (parallel(l1, l2)) {
      const dd = sd(l1, l2.p), s1 = sd(l1, P), k = s1 / dd, e = EPS / Math.abs(dd || 1);
      if (Math.abs(dd) < EPS) return none(R, T("Түзулер беттесіп тұр.", "The lines coincide."));
      if (k < -e || k > 1 + e) return none(R, T(`${n.l1} және ${n.l2} түзулері параллель, ал ${n.P} нүктесі олардың арасындағы жолақтан тыс жатыр. Екі түзуді де жанайтын шеңбер толығымен жолақтың ішінде болады. Шешім жоқ.`,
        `${n.l1} and ${n.l2} are parallel and ${n.P} is outside the strip between them. A circle touching both lines stays inside the strip. No solution.`));
      const pq = perpThrough(P, l1), U = proj(l1, P), V = proj(l2, P), m = shift(l1, dd / 2), rho = Math.abs(dd) / 2;
      const b = bisector(U, V);
      R.step(T(`${n.l1} және ${n.l2} түзулері параллель. ${n.P} арқылы оларға перпендикуляр жүргізіп, U және V нүктелерін белгілеңіз. UV кесіндісінің орта перпендикуляры m түзуі: центрлер осы түзуде жатады, ал радиус UV/2-ге тең.`,
        `${n.l1} and ${n.l2} are parallel. Draw the perpendicular to them through ${n.P}, meeting them at U and V. The perpendicular bisector m of UV holds the centres, and the radius is UV/2.`),
        pq.items.concat(b.items, [I.pt(U, "U"), I.pt(V, "V")]));
      const Qs = lineCircle(m, P, rho);
      R.step(T(`Циркульді UV/2 шамасына ашып, ${n.P} нүктесінен m түзуінде центрлерді белгілеңіз.`,
        `Open the compass to UV/2 and, from ${n.P}, mark the centres on m.`),
        Qs.map((q) => I.arc(P, rho, q)).concat(Qs.map((q, i) => I.pt(q, qLabel(i, Qs.length)))));
      const sols = Qs.map((q) => circleOut(q, rho));
      R.step(T("Табылған центрлерден радиусы UV/2 шеңберлер сызыңыз.", "Draw circles of radius UV/2 around these centres."), sols.map((s) => I.sol(s, s.r)));
      return sols;
    }
    const V = meet(l1, l2), s1 = sd(l1, P), s2 = sd(l2, P);
    if (dist(P, V) < EPS) return none(R, T(`${n.P} нүктесі түзулердің қиылысу нүктесінде жатыр. Шешім жоқ.`, `${n.P} is at the crossing point of the lines. No solution.`));
    const u1 = unit(add(l1.d, l2.d)), u2 = unit(sub(l1.d, l2.d));
    if (Math.abs(s1) < EPS || Math.abs(s2) < EPS) {
      const lo = Math.abs(s1) < EPS ? l1 : l2, nlo = Math.abs(s1) < EPS ? n.l1 : n.l2;
      const pq = perpThrough(P, lo);
      R.step(T(`${n.P} нүктесі ${nlo} түзуінде жатыр, демек шеңбер ${nlo} түзуін осы нүктеде жанайды. ${n.P} арқылы ${nlo} түзуіне перпендикуляр тұрғызыңыз.`,
        `${n.P} lies on ${nlo}, so the circle touches ${nlo} at ${n.P}. Draw the perpendicular to ${nlo} at ${n.P}.`), pq.items);
      const a1 = angleBis(V, l1.d, l2.d, u1), a2 = angleBis(V, l1.d, l2.d, u2);
      R.step(T("Түзулердің қиылысу нүктесі V-дағы екі бұрыштың биссектрисаларын салыңыз (олар өзара перпендикуляр). Центр биссектрисалардың бірінде жатады.",
        "Draw the bisectors of both angles at the crossing point V (they are perpendicular). The centre lies on one of them."),
        a1.items.concat(a2.items, [I.pt(V, "V")]));
      const Qs = [meet(pq.line, a1.line), meet(pq.line, a2.line)].filter(Boolean);
      const sols = Qs.map((q) => circleOut(q, dist(q, P)));
      R.step(T(`Перпендикуляр биссектрисаларды Q₁ және Q₂ нүктелерінде қияды. Центрлері Q₁, Q₂, ${n.P} арқылы өтетін шеңберлерді сызыңыз.`,
        `The perpendicular meets the bisectors at Q₁ and Q₂. Draw the circles with centres Q₁, Q₂ through ${n.P}.`),
        Qs.map((q, i) => I.pt(q, "Q" + SUB[i + 1])).concat(sols.map((s) => I.sol(s, s.r))));
      return sols;
    }
    // bisector of the angle that contains P
    let u = null;
    [u1, mul(u1, -1), u2, mul(u2, -1)].forEach((c) => {
      const q = add(V, c);
      if (!u && Math.sign(sd(l1, q)) === Math.sign(s1) && Math.sign(sd(l2, q)) === Math.sign(s2)) u = c;
    });
    const ab = angleBis(V, l1.d, l2.d, u);
    R.step(T(`${n.l1} және ${n.l2} түзулері V нүктесінде қиылысады. ${n.P} жатқан бұрыштың b биссектрисасын салыңыз: V нүктесінен екі түзуге бірдей кесінді өлшеп, олардың ұштарынан бірдей доғалар сызыңыз.`,
      `${n.l1} and ${n.l2} meet at V. Draw the bisector b of the angle that contains ${n.P}: from V mark equal lengths on both lines, then draw equal arcs from those marks.`),
      ab.items.concat([I.pt(V, "V")]));
    const Pp = proj(ab.line, P);
    const Z = dot(sub(Pp, V), u) > 3 ? Pp : add(V, mul(u, 12));
    const Fz = proj(l1, Z), rz = dist(Z, Fz);
    R.step(T(`b биссектрисасынан кез келген Z нүктесін алып, одан ${n.l1} түзуіне перпендикуляр түсіріңіз. Центрі Z, радиусы осы перпендикулярға тең көмекші шеңбер сызыңыз: ол екі түзуді де жанайды.`,
      `Pick any point Z on b and drop the perpendicular from Z to ${n.l1}. Draw the helper circle with centre Z and that radius: it touches both lines.`),
      [I.pt(Z, "Z"), I.seg(Z, Fz), I.circ(Z, rz)]);
    const Xs = lineCircle(L2(V, P), Z, rz);
    R.step(T(`V${n.P} түзуін жүргізіңіз. Ол көмекші шеңберді X₁ және X₂ нүктелерінде қияды.`,
      `Draw line V${n.P}. It meets the helper circle at X₁ and X₂.`),
      [I.line(V, P)].concat(Xs.map((x, i) => I.pt(x, "X" + SUB[i + 1]))));
    const Qs = Xs.map((x) => add(V, mul(sub(Z, V), dist(V, P) / dist(V, x))));
    const its = [];
    Xs.forEach((x, i) => { its.push(I.seg(Z, x)); if (dist(Qs[i], P) > EPS) its.push(I.line(P, add(P, sub(Z, x)))); its.push(I.pt(Qs[i], "Q" + SUB[i + 1])); });
    R.step(T(`${n.P} нүктесі арқылы ZX₁ және ZX₂ кесінділеріне параллель түзулер жүргізіңіз. Олар b биссектрисасын Q₁ және Q₂ нүктелерінде қияды. Бұл V центрлі гомотетия: көмекші шеңбер ізделінді шеңберге өтеді.`,
      `Through ${n.P} draw lines parallel to ZX₁ and ZX₂. They meet b at Q₁ and Q₂. This is a homothety with centre V that carries the helper circle onto the answer circles.`), its);
    const sols = Qs.map((q) => circleOut(q, dist(q, P)));
    R.step(T(`Центрлері Q₁ және Q₂, ${n.P} нүктесі арқылы өтетін шеңберлерді сызыңыз. Олар ${n.l1} және ${n.l2} түзулерін жанайды.`,
      `Draw the circles with centres Q₁ and Q₂ through ${n.P}. They touch ${n.l1} and ${n.l2}.`), sols.map((x) => I.sol(x, x.r)));
    return sols;
  }

  /* =====================  LLL  ===================== */
  function lll(l1, l2, l3, R, n) {
    n = n || D;
    const p12 = parallel(l1, l2), p23 = parallel(l2, l3), p13 = parallel(l1, l3);
    if (p12 && p23) return none(R, T("Үш түзу де параллель. Үшеуін бірдей жанайтын шеңбер жоқ.", "All three lines are parallel. No circle touches all three."));
    if (p12 || p23 || p13) {
      const [la, lb, lt, na, nb, nt] = p12 ? [l1, l2, l3, n.l1, n.l2, n.l3] : p23 ? [l2, l3, l1, n.l2, n.l3, n.l1] : [l1, l3, l2, n.l1, n.l3, n.l2];
      const dd = sd(la, lb.p);
      if (Math.abs(dd) < EPS) return none(R, T("Екі түзу беттесіп тұр.", "Two lines coincide."));
      const V = meet(lt, la), U = proj(lb, V), m = shift(la, dd / 2), b = bisector(V, U);
      R.step(T(`${na} және ${nb} түзулері параллель. Олардың арасындағы перпендикуляр кесіндінің орта перпендикулярымен m орта сызығын салыңыз. Центрлер осы сызықта жатады, ал радиус түзулер арасындағы қашықтықтың жартысына тең.`,
        `${na} and ${nb} are parallel. Use the perpendicular bisector of a segment across the strip to draw the midline m. The centres lie on m, and the radius is half the width of the strip.`),
        [I.seg(V, U)].concat(b.items));
      const a1 = angleBis(V, la.d, lt.d, unit(add(la.d, lt.d))), a2 = angleBis(V, la.d, lt.d, unit(sub(la.d, lt.d)));
      R.step(T(`${nt} түзуі ${na} түзуін V нүктесінде қияды. V нүктесіндегі екі бұрыштың биссектрисаларын салыңыз.`,
        `${nt} meets ${na} at V. Draw the bisectors of both angles at V.`), a1.items.concat(a2.items, [I.pt(V, "V")]));
      const Qs = [meet(a1.line, m), meet(a2.line, m)].filter(Boolean), rho = Math.abs(dd) / 2;
      const sols = Qs.map((q) => circleOut(q, rho));
      R.step(T("Биссектрисалар m түзуін Q₁ және Q₂ нүктелерінде қияды. Осы центрлерден радиусы жолақ енінің жартысына тең шеңберлер сызыңыз.",
        "The bisectors meet m at Q₁ and Q₂. Draw circles around them with radius equal to half the width of the strip."),
        Qs.map((q, i) => I.pt(q, "Q" + SUB[i + 1])).concat(sols.map((s) => I.sol(s, s.r))));
      return sols;
    }
    const A = meet(l1, l2), B = meet(l2, l3), C = meet(l3, l1);
    if (Math.abs(sd(l3, A)) < EPS) return none(R, T("Үш түзу бір нүктеде қиылысады. Олардың үшеуінен бірдей қашықтықта тек сол нүкте жатыр, сондықтан шешім жоқ.",
      "The three lines pass through one point. Only that point is equally far from all three, so there is no solution."));
    R.step(T("Түзулер ABC үшбұрышын құрайды. Оның төбелерін белгілеңіз.", "The lines form triangle ABC. Mark its vertices."),
      [I.pt(A, "A"), I.pt(B, "B"), I.pt(C, "C")]);
    const bA = [angleBis(A, l1.d, l2.d, unit(add(l1.d, l2.d))), angleBis(A, l1.d, l2.d, unit(sub(l1.d, l2.d)))];
    const bB = [angleBis(B, l2.d, l3.d, unit(add(l2.d, l3.d))), angleBis(B, l2.d, l3.d, unit(sub(l2.d, l3.d)))];
    R.step(T("A төбесінде ішкі және сыртқы биссектрисаларды салыңыз (олар өзара перпендикуляр).",
      "At vertex A draw the inner and outer angle bisectors (they are perpendicular)."), bA[0].items.concat(bA[1].items));
    R.step(T("Дәл осылай B төбесінде екі биссектрисаны салыңыз.", "Do the same at vertex B."), bB[0].items.concat(bB[1].items));
    const Qs = [];
    bA.forEach((x) => bB.forEach((y) => { const q = meet(x.line, y.line); if (q) Qs.push(q); }));
    const sols = dedupe(Qs.map((q) => circleOut(q, Math.abs(sd(l1, q))))).sort((a, b) => a.r - b.r);
    R.step(T("Биссектрисалар төрт нүктеде қиылысады: Q₁ (іштей сызылған шеңбердің центрі) және Q₂, Q₃, Q₄ (сырттай сызылған шеңберлердің центрлері). Әрқайсысы үш түзуден бірдей қашықтықта.",
      "The bisectors meet at four points: Q₁, the centre of the incircle, and Q₂, Q₃, Q₄, the centres of the excircles. Each is equally far from all three lines."),
      sols.map((s, i) => I.pt(s, "Q" + SUB[i + 1])));
    R.step(T("Әр центрден бір түзуге перпендикуляр түсіріп, радиусты табыңыз да, төрт шеңберді сызыңыз.",
      "Drop a perpendicular from each centre to one line to get the radius, and draw the four circles."),
      sols.map((s) => I.seg(s, proj(l1, s))).concat(sols.map((s) => I.sol(s, s.r))));
    return sols;
  }

  /* =====================  PLC  ===================== */
  function plc(P, l, c, R, n) {
    n = n || D;
    const els = [{ t: "P", p: P }, { t: "L", l }, { t: "C", o: c.o, r: c.r }];
    const F = proj(l, c.o);
    const dir = dist(F, c.o) < 1e-6 ? perp(l.d) : unit(sub(c.o, F));
    const N1 = add(c.o, mul(dir, c.r)), N2 = sub(c.o, mul(dir, c.r));
    const pq = perpThrough(c.o, l);
    R.step(T(`${n.O} центрінен ${n.l} түзуіне перпендикуляр түсіріңіз, оның табаны F. Бұл перпендикуляр ${n.w} шеңберін N₁ және N₂ нүктелерінде қияды: бұлар ${n.l} түзуіне перпендикуляр диаметрдің ұштары.`,
      `Drop the perpendicular from ${n.O} to ${n.l}, with foot F. It meets ${n.w} at N₁ and N₂, the ends of the diameter perpendicular to ${n.l}.`),
      pq.items.concat([I.pt(F, "F"), I.pt(N1, "N₁"), I.pt(N2, "N₂")]));
    let all = [];
    [[N1, N2, 1, 2], [N2, N1, 2, 1]].forEach(([N, S, j, o]) => {
      const NP = sub(P, N), nPj = n.P + SUB[j];
      if (len(NP) < EPS) {
        const Fp = proj(l, P), h = dist(P, Fp), Q = mid(P, Fp);
        const ok = fits(Q, h / 2, els) ? [circleOut(Q, h / 2)] : [];
        all = all.concat(ok);
        R.step(T(`${n.P} нүктесі N${SUB[j]} нүктесімен беттеседі. Онда шеңбер ${n.w} шеңберін ${n.P} нүктесінде жанайды, ал ${n.P} нүктесінен ${n.l} түзуіне түсірілген перпендикуляр оның диаметрі болады. Перпендикулярдың ортасы Q центр болады.`,
          `${n.P} coincides with N${SUB[j]}. Then the circle touches ${n.w} at ${n.P}, and the perpendicular from ${n.P} to ${n.l} is its diameter. Its midpoint Q is the centre.`),
          [I.seg(P, Fp), I.pt(Q, "Q")].concat(ok.map((x) => I.sol(x, x.r))));
        return;
      }
      const k = dot(sub(S, N), sub(F, N));
      const Pj = add(N, mul(NP, k / dot(NP, NP)));
      const circ = circum(P, F, S);
      const items = [I.line(N, P), I.pt(Pj, nPj)];
      if (circ && circ.r < 2000) items.unshift(I.circ(circ, circ.r));
      R.step(T(`${n.P}, F және N${SUB[o]} нүктелері арқылы шеңбер сызыңыз. N${SUB[j]}${n.P} түзуі оны екінші рет ${nPj} нүктесінде қияды. Сонда N${SUB[j]}${n.P}·N${SUB[j]}${nPj} = N${SUB[j]}N${SUB[o]}·N${SUB[j]}F, сондықтан ізделінді шеңберлердің бір жұбы ${nPj} арқылы да өтеді.`,
        `Draw the circle through ${n.P}, F and N${SUB[o]}. Line N${SUB[j]}${n.P} meets it again at ${nPj}. Then N${SUB[j]}${n.P}·N${SUB[j]}${nPj} = N${SUB[j]}N${SUB[o]}·N${SUB[j]}F, so one pair of answer circles also passes through ${nPj}.`), items);
      if (dist(P, Pj) < EPS) {
        R.step(T(`${nPj} нүктесі ${n.P} нүктесімен беттесті, бұл жұп шекті жағдайға келеді.`, `${nPj} coincides with ${n.P}; this pair degenerates.`), []);
        return;
      }
      const M = new Merge();
      const sols = ppl(P, Pj, l, M, { A: n.P, B: nPj, l: n.l }).filter((s) => fits(s, s.r, els));
      all = all.concat(sols);
      R.step(T(`PPL есебін шешіңіз: ${n.P}, ${nPj} нүктелері және ${n.l} түзуі.`, `Solve problem PPL for points ${n.P}, ${nPj} and line ${n.l}.`),
        M.items.concat(sols.map((s) => I.sol(s, s.r))), { ref: "PPL" });
    });
    return dedupe(all);
  }

  /* =====================  PCC  ===================== */
  function pcc(P, c1, c2, R, n) {
    n = n || D;
    const els = [{ t: "P", p: P }, { t: "C", o: c1.o, r: c1.r }, { t: "C", o: c2.o, r: c2.r }];
    if (dist(c1.o, c2.o) < EPS) {
      const rs = Math.min(c1.r, c2.r), rb = Math.max(c1.r, c2.r), O = c1.o;
      const ra = (rb - rs) / 2, rm = (rb + rs) / 2;
      R.step(T(`${n.w1} және ${n.w2} шеңберлері концентрлі (радиустары r < R). Екеуін де жанайтын шеңберлер екі түрлі болады: радиусы (R − r)/2, центрі радиусы (R + r)/2 шеңберде; немесе радиусы (R + r)/2, центрі радиусы (R − r)/2 шеңберде. Осы екі көмекші шеңберді сызыңыз.`,
        `${n.w1} and ${n.w2} are concentric (radii r < R). Circles touching both come in two kinds: radius (R − r)/2 with centre on the circle of radius (R + r)/2, or radius (R + r)/2 with centre on the circle of radius (R − r)/2. Draw these two helper circles.`),
        [I.circ(O, rm), I.circ(O, ra)]);
      const sols = [];
      cc(O, rm, P, ra).forEach((q) => sols.push(circleOut(q, ra)));
      cc(O, ra, P, rm).forEach((q) => sols.push(circleOut(q, rm)));
      const ok = dedupe(sols.filter((s) => fits(s, s.r, els)));
      R.step(T(`Циркульмен ${n.P} нүктесінен (R − r)/2 және (R + r)/2 қашықтықтарды тиісті көмекші шеңберлерге өлшеп, центрлерді белгілеңіз. Шеңберлерді сызыңыз.`,
        `With the compass, measure (R − r)/2 and (R + r)/2 from ${n.P} onto the matching helper circles to get the centres. Draw the circles.`),
        ok.map((s, i) => I.pt(s, "Q" + SUB[i + 1])).concat(ok.map((s) => I.sol(s, s.r))));
      return ok;
    }
    const u = unit(sub(c2.o, c1.o)), w = perp(u);
    const eq = Math.abs(c1.r - c2.r) < 0.3;
    const I0 = mul(add(mul(c1.o, c2.r), mul(c2.o, c1.r)), 1 / (c1.r + c2.r));
    const E0 = eq ? null : mul(sub(mul(c1.o, c2.r), mul(c2.o, c1.r)), 1 / (c2.r - c1.r));
    const Xp = add(c1.o, mul(w, c1.r)), Yp = add(c2.o, mul(w, c2.r)), Ym = sub(c2.o, mul(w, c2.r));
    const s1 = [I.line(c1.o, c2.o), I.seg(c1.o, Xp), I.seg(c2.o, Yp), I.seg(c2.o, Ym), I.line(Xp, Ym), I.pt(I0, "I")];
    if (E0 && dist(E0, c1.o) < 3000) s1.push(I.line(Xp, Yp), I.pt(E0, "E"));
    R.step(eq
      ? T(`${n.O1}${n.O2} центрлер түзуін жүргізіңіз. ${n.O1} және ${n.O2} нүктелерінен оған перпендикуляр радиустар салыңыз. Радиустардың қарама-қарсы ұштарын қосатын түзу центрлер түзуін I нүктесінде (ішкі ұқсастық центрі) қияды. Шеңберлер тең болғандықтан, сыртқы ұқсастық центрі жоқ.`,
          `Draw the line of centres ${n.O1}${n.O2}. From ${n.O1} and ${n.O2} draw radii perpendicular to it. The line joining opposite ends meets the line of centres at I, the internal centre of similarity. The circles are equal, so there is no external centre.`)
      : T(`${n.O1}${n.O2} центрлер түзуін жүргізіңіз. ${n.O1} және ${n.O2} нүктелерінен оған перпендикуляр радиустар салыңыз. Радиустардың ұштарын қосатын түзулер центрлер түзуін E (сыртқы ұқсастық центрі) және I (ішкі ұқсастық центрі) нүктелерінде қияды.`,
          `Draw the line of centres ${n.O1}${n.O2}. From ${n.O1} and ${n.O2} draw radii perpendicular to it. Lines joining the ends of these radii meet the line of centres at E, the external centre of similarity, and I, the internal one.`), s1);

    const X = add(c1.o, mul(u, c1.r));
    const touch = (x, c) => Math.abs(dist(x, c.o) - (x.r + c.r)) < 0.1 + 2e-5 * x.r; // external
    const sameWay = (x) => touch(x, c1) === touch(x, c2);
    let all = [];
    const family = (H, Y, j, nH) => {
      const nPj = n.P + SUB[j];
      let Pj, items;
      if (!H) {
        const bl = bisector(c1.o, c2.o).line;
        Pj = reflect(bl, P);
        items = [I.ln(bl), I.seg(P, Pj), I.pt(Pj, nPj)];
        R.step(T(`Шеңберлер тең, сондықтан екеуін бірдей жанайтын шеңберлердің центрлері ${n.O1}${n.O2} кесіндісінің орта перпендикулярында жатады. ${n.P} нүктесін осы перпендикулярға қатысты шағылыстырып, ${nPj} нүктесін алыңыз.`,
          `The circles are equal, so circles touching both the same way have their centres on the perpendicular bisector of ${n.O1}${n.O2}. Reflect ${n.P} in this bisector to get ${nPj}.`), items);
      } else {
        const HP = sub(P, H);
        if (len(HP) < EPS) return;
        const k = dot(sub(X, H), sub(Y, H));
        Pj = add(H, mul(HP, k / dot(HP, HP)));
        const circ = circum(P, X, Y);
        items = [I.pt(X, "X"), I.pt(Y, j === 1 ? "Y" : "Y′"), I.line(H, P), I.pt(Pj, nPj)];
        if (circ && circ.r < 2000) items.unshift(I.circ(circ, circ.r));
        R.step(j === 1
          ? T(`Центрлер түзуінде ${n.w1} шеңберінің X нүктесін және ${n.w2} шеңберінің Y нүктесін белгілеңіз (суретте). ${n.P}, X, Y арқылы шеңбер сызыңыз. E${n.P} түзуі оны екінші рет ${nPj} нүктесінде қияды. Сонда E${n.P}·E${nPj} = EX·EY, сондықтан екі шеңберді бірдей жанайтын (екеуін де сырттан не екеуін де іштен) ізделінді шеңберлер ${nPj} арқылы да өтеді.`,
              `On the line of centres mark X on ${n.w1} and Y on ${n.w2} as in the drawing. Draw the circle through ${n.P}, X and Y. Line E${n.P} meets it again at ${nPj}. Then E${n.P}·E${nPj} = EX·EY, so the answer circles that touch both circles the same way (both from outside or both from inside) also pass through ${nPj}.`)
          : T(`Дәл осылай I центрі үшін: ${n.P}, X, Y′ арқылы шеңбер сызып, I${n.P} түзуінде ${nPj} нүктесін табыңыз. ${nPj} арқылы шеңберлердің бірін сырттан, екіншісін іштен жанайтын ізделінді шеңберлер өтеді.`,
              `Repeat with I: draw the circle through ${n.P}, X and Y′, and find ${nPj} on line I${n.P}. The answer circles that touch one circle from outside and the other from inside pass through ${nPj}.`), items);
      }
      if (dist(P, Pj) < EPS) {
        const ok = dedupe(GEO.tangentCircles([{ x: P.x, y: P.y, r: 0 }, { x: c1.o.x, y: c1.o.y, r: c1.r }, { x: c2.o.x, y: c2.o.y, r: c2.r }])
          .filter((x) => fits(x, x.r, els) && (j === 1 ? sameWay(x) : !sameWay(x))));
        all = all.concat(ok);
        R.step(T(`${nPj} нүктесі ${n.P} нүктесімен беттесті, сондықтан бұл жұп үшін ${n.P} нүктесінде екі шеңберге де жанама шеңберлер ғана қалады. ${n.P} нүктесін сәл жылжытсаңыз, толық салуды көресіз.`,
          `${nPj} coincides with ${n.P}, so this pair degenerates. Move ${n.P} a little to see the full construction. The circles of this pair are still shown.`),
          ok.map((x) => I.sol(x, x.r)));
        return;
      }
      const M = new Merge();
      const sols = ppc(P, Pj, c1, M, { A: n.P, B: nPj, w: n.w1, O: n.O1 }).filter((s) => fits(s, s.r, els));
      all = all.concat(sols);
      R.step(T(`PPC есебін шешіңіз: ${n.P}, ${nPj} нүктелері және ${n.w1} шеңбері.`, `Solve problem PPC for points ${n.P}, ${nPj} and circle ${n.w1}.`),
        M.items.concat(sols.map((s) => I.sol(s, s.r))), { ref: "PPC" });
    };
    family(E0, sub(c2.o, mul(u, c2.r)), 1);
    family(I0, add(c2.o, mul(u, c2.r)), 2);
    return dedupe(all);
  }

  /* ---------- silent dispatcher for reductions ---------- */
  function solveRaw(list) {
    const P = [], L = [], C = [];
    for (const e of list) {
      if (e.t === "P") P.push(e.p);
      else if (e.t === "L") L.push(e.l);
      else if (e.r < -1e-9) return [];
      else if (e.r < 0.05) P.push(e.o);
      else C.push({ o: e.o, r: e.r });
    }
    const code = "P".repeat(P.length) + "L".repeat(L.length) + "C".repeat(C.length);
    switch (code) {
      case "PPP": return ppp(P[0], P[1], P[2], SILENT);
      case "PPL": return ppl(P[0], P[1], L[0], SILENT);
      case "PLL": return pll(P[0], L[0], L[1], SILENT);
      case "LLL": return lll(L[0], L[1], L[2], SILENT);
      case "PPC": return ppc(P[0], P[1], C[0], SILENT);
      case "PLC": return plc(P[0], L[0], C[0], SILENT);
      case "LLC": return llc(L[0], L[1], C[0], SILENT);
      case "PCC": return pcc(P[0], C[0], C[1], SILENT);
      case "LCC": return lcc(L[0], C[0], C[1], SILENT);
      case "CCC": return ccc(C[0], C[1], C[2], SILENT);
    }
    return [];
  }

  /* =====================  LLC  ===================== */
  function llc(l1, l2, c, R, n) {
    n = n || D;
    const els = [{ t: "L", l: l1 }, { t: "L", l: l2 }, { t: "C", o: c.o, r: c.r }];
    const r = c.r, shifted = [];
    [r, -r].forEach((s) => shifted.push(shift(l1, s), shift(l2, s)));
    R.step(T(`${n.w} шеңберін өз центріне дейін кішірейтейік. Ізделінді шеңбердің радиусын r шамасына (${n.w} радиусы) үлкейтсек не кішірейтсек, ол ${n.O} арқылы өтеді және ${n.l1}, ${n.l2} түзулерінен r қашықтықтағы параллель түзулерді жанайды. Әр түзуге екі жағынан r қашықтықта параллель түзулер жүргізіңіз.`,
      `Shrink ${n.w} to its centre ${n.O}. If we make the answer circle larger or smaller by r (the radius of ${n.w}), it passes through ${n.O} and touches lines parallel to ${n.l1} and ${n.l2} at distance r. Draw these parallel lines on both sides of each line.`),
      shifted.map(I.ln).concat([I.pt(c.o, n.O)]));
    const aux = [], centres = [];
    [r, -r].forEach((a) => [r, -r].forEach((b) => {
      pll(c.o, shift(l1, a), shift(l2, b), SILENT).forEach((g) => { if (fromCentres([g], els).length) aux.push(I.circ(g, g.r), I.pt(g, null)); centres.push(g); });
    }));
    R.step(T(`Жылжытылған түзулердің әр жұбы үшін PLL есебін шешіңіз: ${n.O} арқылы өтетін және екі түзуді де жанайтын шеңберлер.`,
      `For each pair of moved lines solve problem PLL: circles through ${n.O} that touch both lines.`), aux, { ref: "PLL" });
    const sols = fromCentres(centres, els);
    R.step(T(`Центрлерді сақтап, радиусты r шамасына өзгертіңіз. Шыққан шеңберлер ${n.l1}, ${n.l2} түзулерін және ${n.w} шеңберін жанайды.`,
      `Keep the centres and change the radii by r. The resulting circles touch ${n.l1}, ${n.l2} and ${n.w}.`), sols.map((s) => I.sol(s, s.r)));
    return sols;
  }

  /* =====================  LCC  ===================== */
  function lcc(l, c1, c2, R, n) {
    n = n || D;
    const els = [{ t: "L", l }, { t: "C", o: c1.o, r: c1.r }, { t: "C", o: c2.o, r: c2.r }];
    const small = c1.r <= c2.r ? 0 : 1;
    const run = (cs, co) => {
      const centres = [], aux = [];
      [cs.r, -cs.r].forEach((a) => [co.r + cs.r, co.r - cs.r].forEach((ro) => {
        solveRaw([{ t: "P", p: cs.o }, { t: "L", l: shift(l, a) }, { t: "C", o: co.o, r: ro }])
          .forEach((g) => { if (fromCentres([g], els).length) aux.push(I.circ(g, g.r), I.pt(g, null)); centres.push(g); });
      }));
      return { centres, aux };
    };
    const [cs, co, ns, no, nOs] = small === 0 ? [c1, c2, n.w1, n.w2, n.O1] : [c2, c1, n.w2, n.w1, n.O2];
    R.step(T(`${ns} шеңбері кішісі (радиусы r). Оны өз центріне дейін кішірейтеміз: ${no} шеңберімен концентрлі, радиусы r шамасына үлкен және кіші шеңберлер сызыңыз, ал ${n.l} түзуіне екі жағынан r қашықтықта параллель түзулер жүргізіңіз.`,
      `${ns} is the smaller circle, radius r. Shrink it to its centre ${nOs}: draw circles concentric with ${no} with radius r larger and r smaller, and lines parallel to ${n.l} at distance r on both sides.`),
      [I.circ(co.o, co.r + cs.r), I.circ(co.o, Math.max(0, co.r - cs.r)), I.ln(shift(l, cs.r)), I.ln(shift(l, -cs.r)), I.pt(cs.o, nOs)]);
    const main = run(cs, co), other = run(co, cs);
    R.step(T(`Әр комбинация үшін PLC есебін шешіңіз: ${nOs} нүктесі, жылжытылған түзу және өзгертілген шеңбер.`,
      `For each combination solve problem PLC: the point ${nOs}, a moved line and an enlarged or reduced circle.`), main.aux, { ref: "PLC" });
    const sols = fromCentres(main.centres.concat(other.centres), els);
    R.step(T(`Центрлерді сақтап, радиусты r шамасына өзгертіңіз. Шыққан шеңберлер ${n.l} түзуін, ${n.w1} және ${n.w2} шеңберлерін жанайды.`,
      `Keep the centres and change the radii by r. The resulting circles touch ${n.l}, ${n.w1} and ${n.w2}.`), sols.map((s) => I.sol(s, s.r)));
    return sols;
  }

  /* =====================  CCC  ===================== */
  function ccc(c1, c2, c3, R, n) {
    n = n || D;
    const cs = [c1, c2, c3];
    const els = cs.map((c) => ({ t: "C", o: c.o, r: c.r }));
    const names = [[n.w1, n.O1], [n.w2, n.O2], [n.w3, n.O3]];
    const run = (k) => {
      const s = cs[k], rest = cs.filter((_, i) => i !== k), centres = [], aux = [];
      [1, -1].forEach((a) => [1, -1].forEach((b) => {
        solveRaw([{ t: "P", p: s.o }, { t: "C", o: rest[0].o, r: rest[0].r + a * s.r }, { t: "C", o: rest[1].o, r: rest[1].r + b * s.r }])
          .forEach((g) => { if (fromCentres([g], els).length) aux.push(I.circ(g, g.r), I.pt(g, null)); centres.push(g); });
      }));
      return { centres, aux, rest };
    };
    let k = 0; cs.forEach((c, i) => { if (c.r < cs[k].r) k = i; });
    const main = run(k);
    R.step(T(`${names[k][0]} шеңбері ең кішісі (радиусы r). Оны өз центріне дейін кішірейтеміз: қалған екі шеңбердің әрқайсысына концентрлі, радиусы r шамасына үлкен және кіші шеңберлер сызыңыз.`,
      `${names[k][0]} is the smallest circle, radius r. Shrink it to its centre ${names[k][1]}: for each of the other two circles draw concentric circles with radius r larger and r smaller.`),
      main.rest.flatMap((c) => [I.circ(c.o, c.r + cs[k].r), I.circ(c.o, Math.max(0, c.r - cs[k].r))]).concat([I.pt(cs[k].o, names[k][1])]));
    R.step(T(`Әр комбинация үшін PCC есебін шешіңіз: ${names[k][1]} нүктесі және екі өзгертілген шеңбер.`,
      `For each combination solve problem PCC: the point ${names[k][1]} and two changed circles.`), main.aux, { ref: "PCC" });
    let centres = main.centres;
    [0, 1, 2].filter((i) => i !== k).forEach((i) => { centres = centres.concat(run(i).centres); });
    centres = centres.concat(GEO.tangentCircles(cs.map((c) => ({ x: c.o.x, y: c.o.y, r: c.r }))));
    const sols = fromCentres(centres, els);
    R.step(T(`Центрлерді сақтап, радиусты r шамасына өзгертіңіз. Шыққан шеңберлер үш шеңберді де жанайды.`,
      `Keep the centres and change the radii by r. The resulting circles touch all three circles.`), sols.map((s) => I.sol(s, s.r)));
    return sols;
  }

  /* =====================  case detection  ===================== */
  function classify(code, P, L, C) {
    const on = (x) => Math.abs(x) < EPS;
    switch (code) {
      case "PPP": return Math.abs(sd(L2(P[0], P[1]), P[2])) < EPS * 0.5 ? "ppp-collinear" : "ppp-general";
      case "PPL": {
        const a = sd(L[0], P[0]), b = sd(L[0], P[1]);
        if (on(a) && on(b)) return null;
        if (on(a) || on(b)) return "ppl-on-line";
        if (a * b < 0) return "ppl-opposite";
        return Math.abs(a - b) < EPS * 0.5 ? "ppl-parallel" : "ppl-same-side";
      }
      case "PLL": {
        if (parallel(L[0], L[1])) {
          const dd = sd(L[0], L[1].p), k = sd(L[0], P[0]) / dd, e = EPS / Math.abs(dd || 1);
          return k < -e || k > 1 + e ? "pll-parallel-outside" : "pll-parallel-between";
        }
        if (dist(P[0], meet(L[0], L[1])) < EPS) return null;
        return on(sd(L[0], P[0])) || on(sd(L[1], P[0])) ? "pll-on-line" : "pll-intersecting";
      }
      case "LLL": {
        const p = [parallel(L[0], L[1]), parallel(L[1], L[2]), parallel(L[0], L[2])].filter(Boolean).length;
        if (p >= 2) return "lll-parallel";
        if (p === 1) return "lll-two-parallel";
        return on(sd(L[2], meet(L[0], L[1]))) ? "lll-concurrent" : "lll-triangle";
      }
      case "PPC": {
        const a = dist(P[0], C[0].o) - C[0].r, b = dist(P[1], C[0].o) - C[0].r;
        if (on(a) && on(b)) return null;
        if (on(a) || on(b)) return "ppc-on-circle";
        if (a * b < 0) return "ppc-separated";
        return a > 0 ? "ppc-outside" : "ppc-inside";
      }
      case "PLC": {
        const c = C[0], dl = Math.abs(sd(L[0], c.o));
        if (on(dist(P[0], c.o) - c.r)) return "plc-point-on-circle";
        if (on(sd(L[0], P[0]))) return "plc-point-on-line";
        if (dl < c.r - EPS) return "plc-line-cuts";
        if (dl > c.r + EPS && dist(P[0], c.o) > c.r && Math.sign(sd(L[0], P[0])) === Math.sign(sd(L[0], c.o))) return "plc-general";
        return null;
      }
      case "LLC": {
        const c = C[0], d1 = sd(L[0], c.o), d2 = sd(L[1], c.o);
        if (Math.abs(d1) < c.r + EPS || Math.abs(d2) < c.r + EPS) return null;
        if (parallel(L[0], L[1])) return d1 * d2 < 0 ? "llc-parallel-between" : "llc-parallel-outside";
        return "llc-general";
      }
      case "PCC": {
        const [a, b] = C, da = dist(P[0], a.o) - a.r, db = dist(P[0], b.o) - b.r, d = dist(a.o, b.o);
        if (on(da) || on(db)) return "pcc-on-circle";
        if (da < 0 || db < 0) return (da < 0) !== (db < 0) && d > a.r + b.r ? "pcc-inside-one" : null;
        if (d > a.r + b.r + EPS) return "pcc-outside";
        if (d < a.r + b.r - EPS && d > Math.abs(a.r - b.r) + EPS) return "pcc-intersecting";
        return null;
      }
      case "LCC": {
        const [a, b] = C, sa = sd(L[0], a.o), sb = sd(L[0], b.o);
        if (Math.abs(sa) < a.r + EPS || Math.abs(sb) < b.r + EPS || dist(a.o, b.o) < a.r + b.r + EPS) return null;
        return sa * sb < 0 ? "lcc-separated" : "lcc-general";
      }
      case "CCC": {
        const pairs = [[0, 1], [1, 2], [0, 2]].map(([i, j]) => ({ d: dist(C[i].o, C[j].o), s: C[i].r + C[j].r, df: Math.abs(C[i].r - C[j].r) }));
        if (pairs.every((p) => p.d < EPS)) return "ccc-concentric";
        if (pairs.every((p) => p.d > p.s + EPS)) return "ccc-separate";
        if (pairs.every((p) => p.d < p.s - EPS && p.d > p.df + EPS)) return "ccc-intersecting";
        return null;
      }
    }
    return null;
  }

  /* =====================  entry point  ===================== */
  function names(els) {
    const np = els.filter((e) => e.t === "P").length, nl = els.filter((e) => e.t === "L").length, nc = els.filter((e) => e.t === "C").length;
    return {
      P: np === 1 ? ["P"] : ["A", "B", "C"],
      L: nl === 1 ? ["l"] : ["l₁", "l₂", "l₃"],
      C: nc === 1 ? ["ω"] : ["ω₁", "ω₂", "ω₃"],
      O: nc === 1 ? ["O"] : ["O₁", "O₂", "O₃"]
    };
  }
  function listKz(arr) { return arr.length === 1 ? arr[0] : arr.slice(0, -1).join(", ") + " және " + arr[arr.length - 1]; }
  function listEn(arr) { return arr.length === 1 ? arr[0] : arr.slice(0, -1).join(", ") + " and " + arr[arr.length - 1]; }

  function run(code, raw) {
    const nm = names(raw);
    const P = [], L = [], C = [];
    raw.forEach((e) => {
      if (e.t === "P") P.push(v(e.x, e.y));
      else if (e.t === "L") L.push(L2(v(e.x1, e.y1), v(e.x2, e.y2)));
      else C.push({ o: v(e.x, e.y), r: e.r });
    });
    const R = new Rec();
    const kz = [], en = [];
    if (P.length) { kz.push(`${P.map((_, i) => nm.P[i]).join(", ")} ${P.length === 1 ? "нүктесі" : "нүктелері"}`); en.push(`${P.length === 1 ? "point" : "points"} ${P.map((_, i) => nm.P[i]).join(", ")}`); }
    if (L.length) { kz.push(`${L.map((_, i) => nm.L[i]).join(", ")} ${L.length === 1 ? "түзуі" : "түзулері"}`); en.push(`${L.length === 1 ? "line" : "lines"} ${L.map((_, i) => nm.L[i]).join(", ")}`); }
    if (C.length) {
      kz.push(`${C.map((_, i) => nm.C[i]).join(", ")} ${C.length === 1 ? "шеңбері" : "шеңберлері"} (${C.length === 1 ? "центрі" : "центрлері"} ${C.map((_, i) => nm.O[i]).join(", ")})`);
      en.push(`${C.length === 1 ? "circle" : "circles"} ${C.map((_, i) => nm.C[i]).join(", ")} (${C.length === 1 ? "centre" : "centres"} ${C.map((_, i) => nm.O[i]).join(", ")})`);
    }
    R.step(T(`Берілгені: ${listKz(kz)}. Үшеуін де жанайтын барлық шеңберлерді табу керек.`, `Given: ${listEn(en)}. Find every circle that touches all three.`),
      C.map((c, i) => I.pt(c.o, nm.O[i])));

    const n = { A: nm.P[0], B: nm.P[1], C: nm.P[2], P: nm.P[0], l: nm.L[0], l1: nm.L[0], l2: nm.L[1], l3: nm.L[2],
      w: nm.C[0], O: nm.O[0], w1: nm.C[0], w2: nm.C[1], w3: nm.C[2], O1: nm.O[0], O2: nm.O[1], O3: nm.O[2] };
    let sols = [];
    switch (code) {
      case "PPP": sols = ppp(P[0], P[1], P[2], R, n); break;
      case "PPL": sols = ppl(P[0], P[1], L[0], R, n); break;
      case "PLL": sols = pll(P[0], L[0], L[1], R, n); break;
      case "LLL": sols = lll(L[0], L[1], L[2], R, n); break;
      case "PPC": sols = ppc(P[0], P[1], C[0], R, n); break;
      case "PLC": sols = plc(P[0], L[0], C[0], R, n); break;
      case "LLC": sols = llc(L[0], L[1], C[0], R, n); break;
      case "PCC": sols = pcc(P[0], C[0], C[1], R, n); break;
      case "LCC": sols = lcc(L[0], C[0], C[1], R, n); break;
      case "CCC": sols = ccc(C[0], C[1], C[2], R, n); break;
    }
    sols = dedupe(sols);
    const k = sols.length;
    const last = R.steps[R.steps.length - 1];
    if (k > 0) {
      R.step(T(`Нәтиже: ${k} шеңбер. Әрқайсысы берілген нүктелер арқылы өтеді және берілген түзулер мен шеңберлерді жанайды.`,
        `Result: ${k} ${k === 1 ? "circle" : "circles"}. Each one passes through the given points and touches the given lines and circles.`),
        sols.map((s) => I.sol(s, s.r)));
    } else if (!last || !last.none) {
      R.step(T("Бұл орналасуда шешім жоқ: ешбір шеңбер үш шартты бірдей қанағаттандырмайды.", "There is no solution in this position: no circle meets all three conditions."), [], { none: true });
    }
    return { steps: R.steps, sols, caseId: classify(code, P, L, C) };
  }

  return { run, names };
})();
