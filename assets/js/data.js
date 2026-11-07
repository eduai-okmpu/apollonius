/* Problems and their cases.
   World coordinates: x in [0, 100], y in [0, 70], y grows downward.
   Elements: { t:"P", x, y } point; { t:"L", x1, y1, x2, y2 } line through two points;
             { t:"C", x, y, r } circle.
   n = number of solutions in this case, upTo = true when n is the maximum. */
(function () {
  const P = (x, y) => ({ t: "P", x, y });
  const L = (x1, y1, x2, y2) => ({ t: "L", x1, y1, x2, y2 });
  const C = (x, y, r) => ({ t: "C", x, y, r });
  const H = (y) => L(0, y, 100, y);

  const PROBLEMS = [
    { code: "PPP", name: { kz: "Үш нүкте", en: "Three points" } },
    { code: "PPL", name: { kz: "Екі нүкте және түзу", en: "Two points and a line" } },
    { code: "PLL", name: { kz: "Нүкте және екі түзу", en: "A point and two lines" } },
    { code: "LLL", name: { kz: "Үш түзу", en: "Three lines" } },
    { code: "PPC", name: { kz: "Екі нүкте және шеңбер", en: "Two points and a circle" } },
    { code: "PLC", name: { kz: "Нүкте, түзу және шеңбер", en: "A point, a line and a circle" } },
    { code: "LLC", name: { kz: "Екі түзу және шеңбер", en: "Two lines and a circle" } },
    { code: "PCC", name: { kz: "Нүкте және екі шеңбер", en: "A point and two circles" } },
    { code: "LCC", name: { kz: "Түзу және екі шеңбер", en: "A line and two circles" } },
    { code: "CCC", name: { kz: "Үш шеңбер", en: "Three circles" } }
  ];

  const V = (id, n, kz, en, els, extra) => Object.assign({ id, n, name: { kz, en }, els }, extra || {});

  const CASES = {
    PPP: [
      V("ppp-general", 1, "Бір түзудің бойында жатпайтын үш нүкте", "Three points not on one line",
        [P(28, 46), P(52, 18), P(74, 50)]),
      V("ppp-collinear", 0, "Бір түзудің бойында жатқан үш нүкте", "Three points on one line",
        [P(20, 52), P(50, 36), P(80, 20)])
    ],
    PPL: [
      V("ppl-same-side", 2, "Екі нүкте түзудің бір жағында", "Both points on one side of the line",
        [P(35, 24), P(62, 40), H(58)]),
      V("ppl-parallel", 1, "Нүктелерді қосатын кесінді түзуге параллель", "The segment between the points is parallel to the line",
        [P(35, 30), P(65, 30), H(58)]),
      V("ppl-on-line", 1, "Бір нүкте түзудің бойында", "One point lies on the line",
        [P(40, 24), P(60, 58), H(58)]),
      V("ppl-opposite", 0, "Нүктелер түзудің екі жағында", "The points are on opposite sides of the line",
        [P(40, 26), P(62, 62), H(46)])
    ],
    PLL: [
      V("pll-intersecting", 2, "Қиылысатын түзулер, нүкте бұрыштың ішінде", "Intersecting lines, point inside an angle",
        [P(50, 22), L(10, 62, 90, 30), L(10, 30, 90, 62)]),
      V("pll-on-line", 2, "Нүкте түзулердің біреуінің бойында", "The point lies on one of the lines",
        [P(25, 56), L(10, 62, 90, 30), L(10, 30, 90, 62)]),
      V("pll-parallel-between", 2, "Параллель түзулер, нүкте олардың арасында", "Parallel lines, point between them",
        [P(45, 30), H(14), H(56)]),
      V("pll-parallel-outside", 0, "Параллель түзулер, нүкте жолақтың сыртында", "Parallel lines, point outside the strip",
        [P(45, 12), H(28), H(54)])
    ],
    LLL: [
      V("lll-triangle", 4, "Түзулер үшбұрыш құрайды", "The lines form a triangle",
        [H(58), L(22, 66, 56, 6), L(84, 66, 44, 6)]),
      V("lll-two-parallel", 2, "Екі параллель түзу және оларды қиюшы", "Two parallel lines and a transversal",
        [H(20), H(50), L(30, 68, 70, 2)]),
      V("lll-concurrent", 0, "Түзулер бір нүктеде қиылысады", "The lines meet at one point",
        [H(35), L(20, 5, 80, 65), L(80, 5, 20, 65)]),
      V("lll-parallel", 0, "Үш параллель түзу", "Three parallel lines",
        [H(15), H(35), H(55)])
    ],
    PPC: [
      V("ppc-outside", 2, "Екі нүкте шеңбердің сыртында", "Both points outside the circle",
        [P(14, 18), P(86, 24), C(50, 36, 20)]),
      V("ppc-inside", 2, "Екі нүкте шеңбердің ішінде", "Both points inside the circle",
        [P(42, 30), P(58, 44), C(50, 36, 20)]),
      V("ppc-on-circle", 1, "Бір нүкте шеңбердің бойында", "One point lies on the circle",
        [P(50, 16), P(14, 56), C(50, 36, 20)]),
      V("ppc-separated", 0, "Шеңбер нүктелерді бөліп тұр", "The circle separates the points",
        [P(46, 32), P(88, 60), C(50, 36, 20)])
    ],
    PLC: [
      V("plc-general", 4, "Түзу шеңберді қимайды, нүкте сыртта", "The line misses the circle, point outside",
        [P(18, 16), H(60), C(55, 30, 14)], { upTo: true }),
      V("plc-point-on-circle", 2, "Нүкте шеңбердің бойында", "The point lies on the circle",
        [P(63.4, 18.8), H(60), C(55, 30, 14)]),
      V("plc-point-on-line", 2, "Нүкте түзудің бойында", "The point lies on the line",
        [P(22, 60), H(60), C(55, 30, 14)]),
      V("plc-line-cuts", 2, "Түзу шеңберді қиып өтеді", "The line cuts the circle",
        [P(18, 12), H(36), C(55, 30, 14)])
    ],
    LLC: [
      V("llc-general", 4, "Қиылысатын түзулер, шеңбер бұрыштың ішінде", "Intersecting lines, circle inside an angle",
        [L(5, 10, 95, 65), L(5, 65, 95, 10), C(50, 14, 7)]),
      V("llc-parallel-between", 4, "Параллель түзулер, шеңбер олардың арасында", "Parallel lines, circle between them",
        [H(14), H(56), C(50, 35, 8)]),
      V("llc-parallel-outside", 0, "Параллель түзулер, шеңбер жолақтың сыртында", "Parallel lines, circle outside the strip",
        [H(30), H(56), C(50, 13, 8)])
    ],
    PCC: [
      V("pcc-outside", 4, "Нүкте екі шеңбердің де сыртында", "The point is outside both circles",
        [P(50, 10), C(30, 38, 14), C(72, 38, 12)]),
      V("pcc-on-circle", 2, "Нүкте шеңберлердің бірінің бойында", "The point lies on one of the circles",
        [P(30, 24), C(30, 38, 14), C(72, 38, 12)]),
      V("pcc-intersecting", 2, "Қиылысатын шеңберлер, нүкте сыртта", "Intersecting circles, point outside",
        [P(51, 8), C(40, 38, 16), C(62, 38, 16)]),
      V("pcc-inside-one", 0, "Нүкте шеңберлердің бірінің ішінде", "The point is inside one of the circles",
        [P(27, 40), C(30, 38, 14), C(72, 38, 12)])
    ],
    LCC: [
      V("lcc-general", 8, "Екі шеңбер түзудің бір жағында", "Both circles on one side of the line",
        [H(60), C(30, 32, 12), C(70, 28, 14)], { upTo: true }),
      V("lcc-separated", 0, "Түзу шеңберлерді бөліп тұр", "The line separates the circles",
        [H(38), C(30, 20, 10), C(70, 56, 9)])
    ],
    CCC: [
      V("ccc-separate", 8, "Бір-бірінен бөлек үш шеңбер", "Three separate circles",
        [C(24, 24, 10), C(74, 22, 12), C(50, 54, 9)]),
      V("ccc-intersecting", 8, "Қос-қостан қиылысатын шеңберлер", "Circles intersecting in pairs",
        [C(40, 28, 16), C(60, 28, 16), C(50, 46, 16)], { upTo: true }),
      V("ccc-concentric", 0, "Ортақ центрлі шеңберлер", "Concentric circles",
        [C(50, 35, 8), C(50, 35, 18), C(50, 35, 30)])
    ]
  };

  const byId = {};
  Object.values(CASES).forEach((list) => list.forEach((v) => { byId[v.id] = v; }));

  /* Sort element letters into canonical P < L < C order. */
  const ORDER = { P: 0, L: 1, C: 2 };
  const canonical = (letters) => letters.slice().sort((a, b) => ORDER[a] - ORDER[b]).join("");

  window.APOLLO = { PROBLEMS, CASES, byId, canonical };
})();
