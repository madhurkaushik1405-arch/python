/* ═══════════════════════════════════════════════════════════
   AURORA — UI engine
   cursor · preloader · scramble · reveals · tilt · counters
   form · toast · marquee · nav
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ── preloader ────────────────────────────────────────── */
  function initPreloader() {
    var pre = document.getElementById("preloader");
    var fill = document.getElementById("preloaderFill");
    var pct = document.getElementById("preloaderPct");
    var p = 0;
    var iv = setInterval(function () {
      p = Math.min(100, p + Math.random() * 16 + 6);
      fill.style.width = p + "%";
      pct.textContent = String(Math.floor(p)).padStart(2, "0");
      if (p >= 100) {
        clearInterval(iv);
        setTimeout(function () {
          pre.classList.add("done");
          document.body.classList.add("loaded");
          setTimeout(function () { pre.style.display = "none"; }, 900);
        }, 350);
      }
    }, 130);
  }

  /* ── custom cursor ────────────────────────────────────── */
  function initCursor() {
    if (!fine) return;
    var dot = document.getElementById("cursorDot");
    var ring = document.getElementById("cursorRing");
    var label = document.getElementById("cursorLabel");
    var x = -100, y = -100, rx = -100, ry = -100;

    window.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
    }, { passive: true });

    (function loop() {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.style.transform = "translate(" + x + "px," + y + "px) translate(-50%,-50%)";
      ring.style.transform = "translate(" + rx + "px," + ry + "px) translate(-50%,-50%)";
      requestAnimationFrame(loop);
    })();

    document.addEventListener("mouseover", function (e) {
      var t = e.target.closest("[data-cursor]");
      if (t) {
        label.textContent = t.getAttribute("data-cursor");
        ring.classList.add("hovering");
      } else {
        ring.classList.remove("hovering");
        label.textContent = "";
      }
    });
  }

  /* ── magnetic buttons ─────────────────────────────────── */
  function initMagnetic() {
    if (!fine || reduced) return;
    document.querySelectorAll(".btn").forEach(function (b) {
      b.addEventListener("mousemove", function (e) {
        var r = b.getBoundingClientRect();
        var mx = e.clientX - r.left - r.width / 2;
        var my = e.clientY - r.top - r.height / 2;
        b.style.transform = "translate(" + mx * 0.18 + "px," + (my * 0.22 - 2) + "px)";
      });
      b.addEventListener("mouseleave", function () { b.style.transform = ""; });
    });
  }

  /* ── scramble text on hero lines ──────────────────────── */
  function initScramble() {
    if (reduced) return;
    var chars = "AURORA#%&/\\@$◆";
    document.querySelectorAll(".hero-title .word").forEach(function (w, wi) {
      var final = w.textContent;
      var revealed = 0;
      setTimeout(function () {
        var iv = setInterval(function () {
          revealed += 1;
          var out = "";
          for (var i = 0; i < final.length; i++) {
            out += i < revealed ? final[i] : chars[(Math.random() * chars.length) | 0];
          }
          w.textContent = out;
          if (revealed >= final.length) { clearInterval(iv); w.textContent = final; }
        }, 46);
      }, 500 + wi * 220);
    });
  }

  /* ── scroll reveals ───────────────────────────────────── */
  var revealIO = null;
  function initReveals() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduced) {
      els.forEach(function (e) { e.classList.add("in"); });
      return;
    }
    revealIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          revealIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (e) { revealIO.observe(e); });
  }
  function observeReveal(el) {
    if (revealIO) revealIO.observe(el);
    else el.classList.add("in");
  }

  /* ── tilt cards ───────────────────────────────────────── */
  function initTilt() {
    if (!fine || reduced) return;
    document.querySelectorAll(".tilt").forEach(function (card) {
      var raf = null;
      card.addEventListener("mousemove", function (e) {
        if (raf) return;
        raf = requestAnimationFrame(function () {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          card.style.transform =
            "perspective(900px) rotateY(" + px * 7 + "deg) rotateX(" + -py * 7 + "deg) translateY(-6px)";
          card.style.setProperty("--mx", ((px + 0.5) * 100) + "%");
          card.style.setProperty("--my", ((py + 0.5) * 100) + "%");
          raf = null;
        });
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }

  /* ── animated counters ────────────────────────────────── */
  function initCounters() {
    var els = document.querySelectorAll("[data-count]");
    function run(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / 1600, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ── marquee content ──────────────────────────────────── */
  function initMarquee() {
    var track = document.getElementById("marqueeTrack");
    if (!track) return;
    var items = ["Real-time 3D", "Generative identity", "Motion systems", "WebGL engineering",
                 "Creative direction", "Interaction design", "Shader craft", "Performance budgets"];
    var html = "";
    for (var k = 0; k < 2; k++) {
      items.forEach(function (t) { html += "<span>" + t + "</span>"; });
    }
    track.innerHTML = html;
  }

  /* ── nav scroll state + parallax flag ─────────────────── */
  function initNav() {
    var nav = document.getElementById("nav");
    var burger = document.getElementById("burger");
    var menu = document.getElementById("mobileMenu");

    var dim = document.getElementById("scrollDim");
    var dimMin = 0.55, dimMax = 0.86;
    function onScroll() {
      var y = window.scrollY;
      nav.classList.toggle("scrolled", y > 30);
      if (window.AuroraScene) AuroraScene.onScroll(y);
      if (dim) {
        var vh = Math.max(window.innerHeight, 1);
        var p = Math.min(Math.max((y - vh * 0.45) / (vh * 0.55), 0), 1);
        dim.style.opacity = String(dimMin + (dimMax - dimMin) * p);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("open");
      burger.classList.toggle("open", open);
      burger.setAttribute("aria-expanded", String(open));
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("open");
        burger.classList.remove("open");
      });
    });

    document.getElementById("toTop").addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    });
  }

  /* ── quality toggle button ────────────────────────────── */
  function initQualityToggle() {
    var btn = document.getElementById("qualityToggle");
    var state = btn.querySelector(".quality-state");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (!window.AuroraScene || !AuroraScene.enabled) {
        Toast.show("WebGL scene inactive — running CSS aurora");
        return;
      }
      var q = AuroraScene.toggleQuality();
      state.textContent = q === "high" ? "HI" : "LO";
      Toast.show(q === "high"
        ? "Graphics quality raised — full effects online"
        : "Graphics quality lowered — saving GPU headroom");
    });
  }

  /* ── toast ────────────────────────────────────────────── */
  var Toast = {
    el: null, timer: null,
    init: function () { this.el = document.getElementById("toast"); },
    show: function (msg) {
      if (!this.el) return;
      this.el.textContent = msg;
      this.el.classList.add("show");
      clearTimeout(this.timer);
      this.timer = setTimeout(function () {
        Toast.el.classList.remove("show");
      }, 3200);
    }
  };
  window.Toast = Toast;

  /* ── pricing → contact prefill ────────────────────────── */
  function initPlanButtons() {
    document.querySelectorAll(".plan-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        var plan = b.getAttribute("data-plan");
        var sel = document.getElementById("fBudget");
        if (sel) {
          Array.prototype.forEach.call(sel.options, function (o) {
            if (o.text.indexOf(plan) !== -1) sel.value = o.value || o.text;
          });
          sel.value = Array.prototype.find.call(sel.options, function (o) {
            return o.text.indexOf(plan) !== -1;
          }).text;
        }
        document.getElementById("contact").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
        Toast.show("“" + plan + "” selected — tell us about the project");
      });
    });
  }

  /* ── contact form ─────────────────────────────────────── */
  function initForm() {
    var form = document.getElementById("contactForm");
    var note = document.getElementById("formNote");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll("input, select, textarea").forEach(function (f) {
        var bad = !f.value.trim() ||
          (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.value));
        f.classList.toggle("err", !!bad);
        if (bad) ok = false;
      });
      if (!ok) {
        note.textContent = "Some fields need attention — marked in red.";
        note.className = "form-note err";
        return;
      }
      var btn = form.querySelector(".btn-submit");
      var label = btn.querySelector("span");
      btn.disabled = true;
      label.textContent = "Transmitting…";
      setTimeout(function () {
        btn.disabled = false;
        label.textContent = "Transmit brief";
        note.textContent = "Signal received. We’ll reply within one business day.";
        note.className = "form-note ok";
        form.reset();
        Toast.show("Brief transmitted — check your inbox soon ◆");
      }, 1400);
    });
    form.querySelectorAll("input, select, textarea").forEach(function (f) {
      f.addEventListener("input", function () { f.classList.remove("err"); });
    });
  }

  /* ── boot ─────────────────────────────────────────────── */
  function init() {
    Toast.init();
    initPreloader();
    initCursor();
    initMagnetic();
    initScramble();
    initReveals();
    initTilt();
    initCounters();
    initMarquee();
    initNav();
    initQualityToggle();
    initPlanButtons();
    initForm();
  }

  window.AuroraUI = { init: init, Toast: Toast, observeReveal: observeReveal };
})();
