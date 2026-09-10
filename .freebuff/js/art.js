/* ═══════════════════════════════════════════════════════════
   AURORA — Generative art engine
   Six procedural renderers · seeded RNG · zero image assets
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  /* ── seeded RNG ───────────────────────────────────────── */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ── palette ──────────────────────────────────────────── */
  var PALETTES = {
    violet: ["#7c3aed", "#06b6d4", "#f0abfc", "#fbbf24", "#eaeaf2"],
    ember:  ["#ff6b35", "#f7c59f", "#efefd0", "#004e89", "#1a659e"],
    jade:   ["#0fd6a0", "#0a7ea4", "#b8f2e6", "#f45b69", "#5c0029"],
    solar:  ["#ffd166", "#ef476f", "#06d6a0", "#118ab2", "#f8f9fa"],
    mono:   ["#eaeaf2", "#9a9ab0", "#5c5c74", "#7c3aed", "#ffffff"]
  };

  function fitCanvas(canvas) {
    var r = canvas.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(2, Math.round((r.width || 300) * dpr));
    var h = Math.max(2, Math.round((r.height || 200) * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
    }
    return { w: w, h: h, dpr: dpr };
  }

  /* ── renderer 1: flow field ───────────────────────────── */
  function flowField(ctx, w, h, rnd, pal) {
    ctx.fillStyle = "#05050c"; ctx.fillRect(0, 0, w, h);
    var cols = pal.colors;
    var lines = 900;
    for (var i = 0; i < lines; i++) {
      var x = rnd() * w, y = rnd() * h;
      var hue = cols[(rnd() * cols.length) | 0];
      ctx.strokeStyle = hue;
      ctx.globalAlpha = 0.05 + rnd() * 0.16;
      ctx.lineWidth = 0.6 + rnd() * 2.2;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (var s = 0; s < 60; s++) {
        var a = Math.sin(x * 0.004 + Math.cos(y * 0.003) * 2.4) * Math.PI +
                Math.cos(y * 0.0026 - x * 0.0012) * 2.2;
        x += Math.cos(a) * 3.2; y += Math.sin(a) * 3.2;
        if (x < -40 || x > w + 40 || y < -40 || y > h + 40) break;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    var g = ctx.createRadialGradient(w * 0.5, h * 0.42, 0, w * 0.5, h * 0.42, w * 0.6);
    g.addColorStop(0, "rgba(124,58,237,0.20)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  /* ── renderer 2: chromatic rings ──────────────────────── */
  function rings(ctx, w, h, rnd, pal) {
    ctx.fillStyle = "#04040a"; ctx.fillRect(0, 0, w, h);
    var cx = w * (0.3 + rnd() * 0.4), cy = h * (0.3 + rnd() * 0.4);
    var cols = pal.colors;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 46; i++) {
      var r = (i / 46) * Math.max(w, h) * 0.75 + rnd() * 12;
      ctx.beginPath();
      ctx.strokeStyle = cols[i % cols.length];
      ctx.globalAlpha = 0.05 + 0.30 * (1 - i / 46);
      ctx.lineWidth = 1 + rnd() * 3.4;
      var wob = rnd() * 30;
      for (var a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 48) {
        var rr = r + Math.sin(a * (3 + (i % 5)) + i) * wob;
        var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.5);
    g.addColorStop(0, "rgba(6,182,212,0.35)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  /* ── renderer 3: wave interference ────────────────────── */
  function interference(ctx, w, h, rnd, pal) {
    ctx.fillStyle = "#05050e"; ctx.fillRect(0, 0, w, h);
    var cols = pal.colors;
    var src = [];
    for (var i = 0; i < 4; i++) src.push({ x: rnd() * w, y: rnd() * h, f: 0.015 + rnd() * 0.03 });
    var step = Math.max(4, Math.floor(w / 220));
    ctx.globalCompositeOperation = "lighter";
    for (var y = 0; y < h; y += step) {
      for (var x = 0; x < w; x += step) {
        var v = 0;
        for (var s = 0; s < src.length; s++) {
          var dx = x - src[s].x, dy = y - src[s].y;
          v += Math.sin(Math.sqrt(dx * dx + dy * dy) * src[s].f);
        }
        var n = (v / src.length + 1) / 2;
        if (n > 0.62) {
          ctx.fillStyle = cols[(n * cols.length) | 0] || cols[0];
          ctx.globalAlpha = (n - 0.62) * 1.8;
          ctx.fillRect(x, y, step * 0.8, step * 0.8);
        }
      }
    }
    ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
  }

  /* ── renderer 4: nebula clouds ────────────────────────── */
  function nebula(ctx, w, h, rnd, pal) {
    ctx.fillStyle = "#030309"; ctx.fillRect(0, 0, w, h);
    var cols = pal.colors;
    ctx.globalCompositeOperation = "lighter";
    for (var i = 0; i < 130; i++) {
      var x = rnd() * w, y = rnd() * h;
      var r = 20 + rnd() * Math.max(w, h) * 0.22;
      var g = ctx.createRadialGradient(x, y, 0, x, y, r);
      var c = cols[(rnd() * cols.length) | 0];
      g.addColorStop(0, hexA(c, 0.05 + rnd() * 0.10));
      g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    /* starfield */
    for (var s = 0; s < 240; s++) {
      ctx.globalAlpha = 0.25 + rnd() * 0.75;
      ctx.fillStyle = "#ffffff";
      var sz = rnd() < 0.92 ? 1 : 2;
      ctx.fillRect(rnd() * w, rnd() * h, sz, sz);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── renderer 5: circuit bloom ────────────────────────── */
  function circuit(ctx, w, h, rnd, pal) {
    ctx.fillStyle = "#04040b"; ctx.fillRect(0, 0, w, h);
    var cols = pal.colors;
    var nodes = [];
    for (var i = 0; i < 42; i++) nodes.push({ x: rnd() * w, y: rnd() * h });
    ctx.lineWidth = 1;
    for (var a = 0; a < nodes.length; a++) {
      var near = [];
      for (var b = 0; b < nodes.length; b++) {
        if (a === b) continue;
        var d = Math.hypot(nodes[a].x - nodes[b].x, nodes[a].y - nodes[b].y);
        near.push({ b: b, d: d });
      }
      near.sort(function (p, q) { return p.d - q.d; });
      for (var k = 0; k < 2; k++) {
        var n = near[k];
        ctx.strokeStyle = hexA(cols[k % 2], 0.5);
        ctx.beginPath();
        var mx = (nodes[a].x + nodes[n.b].x) / 2, my = (nodes[a].y + nodes[n.b].y) / 2;
        ctx.moveTo(nodes[a].x, nodes[a].y);
        ctx.lineTo(mx + (rnd() - 0.5) * 30, my + (rnd() - 0.5) * 30);
        ctx.lineTo(nodes[n.b].x, nodes[n.b].y);
        ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = "lighter";
    for (var j = 0; j < nodes.length; j++) {
      var c = cols[(rnd() * cols.length) | 0];
      var rr = 1.5 + rnd() * 5;
      var g = ctx.createRadialGradient(nodes[j].x, nodes[j].y, 0, nodes[j].x, nodes[j].y, rr * 6);
      g.addColorStop(0, hexA(c, 0.9)); g.addColorStop(1, hexA(c, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(nodes[j].x, nodes[j].y, rr * 6, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  /* ── renderer 6: grid pulse ───────────────────────────── */
  function gridPulse(ctx, w, h, rnd, pal) {
    ctx.fillStyle = "#050510"; ctx.fillRect(0, 0, w, h);
    var cols = pal.colors;
    var cell = Math.max(14, Math.floor(w / 42));
    var ph = rnd() * 10;
    for (var y = 0; y < h; y += cell) {
      for (var x = 0; x < w; x += cell) {
        var d = Math.hypot(x - w / 2, y - h / 2) / Math.max(w, h);
        var v = Math.sin(d * 18 - ph) * 0.5 + 0.5;
        v = Math.pow(v, 2.2);
        if (v < 0.06) continue;
        var c = cols[(v * cols.length) | 0] || cols[0];
        ctx.fillStyle = hexA(c, v * 0.85);
        var pad = cell * (1 - v) * 0.42;
        ctx.fillRect(x + pad, y + pad, cell - pad * 2, cell - pad * 2);
      }
    }
    var g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.55);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(3,3,8,0.8)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }

  function hexA(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return "rgba(" + ((n >> 16) & 255) + "," + ((n >> 8) & 255) + "," + (n & 255) + "," + a + ")";
  }

  var RENDERERS = {
    flow: flowField, rings: rings, interference: interference,
    nebula: nebula, circuit: circuit, grid: gridPulse
  };

  function renderArt(canvas, type, seed, palette) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var size = fitCanvas(canvas);
    var rnd = mulberry32(seed);
    var pal = { colors: PALETTES[palette] || PALETTES.violet };
    (RENDERERS[type] || flowField)(ctx, size.w, size.h, rnd, pal);
  }

  /* ── content data ─────────────────────────────────────── */
  var WORK = [
    { title: "Helios Commerce", tag: "WebGL · E-commerce", type: "flow",         seed: 1137, pal: "violet",  desc: "A product configurator rendered entirely in real time — 40 materials, zero photos, +212% add-to-cart.", facts: [["Stack", "Three.js · GLSL"], ["Timeline", "8 weeks"], ["Result", "+212% conversion"], ["Awards", "FWA of the Day"]] },
    { title: "Vantar Identity", tag: "Generative brand",    type: "rings",        seed: 4421, pal: "solar",   desc: "A living identity system: every export of the logo is unique, grown from the client's founding date as seed.", facts: [["Deliverable", "Brand OS"], ["Outputs", "∞ unique marks"], ["Timeline", "6 weeks"], ["Used by", "12 teams"]] },
    { title: "Polyphonic Player", tag: "Audio-reactive",    type: "interference", seed: 9254, pal: "ember",   desc: "A music player where every track owns a physics signature — wave interference driven by FFT data.", facts: [["Stack", "WebAudio · Canvas"], ["Latency", "<16ms"], ["Tracks", "2.4M catalog"], ["Partner", "Polyphonic"]] },
    { title: "Kosmiska Atlas", tag: "Data viz · 3D",        type: "nebula",       seed: 6180, pal: "jade",    desc: "An interactive atlas of 120k exoplanets with orbital simulation and cinematic camera moves.", facts: [["Data", "120k objects"], ["Renderer", "Custom WebGL"], ["Timeline", "10 weeks"], ["Awards", "Awwwards SOTD"]] },
    { title: "Mireau Couture", tag: "Fashion · Scroll",     type: "circuit",      seed: 7702, pal: "mono",    desc: "Scroll-choreographed couture showcase with cloth-sim transitions and a lookbook that edits itself.", facts: [["Stack", "GSAP · WebGL"], ["Scenes", "9 sequences"], ["Timeline", "7 weeks"], ["Result", "3.1M launch week"]] },
    { title: "Nimbus Ops", tag: "SaaS · Interface",         type: "grid",         seed: 3356, pal: "violet",  desc: "An ops dashboard reimagined as a command surface — GPU-accelerated charts at 120k points per view.", facts: [["Data", "120k pts/frame"], ["Stack", "WebGL2 · React"], ["Timeline", "12 weeks"], ["Result", "−38% task time"]] }
  ];

  var LAB = [
    { tag: "Field study 01", type: "flow",         seed: 811,  pal: "violet", title: "Vector fields" },
    { tag: "Field study 02", type: "rings",        seed: 1522, pal: "jade",   title: "Chromatic echoes" },
    { tag: "Field study 03", type: "interference", seed: 2733, pal: "solar",  title: "Wave physics" },
    { tag: "Field study 04", type: "nebula",       seed: 3944, pal: "violet", title: "Deep clouds" },
    { tag: "Field study 05", type: "circuit",      seed: 5155, pal: "ember",  title: "Signal routing" },
    { tag: "Field study 06", type: "grid",         seed: 6366, pal: "mono",   title: "Pulse matrix" }
  ];

  /* ── build work grid ──────────────────────────────────── */
  function buildWork() {
    var grid = document.getElementById("workGrid");
    if (!grid) return;
    WORK.forEach(function (p, i) {
      var card = document.createElement("article");
      card.className = "work-card";
      card.setAttribute("data-reveal", "");
      card.setAttribute("data-cursor", "open");
      card.style.setProperty("--d", (i % 2) * 0.12 + "s");
      card.innerHTML =
        '<canvas></canvas>' +
        '<div class="work-info"><div><h3>' + p.title + "</h3><p>" + p.tag + "</p></div>" +
        '<span class="work-view">↗</span></div>';
      grid.appendChild(card);
      var cv = card.querySelector("canvas");
      renderArt(cv, p.type, p.seed, p.pal);
      if (window.AuroraUI) AuroraUI.observeReveal(card);
      card.addEventListener("click", function () { openProject(i); });
    });
  }

  /* ── carousel ─────────────────────────────────────────── */
  var carIndex = 0, carTrack, carDots, carSlides = [];

  function buildCarousel() {
    carTrack = document.getElementById("carouselTrack");
    carDots = document.getElementById("carouselDots");
    if (!carTrack) return;
    LAB.forEach(function (s) {
      var el = document.createElement("div");
      el.className = "slide";
      el.innerHTML = '<canvas></canvas><div class="slide-meta">' + s.tag + " — " + s.title + "</div>";
      carTrack.appendChild(el);
      var cv = el.querySelector("canvas");
      carSlides.push(cv);
      renderArt(cv, s.type, s.seed, s.pal);
    });
    LAB.forEach(function (_, i) {
      var d = document.createElement("button");
      d.setAttribute("aria-label", "Slide " + (i + 1));
      if (i === 0) d.classList.add("on");
      d.addEventListener("click", function () { goSlide(i); });
      carDots.appendChild(d);
    });
    goSlide(0);
  }

  function goSlide(i) {
    carIndex = (i + LAB.length) % LAB.length;
    var el = carTrack.children[0];
    if (!el) return;
    var gap = 18;
    var x = carIndex * (el.getBoundingClientRect().width + gap);
    carTrack.style.transform = "translateX(" + -x + "px)";
    Array.prototype.forEach.call(carDots.children, function (d, di) {
      d.classList.toggle("on", di === carIndex);
    });
  }

  function openProject(i) {
    var p = WORK[i];
    var modal = document.getElementById("modal");
    if (!modal || !p) return;
    document.getElementById("modalKicker").textContent = p.tag;
    document.getElementById("modalTitle").textContent = p.title;
    document.getElementById("modalDesc").textContent = p.desc;
    document.getElementById("modalFacts").innerHTML = p.facts.map(function (f) {
      return "<li><span>" + f[0] + "</span><b>" + f[1] + "</b></li>";
    }).join("");
    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
    requestAnimationFrame(function () {
      renderArt(document.getElementById("modalCanvas"), p.type, p.seed, p.pal);
    });
  }

  /* ── resize rerenders (debounced) ─────────────────────── */
  var rt;
  window.addEventListener("resize", function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      document.querySelectorAll(".work-card canvas").forEach(function (cv, i) {
        renderArt(cv, WORK[i].type, WORK[i].seed, WORK[i].pal);
      });
      carSlides.forEach(function (cv, i) {
        renderArt(cv, LAB[i].type, LAB[i].seed, LAB[i].pal);
      });
      var m = document.getElementById("modal");
      if (m && m.classList.contains("open")) {
        /* modal rerenders on open; fine to skip here */
      }
    }, 220);
  });

  /* ── carousel arrows wiring lives here too ────────────── */
  function initControls() {
    var prev = document.getElementById("cPrev"), next = document.getElementById("cNext");
    if (prev) prev.addEventListener("click", function () { goSlide(carIndex - 1); });
    if (next) next.addEventListener("click", function () { goSlide(carIndex + 1); });
    var close = document.getElementById("modalClose");
    var backdrop = document.getElementById("modalBackdrop");
    var modal = document.getElementById("modal");
    function closeModal() {
      modal.classList.remove("open");
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("locked");
    }
    if (close) close.addEventListener("click", closeModal);
    if (backdrop) backdrop.addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
    });
  }

  window.AuroraArt = {
    init: function () { buildWork(); buildCarousel(); initControls(); },
    renderArt: renderArt,
    openProject: openProject,
    WORK: WORK
  };
})();
