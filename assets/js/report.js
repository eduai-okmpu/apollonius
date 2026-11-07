/* PDF report: settings, live page preview, export.
   One layout engine produces pages as drawing operations; the preview draws them on canvases and
   the export replays the same operations into jsPDF, so the preview matches the file. */
window.REPORT = (function () {
  const PT = 0.3528; // mm per point
  const FONT = "Literata", CANVAS_FONT = "DocLiterata";
  const JSPDF_URL = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  const FONTS_URL = "assets/js/fonts-literata.js";
  const STORE = "apollo-pdf-settings";

  /* ---------- interface strings (site language) ---------- */
  const UI = {
    kz: {
      dialog: "PDF құжат", download: "PDF жүктеу", close: "Жабу", preview: "Алдын ала қарау", settings: "Баптаулар",
      loading: "Қаріптер мен кітапхана жүктелуде…", loadFail: "PDF құралдары жүктелмеді. Интернет байланысын тексеріп, терезені қайта ашыңыз.",
      building: "PDF жасалуда…", saved: "PDF сақталды.", declined: "Сақтау тоқтатылды.", failed: "PDF сақталмады. Қайталап көріңіз.",
      pages: (n) => `${n} бет`, auto: "Бос қалдырсаңыз, автоматты түрде толтырылады", reset: "Баптауларды қалпына келтіру",
      g: { doc: "Құжат", author: "Автор және мекеме", page: "Бет параметрлері", content: "Мазмұны", fig: "Сызбалар" },
      f: {
        lang: "Құжат тілі", docType: "Құжат түрі", title: "Тақырыбы", subtitle: "Тақырыпша", header: "Жоғарғы колонтитул", footer: "Төменгі колонтитул",
        author: "Аты-жөні", group: "Тобы / сыныбы", institution: "Оқу орны", department: "Факультет / кафедра", supervisor: "Жетекші (тексерген)",
        city: "Қаласы", date: "Күні",
        paper: "Қағаз өлшемі", orient: "Бағдары", margins: "Жиектер", fontSize: "Қаріп өлшемі", leading: "Жол аралығы", align: "Мәтінді туралау", pageNumbers: "Бет нөмірлері",
        titlePage: "Титул беті", statement: "Есептің қойылымы", givenTable: "Бастапқы деректер кестесі", resultTable: "Нәтижелер кестесі",
        conclusion: "Қорытынды", notes: "Қосымша ескертпе", signatures: "Қолтаңба жолдары",
        figures: "Суреттер", figSize: "Сурет өлшемі", figColor: "Түсі", figGrid: "Тор сызықтары", figView: "Сызба аумағы", figLabels: "Белгілеулер"
      },
      o: {
        portrait: "Кітаптық", landscape: "Альбомдық", gost: "МЕМСТ (30/10/20/20 мм)", standard: "Қалыпты (20 мм)", narrow: "Тар (12 мм)", wide: "Кең (30 мм)",
        justify: "Ені бойынша", left: "Сол жақ бойынша", each: "Әр қадамға", final: "Тек соңғы нәтиже", none: "Суретсіз",
        small: "Кіші", medium: "Орташа", large: "Үлкен", color: "Түрлі-түсті", bw: "Ақ-қара", screen: "Экрандағыдай", field: "Бүкіл өріс"
      }
    },
    en: {
      dialog: "PDF document", download: "Download PDF", close: "Close", preview: "Preview", settings: "Settings",
      loading: "Loading fonts and the PDF library…", loadFail: "The PDF tools could not be loaded. Check your connection and open this window again.",
      building: "Building PDF…", saved: "PDF saved.", declined: "Saving was cancelled.", failed: "The PDF was not saved. Try again.",
      pages: (n) => `${n} ${n === 1 ? "page" : "pages"}`, auto: "Leave empty to fill in automatically", reset: "Reset settings",
      g: { doc: "Document", author: "Author and institution", page: "Page setup", content: "Contents", fig: "Figures" },
      f: {
        lang: "Document language", docType: "Document type", title: "Title", subtitle: "Subtitle", header: "Running header", footer: "Running footer",
        author: "Full name", group: "Group / class", institution: "Institution", department: "Faculty / department", supervisor: "Supervisor (checked by)",
        city: "City", date: "Date",
        paper: "Paper size", orient: "Orientation", margins: "Margins", fontSize: "Font size", leading: "Line spacing", align: "Text alignment", pageNumbers: "Page numbers",
        titlePage: "Title page", statement: "Problem statement", givenTable: "Given data table", resultTable: "Results table",
        conclusion: "Conclusion", notes: "Additional notes", signatures: "Signature lines",
        figures: "Figures", figSize: "Figure size", figColor: "Colour", figGrid: "Grid lines", figView: "Drawing area", figLabels: "Labels"
      },
      o: {
        portrait: "Portrait", landscape: "Landscape", gost: "GOST (30/10/20/20 mm)", standard: "Standard (20 mm)", narrow: "Narrow (12 mm)", wide: "Wide (30 mm)",
        justify: "Justified", left: "Left", each: "After every step", final: "Final result only", none: "No figures",
        small: "Small", medium: "Medium", large: "Large", color: "Colour", bw: "Black and white", screen: "As on screen", field: "Whole field"
      }
    }
  };

  /* ---------- document strings (document language) ---------- */
  const DOC = {
    kz: {
      docType: "Салу жұмысы",
      title: (pn) => `Аполлоний есебі: ${lower(pn)}`,
      subtitle: (code, cn) => `${code} есебі. Жағдай: ${cn}`,
      header: (code) => `Аполлоний есебі · ${code}`,
      special: "ерекше орналасу",
      performed: "Орындаған", checked: "Тексерген", dateL: "Күні", sign: "(қолы)",
      s1: "Есептің қойылымы", s2: "Бастапқы деректер", s3: "Салу барысы", s4: "Нәтиже", s5: "Қорытынды",
      intro: "Аполлоний есебі — берілген үш элементті (нүкте, түзу немесе шеңбер) жанайтын шеңберді салу туралы классикалық есеп. Оны алғаш Пергалық Аполлоний (б.з.д. III ғ.) «Жанасулар туралы» еңбегінде қарастырған. Салу тек циркуль мен сызғыштың көмегімен орындалады. Шеңбердің нүктені «жанауы» оның сол нүкте арқылы өтуін білдіреді.",
      problem: (code, pn) => `Бұл жұмыста ${code} түріндегі есеп қарастырылады: ${lower(pn)}.`,
      layout: (cn) => `Элементтердің орналасуы: ${cn}.`,
      layoutSpecial: "Элементтердің орналасуы ерекше, ол стандартты жағдайлардың ешқайсысына сәйкес келмейді.",
      t1: "1-кесте – Бастапқы деректер", t2: (n) => `${n}-кесте – Ізделінді шеңберлер`,
      cols1: ["№", "Элемент", "Белгіленуі", "Параметрлері"], cols2: ["№", "Центрі (x; y)", "Радиусы"],
      P: "Нүкте", L: "Түзу", C: "Шеңбер",
      pt: (p) => `(${p})`, ln: (a, b) => `(${a}) және (${b}) нүктелері арқылы өтеді`, ci: (c, r) => `центрі (${c}), радиусы ${r}`,
      coords: "Координаттар шартты бірліктермен берілген: x осі оңға, y осі төмен бағытталған.",
      conIntro: (n, bw) => `Салу ${n} қадамнан тұрады. Сызбаларда берілген элементтер қара түспен, қосалқы сызықтар сұр түспен, ал ағымдағы қадамда салынғандар мен ізделінді шеңберлер ${bw ? "қалың қара сызықпен" : "көк түспен"} көрсетілген.`,
      step: (n) => `${n}-қадам.`,
      fig: (n, s) => `${n}-сурет – ${s}-қадамнан кейінгі сызба`,
      figFinal: (n) => `${n}-сурет – Салудың соңғы нәтижесі`,
      res: (k, tn) => `Салу нәтижесінде берілген үш элементті жанайтын ${k} шеңбер алынды.${tn ? ` Олардың центрлері мен радиустары ${tn}-кестеде келтірілген.` : ""}`,
      resNone: "Бұл орналасуда берілген үш шартты бірдей қанағаттандыратын шеңбер жоқ. Оның себебі салу қадамдарында көрсетілген.",
      concl: (code, cn, k) => k > 0
        ? `Аполлоний есебінің ${code} түрі «${cn}» жағдайында циркуль мен сызғыштың көмегімен шешілді. Барлығы ${k} шеңбер салынды, олардың әрқайсысы берілген элементтерді жанайтыны тексерілді.`
        : `Аполлоний есебінің ${code} түрі «${cn}» жағдайында қарастырылды. Бұл орналасуда шешім жоқ екені көрсетілді.`,
      months: null
    },
    en: {
      docType: "Construction report",
      title: (pn) => `The Apollonius problem: ${lower(pn)}`,
      subtitle: (code, cn) => `Problem ${code}. Case: ${cn}`,
      header: (code) => `The Apollonius problem · ${code}`,
      special: "special position",
      performed: "Prepared by", checked: "Checked by", dateL: "Date", sign: "(signature)",
      s1: "Problem statement", s2: "Given data", s3: "Construction", s4: "Result", s5: "Conclusion",
      intro: "The Apollonius problem asks for a circle that touches three given elements, each of which is a point, a line or a circle. Apollonius of Perga posed it in his work On Tangencies in the 3rd century BC. The construction uses only a compass and a straightedge. A circle touches a point when it passes through that point.",
      problem: (code, pn) => `This report solves problem ${code}: ${lower(pn)}.`,
      layout: (cn) => `Arrangement of the elements: ${lower(cn)}.`,
      layoutSpecial: "The elements are in a special position that matches none of the standard cases.",
      t1: "Table 1 – Given data", t2: (n) => `Table ${n} – Circles found`,
      cols1: ["No.", "Element", "Name", "Parameters"], cols2: ["No.", "Centre (x; y)", "Radius"],
      P: "Point", L: "Line", C: "Circle",
      pt: (p) => `(${p})`, ln: (a, b) => `through (${a}) and (${b})`, ci: (c, r) => `centre (${c}), radius ${r}`,
      coords: "Coordinates are in drawing units: the x axis points right and the y axis points down.",
      conIntro: (n, bw) => `The construction has ${n} steps. In the figures the given elements are black, construction lines are grey, and the lines drawn in the current step and the answer circles are ${bw ? "thick black" : "blue"}.`,
      step: (n) => `Step ${n}.`,
      fig: (n, s) => `Figure ${n} – Drawing after step ${s}`,
      figFinal: (n) => `Figure ${n} – Final result of the construction`,
      res: (k, tn) => `The construction gives ${k} ${k === 1 ? "circle" : "circles"} touching all three given elements.${tn ? ` Their centres and radii are listed in Table ${tn}.` : ""}`,
      resNone: "In this position no circle meets all three conditions. The construction steps show why.",
      concl: (code, cn, k) => k > 0
        ? `Problem ${code} of the Apollonius problem was solved with compass and straightedge for the case “${lower(cn)}”. In total ${k} ${k === 1 ? "circle was" : "circles were"} constructed, and each was checked to touch the given elements.`
        : `Problem ${code} of the Apollonius problem was studied for the case “${lower(cn)}”. It was shown that this position has no solution.`
    }
  };
  function lower(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  /* ---------- settings ---------- */
  const FIELDS = [
    ["doc", "lang", "select", ["kz", "en"]], ["doc", "docType", "text"], ["doc", "title", "text"], ["doc", "subtitle", "text"],
    ["doc", "header", "text"], ["doc", "footer", "text"],
    ["author", "author", "text"], ["author", "group", "text"], ["author", "institution", "text"], ["author", "department", "text"],
    ["author", "supervisor", "text"], ["author", "city", "text"], ["author", "date", "date"],
    ["page", "paper", "select", ["A4", "A5", "Letter"]], ["page", "orient", "select", ["portrait", "landscape"]],
    ["page", "margins", "select", ["gost", "standard", "narrow", "wide"]], ["page", "fontSize", "select", ["10", "11", "12", "13", "14"]],
    ["page", "leading", "select", ["1", "1.15", "1.5", "2"]], ["page", "align", "select", ["justify", "left"]], ["page", "pageNumbers", "check"],
    ["content", "titlePage", "check"], ["content", "statement", "check"], ["content", "givenTable", "check"], ["content", "resultTable", "check"],
    ["content", "conclusion", "check"], ["content", "signatures", "check"], ["content", "notes", "area"],
    ["fig", "figures", "select", ["each", "final", "none"]], ["fig", "figSize", "select", ["small", "medium", "large"]],
    ["fig", "figColor", "select", ["color", "bw"]], ["fig", "figView", "select", ["screen", "field"]], ["fig", "figGrid", "check"], ["fig", "figLabels", "check"]
  ];
  const AUTO = ["docType", "title", "subtitle", "header"];
  const DEFAULTS = {
    lang: "kz", docType: "", title: "", subtitle: "", header: "", footer: "",
    author: "", group: "", institution: "", department: "", supervisor: "", city: "", date: "",
    paper: "A4", orient: "portrait", margins: "gost", fontSize: "12", leading: "1.15", align: "justify", pageNumbers: true,
    titlePage: true, statement: true, givenTable: true, resultTable: true, conclusion: true, signatures: true, notes: "",
    figures: "each", figSize: "medium", figColor: "color", figView: "screen", figGrid: false, figLabels: true
  };
  function loadSettings(uiLang) {
    let s = {};
    try { s = JSON.parse(localStorage.getItem(STORE) || "{}") || {}; } catch (e) { s = {}; }
    const out = Object.assign({}, DEFAULTS, { lang: uiLang }, s);
    if (!out.date) out.date = new Date().toISOString().slice(0, 10);
    return out;
  }
  function saveSettings(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) {} }

  /* ---------- loading ---------- */
  let ready = null;
  function loadScript(src) {
    return new Promise((res, rej) => {
      const el = document.createElement("script");
      el.src = src; el.async = true; el.onload = res; el.onerror = rej;
      document.head.appendChild(el);
    });
  }
  function b64ToBytes(b64) { const bin = atob(b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function prepare() {
    if (ready) return ready;
    const fonts = window.LITERATA_FONTS ? Promise.resolve(window.LITERATA_FONTS)
      : loadScript(FONTS_URL).then(() => window.LITERATA_FONTS).catch(() =>
          fetch(FONTS_URL).then((r) => r.text()).then((t) => JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1))));
    const lib = window.jspdf ? Promise.resolve() : loadScript(JSPDF_URL);
    ready = Promise.all([fonts, lib]).then(async ([f]) => {
      if (!f || !window.jspdf) throw new Error("missing");
      const faces = [["normal", "400", "normal"], ["bold", "700", "normal"], ["italic", "400", "italic"]];
      await Promise.all(faces.map(([k, w, st]) => {
        const face = new FontFace(CANVAS_FONT, b64ToBytes(f[k]), { weight: w, style: st });
        document.fonts.add(face);
        return face.load();
      }));
      return f;
    });
    ready.catch(() => { ready = null; });
    return ready;
  }
  function newDoc(fonts, fmt, orientation) {
    const doc = new window.jspdf.jsPDF({ unit: "mm", format: fmt, orientation, compress: true });
    [["normal", "Literata-Regular.ttf"], ["bold", "Literata-Bold.ttf"], ["italic", "Literata-Italic.ttf"]].forEach(([st, file]) => {
      doc.addFileToVFS(file, fonts[st]);
      doc.addFont(file, FONT, st);
    });
    doc.setFont(FONT, "normal");
    return doc;
  }

  /* ---------- page geometry ---------- */
  const PAPER = { A4: [210, 297], A5: [148, 210], Letter: [215.9, 279.4] };
  const MARGINS = { gost: { l: 30, r: 10, t: 20, b: 20 }, standard: { l: 20, r: 20, t: 20, b: 20 }, narrow: { l: 12, r: 12, t: 14, b: 14 }, wide: { l: 30, r: 30, t: 28, b: 28 } };
  const COLORS = { text: "#111111", soft: "#555555", rule: "#000000", faint: "#9a9a9a" };

  /* ---------- layout ---------- */
  function layout(S, data, measureDoc) {
    const D = DOC[S.lang];
    let [pw, ph] = PAPER[S.paper] || PAPER.A4;
    if (S.orient === "landscape") [pw, ph] = [ph, pw];
    const m = MARGINS[S.margins] || MARGINS.standard;
    const cw = pw - m.l - m.r, base = Number(S.fontSize) || 12, lead = Number(S.leading) || 1.15;
    const widthCache = new Map();
    const measure = (str, style, size) => {
      const key = style + size + "|" + str;
      let w = widthCache.get(key);
      if (w === undefined) { measureDoc.setFont(FONT, style); measureDoc.setFontSize(size); w = measureDoc.getTextWidth(str); widthCache.set(key, w); }
      return w;
    };
    const lineH = (size) => size * PT * 1.2 * lead;
    const pages = [];
    let page = null, y = 0, bodyStarted = false;
    const newPage = (body) => { page = { ops: [], body }; pages.push(page); y = m.t; return page; };
    const ensure = (h) => { if (!page || y + h > ph - m.b) newPage(true); };
    const text = (s, x, yy, style, size, color) => page.ops.push({ t: "text", s, x, y: yy, style, size, color: color || COLORS.text });
    const hline = (x1, y1, x2, y2, w, color) => page.ops.push({ t: "line", x1, y1, x2, y2, w: w || 0.2, color: color || COLORS.rule });

    /* paragraph made of runs [{text, style}] */
    function para(runs, o) {
      o = o || {};
      const size = o.size || base, style0 = o.style || "normal", align = o.align || S.align, indent = o.indent === undefined ? 12.5 : o.indent;
      const words = [];
      (typeof runs === "string" ? [{ text: runs, style: style0 }] : runs).forEach((r) => {
        r.text.split(/\s+/).filter(Boolean).forEach((w) => words.push({ s: w, style: r.style || style0 }));
      });
      if (!words.length) return;
      words.forEach((w) => { w.w = measure(w.s, w.style, size); });
      const space = measure(" ", "normal", size), lh = lineH(size);
      const lines = []; let cur = [], curW = 0, avail = cw - indent;
      words.forEach((w) => {
        const add = cur.length ? space + w.w : w.w;
        if (cur.length && curW + add > avail) { lines.push({ words: cur, w: curW, avail }); cur = []; curW = 0; avail = cw; }
        cur.push(w); curW += cur.length > 1 ? space + w.w : w.w;
      });
      if (cur.length) lines.push({ words: cur, w: curW, avail, last: true });
      if (o.before) { if (page && y > m.t + 0.1) y += o.before; }
      if (o.keep) ensure(lh * o.keep);
      lines.forEach((ln, i) => {
        ensure(lh);
        const x0 = m.l + (i === 0 ? indent : 0);
        let x = x0, gap = space;
        if (align === "center") x = m.l + (cw - ln.w) / 2;
        else if (align === "right") x = m.l + cw - ln.w;
        else if (align === "justify" && !ln.last && ln.words.length > 1) gap = space + (ln.avail - ln.w) / (ln.words.length - 1);
        const by = y + size * PT * 0.9;
        ln.words.forEach((w) => { text(w.s, x, by, w.style, size, o.color); x += w.w + gap; });
        y += lh;
      });
      y += o.after === undefined ? lh * 0.35 : o.after;
    }
    const heading = (s) => para([{ text: s, style: "bold" }], { size: base + 1, indent: 0, align: "left", before: lineH(base) * 0.8, after: lineH(base) * 0.4, keep: 4 });

    /* table with wrapped cells; header repeats on new pages */
    function table(caption, header, rows, fr, aligns) {
      const size = base - 1, lh = lineH(size) / lead * Math.min(lead, 1.15), pad = 1.4;
      const widths = fr.map((f) => f * cw);
      const wrap = (str, w, style) => {
        const out = []; let cur = "";
        String(str).split(/\s+/).filter(Boolean).forEach((word) => {
          const tryS = cur ? cur + " " + word : word;
          if (cur && measure(tryS, style, size) > w) { out.push(cur); cur = word; } else cur = tryS;
        });
        if (cur) out.push(cur);
        return out.length ? out : [""];
      };
      para(caption, { indent: 0, align: "left", keep: 5, after: lineH(base) * 0.15 });
      const drawRow = (cells, style) => {
        const wrapped = cells.map((c, i) => wrap(c, widths[i] - 2 * pad, style));
        const h = Math.max(...wrapped.map((l) => l.length)) * lh + 2 * pad;
        return { wrapped, h, style };
      };
      const head = drawRow(header, "bold");
      const paint = (r) => {
        let x = m.l;
        hline(m.l, y, m.l + cw, y, 0.25);
        r.wrapped.forEach((lines, i) => {
          lines.forEach((ln, j) => {
            const w = measure(ln, r.style, size);
            const a = r.style === "bold" ? "center" : aligns[i];
            const tx = a === "center" ? x + (widths[i] - w) / 2 : a === "right" ? x + widths[i] - pad - w : x + pad;
            text(ln, tx, y + pad + j * lh + size * PT * 0.85, r.style, size);
          });
          x += widths[i];
        });
        let vx = m.l;
        hline(vx, y, vx, y + r.h, 0.25);
        widths.forEach((w) => { vx += w; hline(vx, y, vx, y + r.h, 0.25); });
        y += r.h;
        hline(m.l, y, m.l + cw, y, 0.25);
      };
      ensure(head.h * 2 + 2);
      paint(head);
      rows.forEach((cells) => {
        const r = drawRow(cells, "normal");
        if (y + r.h > ph - m.b) { newPage(true); paint(head); }
        paint(r);
      });
      y += lineH(base) * 0.8;
    }

    function figBox(fig) {
      const f = { small: 0.55, medium: 0.75, large: 1 }[S.figSize] || 0.75;
      let w = cw * f, h = w * fig.aspect;
      const maxH = (ph - m.t - m.b) * 0.62;
      if (h > maxH) { h = maxH; w = h / fig.aspect; }
      return { w, h, total: h + lineH(base - 1) * 2 + 4 };
    }
    /* number of lines a paragraph will take, to keep a step together with its figure */
    function lineCount(runs, size) {
      let n = 1, cur = 0, avail = cw - 12.5;
      const space = measure(" ", "normal", size);
      runs.forEach((r) => r.text.split(/\s+/).filter(Boolean).forEach((wd) => {
        const w = measure(wd, r.style || "normal", size), add = cur ? space + w : w;
        if (cur && cur + add > avail) { n++; cur = w; avail = cw; } else cur += add;
      }));
      return n;
    }
    function figure(fig, caption) {
      const { w, h, total } = figBox(fig);
      ensure(total);
      y += 2;
      const x = m.l + (cw - w) / 2;
      page.ops.push({ t: "img", fig: fig.id, x, y, w, h });
      page.ops.push({ t: "rect", x, y, w, h, color: COLORS.faint, wl: 0.15 });
      y += h + 1.5;
      para(caption, { size: base - 1, indent: 0, align: "center", after: lineH(base) * 0.6 });
    }

    /* ----- title page ----- */
    const caseName = data.caseName || D.special;
    const docType = S.docType || D.docType, title = S.title || D.title(data.problemName), subtitle = S.subtitle || D.subtitle(data.code, caseName);
    const dateObj = S.date ? new Date(S.date + "T12:00:00") : new Date();
    const dateStr = S.lang === "kz"
      ? `${String(dateObj.getDate()).padStart(2, "0")}.${String(dateObj.getMonth() + 1).padStart(2, "0")}.${dateObj.getFullYear()}`
      : dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    if (S.titlePage) {
      newPage(false);
      if (S.institution) para(S.institution.toUpperCase(), { style: "bold", align: "center", indent: 0, size: base });
      if (S.department) para(S.department, { align: "center", indent: 0 });
      y = Math.max(y, ph * 0.34);
      para(docType.toUpperCase(), { style: "bold", align: "center", indent: 0, size: base + 6, after: lineH(base) });
      para(title, { style: "bold", align: "center", indent: 0, size: base + 3 });
      para(subtitle, { align: "center", indent: 0, size: base + 1 });
      y = Math.max(y + lineH(base) * 2, ph * 0.62);
      const blockX = m.l + cw * 0.5, colW = cw * 0.5;
      const block = (label, value, extra) => {
        if (!value) return;
        text(label + ":", blockX, y + base * PT, "bold", base);
        y += lineH(base);
        [value].concat(extra ? [extra] : []).forEach((v) => {
          let line = "";
          v.split(/\s+/).forEach((wd) => {
            const t2 = line ? line + " " + wd : wd;
            if (line && measure(t2, "normal", base) > colW) { text(line, blockX, y + base * PT, "normal", base); y += lineH(base); line = wd; } else line = t2;
          });
          if (line) { text(line, blockX, y + base * PT, "normal", base); y += lineH(base); }
        });
        y += lineH(base) * 0.5;
      };
      block(D.performed, S.author, S.group);
      block(D.checked, S.supervisor);
      const bottom = [S.city, String(dateObj.getFullYear())].filter(Boolean).join(", ");
      const bw = measure(bottom, "normal", base);
      text(bottom, m.l + (cw - bw) / 2, ph - m.b - 2, "normal", base);
    }

    /* ----- body ----- */
    newPage(true);
    if (!S.titlePage) {
      para(docType.toUpperCase(), { style: "bold", align: "center", indent: 0, size: base + 3 });
      para(title, { style: "bold", align: "center", indent: 0, size: base + 1 });
      para(subtitle, { align: "center", indent: 0, after: lineH(base) });
    }
    let sec = 0, tableNo = 0, figNo = 0;
    if (S.statement) {
      heading(`${++sec}. ${D.s1}`);
      para(D.intro);
      para(D.problem(data.code, data.problemName));
      para(data.steps[0].t[S.lang]);
      para(data.caseName ? D.layout(data.caseName) : D.layoutSpecial);
    }
    if (S.givenTable) {
      heading(`${++sec}. ${D.s2}`);
      const rows = data.given.map((g, i) => [String(i + 1), D[g.t], g.name, g.t === "P" ? D.pt(g.a) : g.t === "L" ? D.ln(g.a, g.b) : D.ci(g.a, g.r)]);
      tableNo++;
      table(S.lang === "kz" ? `${tableNo}-кесте – Бастапқы деректер` : `Table ${tableNo} – Given data`, D.cols1, rows, [0.08, 0.18, 0.17, 0.57], ["center", "left", "center", "left"]);
      para(D.coords, { size: base - 1 });
    }
    heading(`${++sec}. ${D.s3}`);
    const bw = S.figColor === "bw";
    para(D.conIntro(data.steps.length, bw));
    data.steps.forEach((st, i) => {
      const runs = [{ text: D.step(i + 1), style: "bold" }, { text: st.t[S.lang] }];
      const textH = lineCount(runs, base) * lineH(base) + lineH(base) * 0.35;
      if (S.figures === "each" && textH + figBox(data.figure(i)).total <= ph - m.t - m.b) ensure(textH + figBox(data.figure(i)).total);
      para(runs, { keep: 2 });
      if (S.figures === "each") figure(data.figure(i), D.fig(++figNo, i + 1));
    });
    if (S.figures === "final") figure(data.figure(data.steps.length - 1), D.figFinal(++figNo));
    heading(`${++sec}. ${D.s4}`);
    const k = data.sols.length;
    if (k > 0) {
      const tn = S.resultTable ? tableNo + 1 : 0;
      para(D.res(k, tn));
      if (S.resultTable) {
        tableNo++;
        table(D.t2(tableNo), D.cols2, data.sols.map((s, i) => [String(i + 1), s.c, s.r]), [0.12, 0.5, 0.38], ["center", "center", "center"]);
      }
    } else para(D.resNone);
    if (S.conclusion || S.notes) {
      heading(`${++sec}. ${D.s5}`);
      if (S.conclusion) para(D.concl(data.code, caseName, k));
      if (S.notes) S.notes.split(/\n+/).forEach((p) => para(p));
    }
    if (S.signatures) {
      const lh = lineH(base);
      ensure(lh * 6);
      y += lh;
      const sig = (label, name) => {
        text(label + ":", m.l, y + base * PT, "normal", base);
        const lx = m.l + cw * 0.32, nw = name ? measure(name, "normal", base) + 4 : 0;
        const lw = Math.max(cw * 0.14, Math.min(cw * 0.3, cw - (lx - m.l) - nw));
        hline(lx, y + base * PT + 0.8, lx + lw, y + base * PT + 0.8, 0.2);
        text(D.sign, lx + (lw - measure(D.sign, "italic", base - 3)) / 2, y + base * PT + 4, "italic", base - 3, COLORS.soft);
        if (name) text(name, lx + lw + 4, y + base * PT, "normal", base);
        y += lh * 1.8;
      };
      sig(D.performed, S.author);
      sig(D.checked, S.supervisor);
      text(`${D.dateL}: ${dateStr}`, m.l, y + base * PT, "normal", base);
      y += lh;
    }

    /* ----- running header, footer, page numbers ----- */
    const header = S.header || D.header(data.code);
    let num = 0;
    pages.forEach((p, idx) => {
      num = idx + 1;
      if (!p.body) return;
      const small = Math.max(8, base - 3);
      if (header) {
        const hy = m.t - 6;
        p.ops.push({ t: "text", s: header, x: m.l, y: hy, style: "italic", size: small, color: COLORS.soft });
        p.ops.push({ t: "line", x1: m.l, y1: hy + 1.6, x2: m.l + cw, y2: hy + 1.6, w: 0.15, color: COLORS.faint });
      }
      const fy = ph - m.b + 9;
      if (S.footer) p.ops.push({ t: "text", s: S.footer, x: m.l, y: fy, style: "normal", size: small, color: COLORS.soft });
      if (S.pageNumbers) {
        const s = String(num), w = measure(s, "normal", small);
        p.ops.push({ t: "text", s, x: S.footer ? m.l + cw - w : m.l + (cw - w) / 2, y: fy, style: "normal", size: small, color: COLORS.soft });
      }
    });
    return { pw, ph, pages };
  }

  /* ---------- figures ---------- */
  function makeFigures(ctx, S) {
    const cache = new Map();
    const aspect = S.figView === "screen" ? Math.min(1.2, Math.max(0.45, ctx.screenAspect)) : 0.7;
    const view = S.figView === "screen" ? ctx.view : { cx: RENDER.W / 2, cy: RENDER.H / 2, z: 1 };
    const f = { small: 0.55, medium: 0.75, large: 1 }[S.figSize] || 0.75;
    return (i) => {
      if (cache.has(i)) return cache.get(i);
      const cv = document.createElement("canvas");
      cv.width = 1500; cv.height = Math.round(1500 * aspect);
      const printedMm = 170 * f;
      RENDER.drawFigure(cv, ctx.els, { steps: ctx.result.steps, step: i, view, scheme: S.figColor, grid: S.figGrid, labels: S.figLabels, dpr: cv.width / (printedMm / 0.3) });
      const fig = { id: "f" + i, canvas: cv, aspect };
      cache.set(i, fig);
      return fig;
    };
  }
  function dataFor(ctx, S) {
    const nf = (v) => { const s = (Math.round(v * 10) / 10).toFixed(1); return S.lang === "kz" ? s.replace(".", ",") : s; };
    const pair = (x, y) => `${nf(x)}; ${nf(y)}`;
    const names = CONSTRUCT.names(ctx.els);
    let np = 0, nl = 0, nc = 0;
    const given = ctx.els.map((e) => {
      if (e.t === "P") return { t: "P", name: names.P[np++], a: pair(e.x, e.y) };
      if (e.t === "L") return { t: "L", name: names.L[nl++], a: pair(e.x1, e.y1), b: pair(e.x2, e.y2) };
      const i = nc++;
      return { t: "C", name: `${names.C[i]} (${names.O[i]})`, a: pair(e.x, e.y), r: nf(e.r) };
    });
    const live = ctx.result.caseId ? APOLLO.byId[ctx.result.caseId] : null;
    return {
      code: ctx.code,
      problemName: ctx.problem.name[S.lang],
      caseName: live ? live.name[S.lang] : null,
      steps: ctx.result.steps,
      given,
      sols: ctx.result.sols.map((s) => ({ c: pair(s.x, s.y), r: nf(s.r) })),
      figure: makeFigures(ctx, S)
    };
  }

  /* ---------- backends ---------- */
  function paintPage(canvas, L, p, scale, figs) {
    const ctx2 = canvas.getContext("2d");
    canvas.width = Math.round(L.pw * scale); canvas.height = Math.round(L.ph * scale);
    ctx2.fillStyle = "#ffffff"; ctx2.fillRect(0, 0, canvas.width, canvas.height);
    ctx2.textBaseline = "alphabetic";
    p.ops.forEach((o) => {
      if (o.t === "text") {
        ctx2.font = `${o.style === "italic" ? "italic " : ""}${o.style === "bold" ? 700 : 400} ${o.size * PT * scale}px "${CANVAS_FONT}"`;
        ctx2.fillStyle = o.color; ctx2.fillText(o.s, o.x * scale, o.y * scale);
      } else if (o.t === "line") {
        ctx2.strokeStyle = o.color; ctx2.lineWidth = Math.max(0.6, o.w * scale);
        ctx2.beginPath(); ctx2.moveTo(o.x1 * scale, o.y1 * scale); ctx2.lineTo(o.x2 * scale, o.y2 * scale); ctx2.stroke();
      } else if (o.t === "rect") {
        ctx2.strokeStyle = o.color; ctx2.lineWidth = Math.max(0.5, o.wl * scale); ctx2.strokeRect(o.x * scale, o.y * scale, o.w * scale, o.h * scale);
      } else if (o.t === "img") {
        ctx2.drawImage(figs[o.fig], o.x * scale, o.y * scale, o.w * scale, o.h * scale);
      }
    });
  }
  function toPdf(L, fonts, figs) {
    const doc = newDoc(fonts, [L.pw, L.ph], L.pw > L.ph ? "landscape" : "portrait");
    const urls = {};
    L.pages.forEach((p, i) => {
      if (i > 0) doc.addPage([L.pw, L.ph], L.pw > L.ph ? "landscape" : "portrait");
      p.ops.forEach((o) => {
        if (o.t === "text") { doc.setFont(FONT, o.style); doc.setFontSize(o.size); doc.setTextColor(o.color); doc.text(o.s, o.x, o.y); }
        else if (o.t === "line") { doc.setDrawColor(o.color); doc.setLineWidth(o.w); doc.line(o.x1, o.y1, o.x2, o.y2); }
        else if (o.t === "rect") { doc.setDrawColor(o.color); doc.setLineWidth(o.wl); doc.rect(o.x, o.y, o.w, o.h); }
        else if (o.t === "img") {
          if (!urls[o.fig]) urls[o.fig] = figs[o.fig].toDataURL("image/png");
          doc.addImage(urls[o.fig], "PNG", o.x, o.y, o.w, o.h, o.fig, "FAST");
        }
      });
    });
    return doc.output("blob");
  }

  /* ---------- saving ---------- */
  let downloadsP = null;
  function downloadsCap() {
    if (!downloadsP) downloadsP = (window.claude && typeof window.claude.use === "function")
      ? Promise.race([window.claude.use("downloads").catch(() => null), new Promise((r) => setTimeout(() => r(null), 3000))])
      : Promise.resolve(null);
    return downloadsP;
  }
  async function saveFile(blob, filename) {
    const cap = await downloadsCap();
    if (cap) { await cap.save({ filename, data: blob }); return "saved"; }
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "saved";
  }

  /* ---------- dialog ---------- */
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let openState = null;

  function open(ctx) {
    close();
    downloadsCap();
    const U = UI[ctx.uiLang] || UI.kz;
    let S = loadSettings(ctx.uiLang);
    const optLabel = (v) => U.o[v] || ({ kz: "Қазақша", en: "English" }[v]) || v;
    const placeholder = (id) => {
      const D = DOC[S.lang], live = ctx.result.caseId ? APOLLO.byId[ctx.result.caseId] : null;
      const cn = live ? live.name[S.lang] : D.special;
      return { docType: D.docType, title: D.title(ctx.problem.name[S.lang]), subtitle: D.subtitle(ctx.code, cn), header: D.header(ctx.code) }[id] || "";
    };
    const field = ([, id, type, opts]) => {
      const lab = `<label for="pdf-${id}">${U.f[id]}</label>`;
      if (type === "check") return `<div class="pdf-field pdf-check"><input type="checkbox" id="pdf-${id}" ${S[id] ? "checked" : ""}>${lab}</div>`;
      if (type === "select") return `<div class="pdf-field">${lab}<select id="pdf-${id}">${opts.map((o) => `<option value="${o}" ${String(S[id]) === o ? "selected" : ""}>${esc(optLabel(o))}</option>`).join("")}</select></div>`;
      if (type === "area") return `<div class="pdf-field pdf-wide">${lab}<textarea id="pdf-${id}" rows="3">${esc(S[id])}</textarea></div>`;
      const ph = AUTO.includes(id) ? ` placeholder="${esc(placeholder(id))}" title="${esc(U.auto)}"` : "";
      return `<div class="pdf-field${AUTO.includes(id) || id === "institution" || id === "department" || id === "footer" ? " pdf-wide" : ""}">${lab}<input type="${type}" id="pdf-${id}" value="${esc(S[id])}"${ph}></div>`;
    };
    const groups = ["doc", "author", "page", "content", "fig"];
    const root = document.createElement("div");
    root.className = "pdf-modal";
    root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true"); root.setAttribute("aria-labelledby", "pdf-title");
    root.innerHTML = `
      <div class="pdf-shell">
        <header class="pdf-head">
          <h2 id="pdf-title">${U.dialog}</h2>
          <span class="mono pdf-count" id="pdf-count"></span>
          <span class="pdf-break" aria-hidden="true"></span>
          <div class="pdf-tabs" role="tablist">
            <button type="button" role="tab" id="pdf-tab-preview" aria-selected="true">${U.preview}</button>
            <button type="button" role="tab" id="pdf-tab-settings" aria-selected="false">${U.settings}</button>
          </div>
          <span class="pdf-status" id="pdf-status" aria-live="polite"></span>
          <button type="button" class="btn" id="pdf-download" disabled>${U.download}</button>
          <button type="button" class="ctrl" id="pdf-close" aria-label="${U.close}" title="${U.close}"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
        </header>
        <div class="pdf-body" data-tab="preview">
          <form class="pdf-settings" id="pdf-form">
            ${groups.map((g) => `<fieldset><legend>${U.g[g]}</legend><div class="pdf-grid">${FIELDS.filter((f) => f[0] === g).map(field).join("")}</div></fieldset>`).join("")}
            <button type="button" class="btn btn-ghost" id="pdf-reset">${U.reset}</button>
          </form>
          <section class="pdf-preview" id="pdf-preview" aria-label="${U.preview}"><p class="pdf-msg">${U.loading}</p></section>
        </div>
      </div>`;
    document.body.appendChild(root);
    document.body.classList.add("pdf-open");
    const $ = (id) => root.querySelector("#" + id);
    const status = (s) => { $("pdf-status").textContent = s || ""; };
    $("pdf-close").focus();

    let fonts = null, measureDoc = null, L = null, figs = {}, timer = 0;
    const setTab = (tab) => {
      root.querySelector(".pdf-body").dataset.tab = tab;
      $("pdf-tab-preview").setAttribute("aria-selected", String(tab === "preview"));
      $("pdf-tab-settings").setAttribute("aria-selected", String(tab === "settings"));
    };
    $("pdf-tab-preview").addEventListener("click", () => setTab("preview"));
    $("pdf-tab-settings").addEventListener("click", () => setTab("settings"));

    function render() {
      if (!fonts) return;
      const data = dataFor(ctx, S);
      L = layout(S, data, measureDoc);
      figs = {};
      L.pages.forEach((p) => p.ops.forEach((o) => { if (o.t === "img" && !figs[o.fig]) figs[o.fig] = data.figure(Number(o.fig.slice(1))).canvas; }));
      const box = $("pdf-preview");
      const cssW = Math.min(760, Math.max(240, box.clientWidth - 32));
      const scale = (cssW / L.pw) * (window.devicePixelRatio || 1);
      const frag = document.createDocumentFragment();
      L.pages.forEach((p, i) => {
        const wrap = document.createElement("figure");
        wrap.className = "pdf-page";
        const cv = document.createElement("canvas");
        cv.style.width = cssW + "px"; cv.style.aspectRatio = `${L.pw} / ${L.ph}`;
        paintPage(cv, L, p, scale, figs);
        const cap = document.createElement("figcaption");
        cap.textContent = `${i + 1} / ${L.pages.length}`;
        wrap.append(cv, cap); frag.appendChild(wrap);
      });
      const top = box.scrollTop;
      box.replaceChildren(frag);
      box.scrollTop = top;
      $("pdf-count").textContent = U.pages(L.pages.length);
      $("pdf-download").disabled = false;
    }
    const schedule = () => { clearTimeout(timer); timer = setTimeout(render, 180); };

    const form = $("pdf-form");
    const readField = (el) => {
      const id = el.id.slice(4);
      S[id] = el.type === "checkbox" ? el.checked : el.value;
      if (id === "lang") AUTO.forEach((a) => { const inp = $("pdf-" + a); if (inp) inp.placeholder = placeholder(a); });
      saveSettings(S);
      schedule();
    };
    form.addEventListener("input", (e) => { if (e.target.id && e.target.id.startsWith("pdf-")) readField(e.target); });
    form.addEventListener("change", (e) => { if (e.target.id && e.target.id.startsWith("pdf-")) readField(e.target); });
    form.addEventListener("submit", (e) => e.preventDefault());
    $("pdf-reset").addEventListener("click", () => {
      const keepAuthor = {}; ["author", "group", "institution", "department", "supervisor", "city"].forEach((k) => { keepAuthor[k] = S[k]; });
      S = Object.assign({}, DEFAULTS, { lang: ctx.uiLang, date: new Date().toISOString().slice(0, 10) }, keepAuthor);
      saveSettings(S);
      FIELDS.forEach(([, id, type]) => { const el = $("pdf-" + id); if (!el) return; if (type === "check") el.checked = !!S[id]; else el.value = S[id]; });
      AUTO.forEach((a) => { $("pdf-" + a).placeholder = placeholder(a); });
      schedule();
    });

    $("pdf-download").addEventListener("click", async () => {
      if (!L) return;
      const btn = $("pdf-download");
      btn.disabled = true; status(U.building);
      try {
        await new Promise((r) => setTimeout(r, 30));
        const blob = toPdf(L, fonts, figs);
        const live = ctx.result.caseId || "special";
        const res = await saveFile(blob, `Apollonius_${ctx.code}_${live}_${S.date || "doc"}.pdf`);
        status(res === "saved" ? U.saved : "");
      } catch (e) {
        status(e && e.code === "declined" ? U.declined : U.failed);
      } finally { btn.disabled = false; }
    });

    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    $("pdf-close").addEventListener("click", close);
    root.addEventListener("mousedown", (e) => { if (e.target === root) close(); });
    const ro = new ResizeObserver(() => schedule());
    ro.observe($("pdf-preview"));
    openState = { root, cleanup: () => { document.removeEventListener("keydown", onKey); ro.disconnect(); clearTimeout(timer); } };

    prepare().then((f) => {
      if (!openState || openState.root !== root) return;
      fonts = f;
      measureDoc = newDoc(f, "a4", "portrait");
      render();
    }).catch(() => { $("pdf-preview").innerHTML = `<p class="pdf-msg">${U.loadFail}</p>`; });
  }

  function close() {
    if (!openState) return;
    openState.cleanup();
    openState.root.remove();
    openState = null;
    document.body.classList.remove("pdf-open");
    const b = document.getElementById("pdf-open");
    if (b) b.focus();
  }

  return { open, close, isOpen: () => !!openState };
})();
