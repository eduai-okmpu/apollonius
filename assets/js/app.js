/* Views and routing. Routes: #home, #case-ppl, #build-ppl-same-side */
(function () {
  const { PROBLEMS, CASES, byId, canonical } = window.APOLLO;
  const view = document.getElementById("view");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Language ---------- */
  let lang = "kz";
  try { const s = localStorage.getItem("apollo-lang"); if (s === "kz" || s === "en") lang = s; } catch (e) {}
  const t = (k, vars) => {
    let s = (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
    if (vars) Object.keys(vars).forEach((v) => { s = s.replace("{" + v + "}", vars[v]); });
    return s;
  };
  const tx = (obj) => obj[lang] || obj.en;
  const solText = (v) => v.n === 0 ? t("sol0") : v.upTo ? t("solUpTo", { n: v.n }) : (v.n === 1 && lang === "en" ? "1 solution" : t("solN", { n: v.n }));

  function applyStatic() {
    document.documentElement.lang = lang === "kz" ? "kk" : "en";
    document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll(".lang button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  document.querySelectorAll(".lang button").forEach((b) => b.addEventListener("click", () => {
    if (lang === b.dataset.lang) return;
    lang = b.dataset.lang;
    try { localStorage.setItem("apollo-lang", lang); } catch (e) {}
    applyStatic(); route(true);
  }));

  /* ---------- Icons ---------- */
  const ICON = {
    P: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>',
    L: '<svg viewBox="0 0 24 24" aria-hidden="true"><line x1="3" y1="18" x2="21" y2="6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    C: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>',
    compass: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="4.5" r="1.8"/><path d="M11 6.2 5.5 20M13 6.2 18.5 20M7.6 14.5h8.8"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><path d="M3 15.5 15.5 3 21 8.5 8.5 21z"/></svg>',
    back: '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>'
  };

  /* ---------- Canvas bookkeeping ---------- */
  let cleanups = [];
  const onCleanup = (fn) => cleanups.push(fn);
  let redrawAll = () => {};
  const ro = new ResizeObserver(() => redrawAll());
  const refreshTheme = () => { RENDER.readPalette(); redrawAll(); };
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refreshTheme);
  new MutationObserver(refreshTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => redrawAll());

  function thumbs() {
    const list = [...view.querySelectorAll("canvas[data-thumb]")];
    const draw = () => list.forEach((cv) => RENDER.drawThumb(cv, byId[cv.dataset.thumb].els));
    list.forEach((cv) => ro.observe(cv));
    return draw;
  }

  /* ---------- Stepper ---------- */
  function setStage(stage) {
    const order = ["home", "case", "build"], idx = order.indexOf(stage);
    document.querySelectorAll("#stepper li").forEach((li) => {
      const i = order.indexOf(li.dataset.stage);
      li.classList.toggle("is-current", i === idx);
      li.classList.toggle("is-done", i < idx);
      if (i === idx) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
  }

  /* ---------- Home ---------- */
  let picked = ["P", "L", "C"];

  function viewHome() {
    setStage("home");
    const slot = (n) => `
      <fieldset class="slot">
        <legend>${t("slot" + (n + 1))}</legend>
        <div class="slot-options">
          ${["P", "L", "C"].map((k) => `
            <div class="opt">
              <input type="radio" name="slot${n}" id="slot${n}-${k}" value="${k}" ${picked[n] === k ? "checked" : ""}>
              <label for="slot${n}-${k}">${ICON[k]}<span>${t(k)}</span></label>
            </div>`).join("")}
        </div>
      </fieldset>`;

    view.innerHTML = `
      <section class="wrap hero">
        <div class="hero-text">
          <span class="eyebrow">${t("heroEyebrow")}</span>
          <h1>${t("heroTitle")}</h1>
          <p class="lead">${t("heroLead")}</p>
          <div class="hero-actions">
            <a class="btn" href="#pick" data-scroll="pick">${t("heroCta")}</a>
            <a class="btn btn-ghost" href="#problems" data-scroll="problems">${t("heroAll")}</a>
          </div>
        </div>
        <figure class="sheet figure">
          <canvas id="hero-canvas" aria-label="${t("heroFig")}"></canvas>
          <figcaption><span>${t("heroFig")}</span><b id="hero-count">8 ${t("heroFigCount")}</b></figcaption>
        </figure>
      </section>

      <section class="wrap" id="pick">
        <div class="section-head">
          <span class="eyebrow">${t("pickEyebrow")}</span>
          <h2>${t("pickTitle")}</h2>
          <p>${t("pickLead")}</p>
        </div>
        <div class="sheet picker">
          <div class="slots">${[0, 1, 2].map(slot).join("")}</div>
          <div class="picker-result" aria-live="polite">
            <canvas id="pick-canvas" aria-hidden="true"></canvas>
            <span class="code" id="pick-code"></span>
            <h3 id="pick-name"></h3>
            <span class="picker-meta" id="pick-meta"></span>
            <a class="btn" id="pick-go" href="#home">${t("pickShow")}</a>
          </div>
        </div>
      </section>

      <section class="wrap" id="problems">
        <div class="section-head">
          <span class="eyebrow">${t("allEyebrow")}</span>
          <h2>${t("allTitle")}</h2>
          <p>${t("allLead")}</p>
        </div>
        <div class="grid">
          ${PROBLEMS.map((p) => `
            <a class="card" href="#case-${p.code.toLowerCase()}">
              <canvas data-thumb="${CASES[p.code][0].id}" aria-hidden="true"></canvas>
              <div class="card-body">
                <span class="code">${p.code}</span>
                <span class="card-title">${tx(p.name)}</span>
                <span class="picker-meta">${CASES[p.code].length} ${t("pickCases")}</span>
              </div>
            </a>`).join("")}
        </div>
      </section>`;

    view.querySelectorAll("[data-scroll]").forEach((a) => a.addEventListener("click", (ev) => {
      ev.preventDefault();
      document.getElementById(a.dataset.scroll).scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }));

    const pickCanvas = document.getElementById("pick-canvas");
    const updatePick = () => {
      const code = canonical(picked);
      const p = PROBLEMS.find((x) => x.code === code);
      document.getElementById("pick-code").textContent = code;
      document.getElementById("pick-name").textContent = tx(p.name);
      document.getElementById("pick-meta").textContent = `${CASES[code].length} ${t("pickCases")}`;
      document.getElementById("pick-go").setAttribute("href", "#case-" + code.toLowerCase());
      RENDER.drawScene(pickCanvas, CASES[code][0].els, { labels: true });
    };
    view.querySelectorAll(".slot input").forEach((inp) => inp.addEventListener("change", () => {
      picked[Number(inp.name.slice(4))] = inp.value; updatePick();
    }));

    const heroCanvas = document.getElementById("hero-canvas");
    const countEl = document.getElementById("hero-count");
    let raf = 0, t0 = performance.now(), last = -1;
    const frame = (now) => {
      const n = RENDER.hero(heroCanvas, reduceMotion ? 0 : (now - t0) / 1000);
      if (n !== last) { countEl.textContent = `${n} ${t("heroFigCount")}`; last = n; }
      if (!reduceMotion) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    onCleanup(() => cancelAnimationFrame(raf));

    const drawThumbs = thumbs();
    ro.observe(pickCanvas); ro.observe(heroCanvas);
    redrawAll = () => { drawThumbs(); updatePick(); if (reduceMotion) RENDER.hero(heroCanvas, 0); };
    redrawAll();
  }

  /* ---------- Cases ---------- */
  function viewCases(code) {
    setStage("case");
    const p = PROBLEMS.find((x) => x.code === code);
    view.innerHTML = `
      <section class="wrap">
        <div class="page-head">
          <a class="crumb" href="#home">${ICON.back}${t("backHome")}</a>
          <span class="code">${code}</span>
          <h1>${tx(p.name)}</h1>
          <p>${t("casesLead")}</p>
        </div>
        <div class="grid variants">
          ${CASES[code].map((v) => `
            <a class="card" href="#build-${v.id}">
              <canvas data-thumb="${v.id}" aria-hidden="true"></canvas>
              <div class="card-body">
                <span class="card-title">${tx(v.name)}</span>
                <div class="card-foot">
                  <span class="count${v.n === 0 ? " is-zero" : ""}">${solText(v)}</span>
                </div>
              </div>
            </a>`).join("")}
        </div>
      </section>`;
    redrawAll = thumbs();
    redrawAll();
  }

  /* ---------- Construction ---------- */
  function viewBuild(v) {
    setStage("build");
    const code = v.id.split("-")[0].toUpperCase();
    const p = PROBLEMS.find((x) => x.code === code);
    let els = JSON.parse(JSON.stringify(v.els));
    let step = 0, active = null, result = CONSTRUCT.run(code, els), sig = "";

    view.innerHTML = `
      <section class="wrap">
        <div class="page-head">
          <a class="crumb" href="#case-${code.toLowerCase()}">${ICON.back}${t("backCases")} · ${tx(p.name)}</a>
          <span class="code">${code}</span>
          <h1>${tx(v.name)}</h1>
          <div class="legend">
            <span><i class="swatch"></i>${t("legendGiven")}</span>
            <span><i class="swatch pencil"></i>${t("legendPencil")}</span>
            <span><i class="swatch answer"></i>${t("legendAnswer")}</span>
          </div>
        </div>
        <div class="build">
          <aside class="sheet steps-panel">
            <div class="tools" aria-label="${t("tools")}">
              <span class="tool">${ICON.compass}${t("compass")}</span>
              <span class="tool">${ICON.ruler}${t("straightedge")}</span>
            </div>
            <h2 class="eyebrow">${t("stepsTitle")}</h2>
            <ol class="steps" id="steps"></ol>
            <div class="step-nav">
              <button type="button" class="btn btn-ghost" id="prev">${t("prev")}</button>
              <span class="mono" id="step-of"></span>
              <button type="button" class="btn" id="next">${t("next")}</button>
            </div>
          </aside>
          <div class="sheet board">
            <div class="status" aria-live="polite">
              <span class="status-case"><span class="eyebrow">${t("liveCase")}</span><b id="live-case"></b></span>
              <span class="count" id="live-count"></span>
            </div>
            <canvas id="board" aria-label="${tx(v.name)}"></canvas>
            <div class="board-bar">
              <span>${t("dragHint")}</span>
              <button type="button" class="btn btn-ghost" id="reset">${t("reset")}</button>
            </div>
          </div>
        </div>
      </section>`;

    const board = document.getElementById("board");
    const list = document.getElementById("steps");
    const draw = () => RENDER.drawScene(board, els, { labels: true, handles: true, active, steps: result.steps, step });

    function renderList() {
      list.innerHTML = result.steps.map((s, i) => `
        <li class="step-row"><button type="button" class="step" id="step-${i}" data-i="${i}">
          <span class="n">${i + 1}</span>
          <span class="step-text">${tx(s.t)}</span>
        </button>${s.ref ? `<a class="step-ref" href="#case-${s.ref.toLowerCase()}">${t("openProblem")} ${s.ref} →</a>` : ""}</li>`).join("");
      list.querySelectorAll(".step").forEach((b) => b.addEventListener("click", () => { step = Number(b.dataset.i); sync(); }));
    }
    function info() {
      const live = result.caseId ? byId[result.caseId] : null;
      const el = document.getElementById("live-case");
      el.textContent = live ? tx(live.name) : t("liveSpecial");
      el.classList.toggle("is-changed", !!live && live.id !== v.id);
      const k = result.sols.length, c = document.getElementById("live-count");
      c.textContent = k === 0 ? t("sol0") : t("found", { n: k });
      c.classList.toggle("is-zero", k === 0);
    }
    function sync() {
      const nextSig = lang + result.steps.map((s) => s.t.en).join("|");
      if (nextSig !== sig) { sig = nextSig; renderList(); }
      step = Math.min(step, result.steps.length - 1);
      list.querySelectorAll(".step").forEach((b) => {
        const i = Number(b.dataset.i);
        b.classList.toggle("is-active", i === step);
        b.classList.toggle("is-past", i < step);
        if (i === step) b.setAttribute("aria-current", "step"); else b.removeAttribute("aria-current");
      });
      document.getElementById("step-of").textContent = t("stepOf", { i: step + 1, n: result.steps.length });
      document.getElementById("prev").disabled = step === 0;
      document.getElementById("next").disabled = step === result.steps.length - 1;
      info();
      draw();
    }
    const recompute = () => { result = CONSTRUCT.run(code, els); sync(); };
    const go = (i) => {
      step = i; sync();
      const btn = document.getElementById("step-" + step);
      if (btn && window.matchMedia("(min-width: 981px)").matches) btn.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
    };
    document.getElementById("prev").addEventListener("click", () => { if (step > 0) go(step - 1); });
    document.getElementById("next").addEventListener("click", () => { if (step < result.steps.length - 1) go(step + 1); });
    document.getElementById("reset").addEventListener("click", () => { els = JSON.parse(JSON.stringify(v.els)); recompute(); });
    const onKey = (ev) => {
      if (ev.target.closest("input, textarea")) return;
      if (ev.key === "ArrowRight" && step < result.steps.length - 1) go(step + 1);
      if (ev.key === "ArrowLeft" && step > 0) go(step - 1);
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));

    /* Dragging */
    let drag = null, pending = false;
    const toWorld = (ev) => {
      const r = board.getBoundingClientRect();
      return { x: ((ev.clientX - r.left) / r.width) * RENDER.W, y: ((ev.clientY - r.top) / r.height) * RENDER.H };
    };
    const tol = () => (14 / board.getBoundingClientRect().width) * RENDER.W;
    const clamp = (q) => ({ x: Math.min(RENDER.W - 1, Math.max(1, q.x)), y: Math.min(RENDER.H - 1, Math.max(1, q.y)) });
    board.addEventListener("pointerdown", (ev) => {
      const q = toWorld(ev), h = RENDER.hit(els, q.x, q.y, tol());
      if (!h) return;
      drag = { ...h, last: q }; active = h.i;
      board.setPointerCapture(ev.pointerId); draw();
    });
    board.addEventListener("pointermove", (ev) => {
      const q = clamp(toWorld(ev));
      if (!drag) { board.style.cursor = RENDER.hit(els, q.x, q.y, tol()) ? "grab" : "default"; return; }
      board.style.cursor = "grabbing";
      const e = els[drag.i], dx = q.x - drag.last.x, dy = q.y - drag.last.y;
      if (drag.part === "p" || drag.part === "center") { e.x = q.x; e.y = q.y; }
      else if (drag.part === "a") { if (GEO.dist(q.x, q.y, e.x2, e.y2) > 3) { e.x1 = q.x; e.y1 = q.y; } }
      else if (drag.part === "b") { if (GEO.dist(q.x, q.y, e.x1, e.y1) > 3) { e.x2 = q.x; e.y2 = q.y; } }
      else if (drag.part === "line") { e.x1 += dx; e.y1 += dy; e.x2 += dx; e.y2 += dy; }
      else if (drag.part === "rim") { e.r = Math.max(2, GEO.dist(e.x, e.y, q.x, q.y)); }
      drag.last = q;
      if (!pending) { pending = true; requestAnimationFrame(() => { pending = false; recompute(); }); }
    });
    const end = () => { if (!drag) return; drag = null; active = null; board.style.cursor = "grab"; draw(); };
    board.addEventListener("pointerup", end);
    board.addEventListener("pointercancel", end);

    ro.observe(board);
    redrawAll = draw;
    sync();
  }

  /* ---------- Router ---------- */
  function route(keepScroll) {
    cleanups.forEach((f) => f()); cleanups = [];
    ro.disconnect();
    const h = (location.hash || "#home").slice(1);
    let m;
    if (h === "home" || h === "" || h === "pick" || h === "problems") viewHome();
    else if ((m = h.match(/^case-([plc]{3})$/)) && CASES[m[1].toUpperCase()]) viewCases(m[1].toUpperCase());
    else if ((m = h.match(/^build-(.+)$/)) && byId[m[1]]) viewBuild(byId[m[1]]);
    else {
      setStage("home");
      view.innerHTML = `<section class="wrap"><div class="page-head"><a class="crumb" href="#home">${ICON.back}${t("backHome")}</a><p>${t("notFound")}</p></div></section>`;
      redrawAll = () => {};
    }
    if (!keepScroll) window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", () => route(false));
  RENDER.readPalette();
  applyStatic();
  route(true);
})();
