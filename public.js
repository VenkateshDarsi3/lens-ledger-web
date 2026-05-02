/**
 * Tales by DVS — Cinematic Public Website
 * Particle canvas · Glow trail · Word-split hero text
 * Magnetic cursor · 3D tilt · Scroll reveal · Parallax
 */

/* ═══════════════════════════════════════════════════════════════
   CINEMATIC PRELOADER — runs before everything else
═══════════════════════════════════════════════════════════════ */
(function () {
  var pre = document.getElementById("sitePreloader");
  if (!pre) return;

  /* Lock scroll */
  document.body.classList.add("preloader-active");

  /* Dismiss after animations complete (~2.9s) */
  setTimeout(function () {
    pre.classList.add("is-done");
    document.body.classList.remove("preloader-active");

    /* Remove from DOM after fade-out transition */
    setTimeout(function () {
      if (pre.parentNode) pre.parentNode.removeChild(pre);
    }, 950);
  }, 1500);
})();

(function () {
  "use strict";

  const shell = document.getElementById("publicShell");
  if (!shell || shell.classList.contains("hidden")) return;

  const lerp  = (a, b, t) => a + (b - a) * t;
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

  /* ═══════════════════════════════════════════════════════════════
     0. ANIMATED PARTICLE CANVAS
  ═══════════════════════════════════════════════════════════════ */
  (function initParticleCanvas() {
    const canvas = document.createElement("canvas");
    canvas.id = "particleCanvas";
    Object.assign(canvas.style, {
      position: "fixed", top: "0", left: "0",
      width: "100%", height: "100%",
      pointerEvents: "none", zIndex: "0", opacity: "0.5",
    });
    document.body.insertBefore(canvas, document.body.firstChild);

    const ctx = canvas.getContext("2d");
    let W, H;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const COLORS = [
      "rgba(212,175,55,", "rgba(255,220,100,", "rgba(200,160,40,",
      "rgba(255,240,160,", "rgba(180,130,60,",
    ];
    const COUNT = 35;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 2 + 0.8,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25 - 0.06,
      alpha: Math.random() * 0.45 + 0.15,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.006 + Math.random() * 0.008,
    }));

    let pmx = 0, pmy = 0, frameSkip = 0;
    window.addEventListener("mousemove", (e) => { pmx = e.clientX; pmy = e.clientY; }, { passive: true });

    function draw() {
      requestAnimationFrame(draw);
      /* Render every other frame to halve GPU load */
      frameSkip ^= 1; if (frameSkip) return;

      ctx.clearRect(0, 0, W, H);
      particles.forEach((p) => {
        p.pulse += p.pulseSpeed;
        const a = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
        /* Simple filled circle — no radial gradient (much cheaper) */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r + 2, 0, Math.PI * 2);
        ctx.fillStyle = p.color + (a * 0.35) + ")";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.min(a + 0.25, 1) + ")";
        ctx.fill();

        const dx = pmx - p.x, dy = pmy - p.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 160 * 160) { const pull = (160 - Math.sqrt(dist2)) / 160 * 0.006; p.vx += dx * pull; p.vy += dy * pull; }
        p.vx *= 0.985; p.vy *= 0.985;
        p.x += p.vx; p.y += p.vy;
        if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20;
        if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20;
      });
    }
    draw();
  })();

  /* ═══════════════════════════════════════════════════════════════
     1. GLOWING CURSOR TRAIL
  ═══════════════════════════════════════════════════════════════ */
  const cursor    = document.getElementById("cursor");
  const cursorDot = document.getElementById("cursorDot");

  const TRAIL = 6;
  const trailDots = Array.from({ length: TRAIL }, (_, i) => {
    const d = document.createElement("div");
    const sz = 8 - i * 0.45;
    Object.assign(d.style, {
      position: "fixed", width: sz + "px", height: sz + "px",
      borderRadius: "50%",
      background: "rgba(212,175,55," + (0.6 - i * 0.04) + ")",
      pointerEvents: "none", zIndex: "9998",
      transform: "translate(-50%,-50%)",
      filter: "blur(" + (i * 0.35) + "px)",
      boxShadow: "0 0 " + (6 + i * 2) + "px rgba(212,175,55,0.55)",
      opacity: "0",
    });
    document.body.appendChild(d);
    return { el: d, x: window.innerWidth / 2, y: window.innerHeight / 2 };
  });

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let cx = mx, cy = my, dotX = mx, dotY = my;
  let cursorVisible = false;

  document.addEventListener("mousemove", (e) => {
    mx = e.clientX; my = e.clientY;
    if (!cursorVisible) {
      cursorVisible = true;
      if (cursor) cursor.style.opacity = "1";
      if (cursorDot) cursorDot.style.opacity = "1";
      trailDots.forEach((d) => (d.el.style.opacity = "1"));
    }
  });
  document.addEventListener("mouseleave", () => {
    cursorVisible = false;
    if (cursor) cursor.style.opacity = "0";
    if (cursorDot) cursorDot.style.opacity = "0";
    trailDots.forEach((d) => (d.el.style.opacity = "0"));
  });

  /* Magnetic hover */
  const magnetSels = ".btn-magnetic,.nav-cta,.nav-link,.portfolio-card,.flip-card,.primary-button,.ghost-button,.process-step,button,a";
  let hoveredMag = null, magOffX = 0, magOffY = 0;

  document.querySelectorAll(magnetSels).forEach((el) => {
    el.addEventListener("mouseenter", () => { if (cursor) cursor.classList.add("is-hovering"); hoveredMag = el; });
    el.addEventListener("mouseleave", () => { if (cursor) cursor.classList.remove("is-hovering"); hoveredMag = null; magOffX = 0; magOffY = 0; el.style.transform = ""; });
  });

  (function animateCursor() {
    cx = lerp(cx, mx, 0.12); cy = lerp(cy, my, 0.12);
    if (cursor) { cursor.style.left = cx + "px"; cursor.style.top = cy + "px"; }
    dotX = lerp(dotX, mx, 0.28); dotY = lerp(dotY, my, 0.28);
    if (cursorDot) { cursorDot.style.left = dotX + "px"; cursorDot.style.top = dotY + "px"; }

    let px = mx, py = my;
    trailDots.forEach((dot) => {
      dot.x = lerp(dot.x, px, 0.3); dot.y = lerp(dot.y, py, 0.3);
      dot.el.style.left = dot.x + "px"; dot.el.style.top = dot.y + "px";
      px = dot.x; py = dot.y;
    });
    if (hoveredMag) {
      const r = hoveredMag.getBoundingClientRect();
      const ecx = r.left + r.width / 2, ecy = r.top + r.height / 2;
      const dx = mx - ecx, dy = my - ecy, dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 90) {
        const pull = (1 - dist / 90) * 0.4;
        magOffX = lerp(magOffX, dx * pull, 0.14);
        magOffY = lerp(magOffY, dy * pull, 0.14);
        hoveredMag.style.transform = "translate(" + magOffX + "px," + magOffY + "px)";
      }
    }
    requestAnimationFrame(animateCursor);
  })();

  /* Click ripple */
  document.addEventListener("click", (e) => {
    const rp = document.createElement("div");
    Object.assign(rp.style, {
      position: "fixed", left: e.clientX + "px", top: e.clientY + "px",
      width: "6px", height: "6px", borderRadius: "50%",
      background: "rgba(212,175,55,0.9)",
      boxShadow: "0 0 20px 8px rgba(212,175,55,0.5)",
      transform: "translate(-50%,-50%) scale(1)",
      transition: "transform 0.65s ease, opacity 0.65s ease",
      pointerEvents: "none", zIndex: "9999",
    });
    document.body.appendChild(rp);
    requestAnimationFrame(() => { rp.style.transform = "translate(-50%,-50%) scale(18)"; rp.style.opacity = "0"; });
    setTimeout(() => rp.remove(), 700);
  });

  /* ═══════════════════════════════════════════════════════════════
     2. PARALLAX TARGETS (defined before onScroll)
  ═══════════════════════════════════════════════════════════════ */
  const parallaxCfg = [
    { sel: ".bokeh.b1", speed: 0.07 },
    { sel: ".bokeh.b2", speed: -0.05 },
    { sel: ".bokeh.b3", speed: 0.1 },
    { sel: ".bokeh.b4", speed: -0.06 },
    { sel: ".bokeh.b5", speed: 0.04 },
    { sel: ".public-hero-logo", speed: 0.13 },
    { sel: ".hero-scroll-hint", speed: 0.17 },
    { sel: ".hero-visual", speed: 0.09 },
    { sel: ".hero-image-wrap", speed: 0.09 },
  ];
  const parallaxTargets = parallaxCfg
    .map(({ sel, speed }) => ({ el: document.querySelector(sel), speed }))
    .filter(({ el }) => el !== null);

  function updateParallax(sy) {
    parallaxTargets.forEach(({ el, speed }) => {
      el.style.transform = "translateY(" + (sy * speed) + "px)";
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     3. SCROLL + NAV
  ═══════════════════════════════════════════════════════════════ */
  const scrollBar = document.getElementById("scrollBar");
  const siteNav   = document.getElementById("siteNav");

  function onScroll() {
    const scrolled  = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    if (scrollBar) scrollBar.style.width = (maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0) + "%";
    if (siteNav)   siteNav.classList.toggle("is-scrolled", scrolled > 40);
    updateParallax(scrolled);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ═══════════════════════════════════════════════════════════════
     4. HERO LINE ENTRANCE — safe, no innerHTML manipulation
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".hero-line").forEach(function(line, i) {
    line.style.opacity = "0";
    line.style.transform = "translateY(28px)";
    line.style.transition = "opacity 0.75s cubic-bezier(.22,1,.36,1) " + (0.25 + i * 0.2) + "s," +
                            "transform 0.75s cubic-bezier(.22,1,.36,1) " + (0.25 + i * 0.2) + "s";
    line.style.display = "block";
  });

  var heroKicker = document.querySelector(".public-kicker");
  if (heroKicker) {
    heroKicker.style.opacity = "0";
    heroKicker.style.transform = "translateY(16px)";
    heroKicker.style.transition = "opacity 0.6s ease 0.1s, transform 0.6s ease 0.1s";
  }

  requestAnimationFrame(function() {
    setTimeout(function() {
      document.querySelectorAll(".hero-line").forEach(function(line) {
        line.style.opacity = "1";
        line.style.transform = "translateY(0)";
      });
      if (heroKicker) { heroKicker.style.opacity = "1"; heroKicker.style.transform = "translateY(0)"; }
    }, 60);
  });

  /* Hero sub + CTA */
  var heroSub = document.querySelector(".hero-sub");
  if (heroSub) {
    heroSub.style.opacity = "0";
    heroSub.style.transform = "translateY(20px)";
    heroSub.style.transition = "opacity 0.85s ease 0.95s, transform 0.85s ease 0.95s";
    setTimeout(function() { heroSub.style.opacity = "1"; heroSub.style.transform = "translateY(0)"; }, 80);
  }
  document.querySelectorAll(".public-hero-actions a").forEach(function(btn, i) {
    btn.style.opacity = "0";
    btn.style.transform = "translateY(16px) scale(0.97)";
    btn.style.transition = "opacity 0.65s ease " + (1.2 + i * 0.15) + "s, transform 0.65s ease " + (1.2 + i * 0.15) + "s";
    setTimeout(function() { btn.style.opacity = "1"; btn.style.transform = "translateY(0) scale(1)"; }, 80);
  });

  /* ═══════════════════════════════════════════════════════════════
     5. HERO 3D TILT
  ═══════════════════════════════════════════════════════════════ */
  var heroTilt = document.getElementById("heroTilt");
  if (heroTilt) {
    var tX = 0, tY = 0, ttX = 0, ttY = 0;
    heroTilt.addEventListener("mousemove", function(e) {
      var r = heroTilt.getBoundingClientRect();
      ttX = -((e.clientY - r.top) / r.height - 0.5) * 20;
      ttY =  ((e.clientX - r.left) / r.width - 0.5) * 20;
    });
    heroTilt.addEventListener("mouseleave", function() { ttX = 0; ttY = 0; });
    (function animT() {
      tX = lerp(tX, ttX, 0.07); tY = lerp(tY, ttY, 0.07);
      heroTilt.style.transform = "perspective(800px) rotateX(" + tX + "deg) rotateY(" + tY + "deg)";
      requestAnimationFrame(animT);
    })();
  }

  /* ═══════════════════════════════════════════════════════════════
     6. CARD 3D TILT WITH GOLD GLOW
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".card-3d:not(#heroTilt),.portfolio-card,.process-step,.flip-card").forEach(function(card) {
    var tx = 0, ty = 0, ttx = 0, tty = 0, running = false;
    function tick() {
      tx = lerp(tx, ttx, 0.09); ty = lerp(ty, tty, 0.09);
      card.style.transform = "perspective(800px) rotateX(" + tx + "deg) rotateY(" + ty + "deg) translateZ(8px)";
      if (Math.abs(tx - ttx) > 0.05 || Math.abs(ty - tty) > 0.05) requestAnimationFrame(tick);
      else running = false;
    }
    card.addEventListener("mouseenter", function() {
      card.style.boxShadow = "0 0 50px rgba(212,175,55,0.3),0 24px 64px rgba(0,0,0,0.45)";
      running = true; tick();
    });
    card.addEventListener("mousemove", function(e) {
      var r = card.getBoundingClientRect();
      ttx = -((e.clientY - r.top) / r.height - 0.5) * 18;
      tty =  ((e.clientX - r.left) / r.width - 0.5) * 18;
      if (!running) { running = true; tick(); }
    });
    card.addEventListener("mouseleave", function() {
      ttx = 0; tty = 0;
      card.style.boxShadow = "";
      running = true; tick();
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     6b. ABOUT CARD — auto-float + mouse 3D tilt
  ═══════════════════════════════════════════════════════════════ */
  var aboutCard = document.getElementById("aboutCard3D");
  if (aboutCard) {
    var acRX = 0, acRY = 0;          // current rotation
    var acTX = 0, acTY = 0;          // target from mouse
    var acAutoAngle = 0;              // auto-float angle
    var acHovered = false;

    aboutCard.addEventListener("mouseenter", function() { acHovered = true; });
    aboutCard.addEventListener("mousemove", function(e) {
      var r = aboutCard.getBoundingClientRect();
      acTX = -((e.clientY - r.top)  / r.height - 0.5) * 20;
      acTY =  ((e.clientX - r.left) / r.width  - 0.5) * 20;
    });
    aboutCard.addEventListener("mouseleave", function() {
      acHovered = false;
      acTX = 0; acTY = 0;
    });

    (function animAboutCard() {
      acAutoAngle += 0.008;
      var autoX = Math.sin(acAutoAngle) * 5;
      var autoY = Math.cos(acAutoAngle * 0.7) * 4;
      var targetX = acHovered ? acTX : autoX;
      var targetY = acHovered ? acTY : autoY;
      acRX = lerp(acRX, targetX, acHovered ? 0.1 : 0.03);
      acRY = lerp(acRY, targetY, acHovered ? 0.1 : 0.03);

      /* Vertical float bob */
      var bob = Math.sin(acAutoAngle * 0.9) * 10;

      aboutCard.style.transform =
        "perspective(900px)" +
        " rotateX(" + acRX + "deg)" +
        " rotateY(" + acRY + "deg)" +
        " translateY(" + bob + "px)";

      /* Dynamic glow follows tilt */
      var glow = aboutCard.querySelector(".about-card-glow");
      if (glow) {
        var gx = 50 + acRY * 2;
        var gy = 50 - acRX * 2;
        glow.style.background =
          "radial-gradient(ellipse at " + gx + "% " + gy + "%, rgba(212,175,55,0.22) 0%, transparent 65%)";
      }

      requestAnimationFrame(animAboutCard);
    })();
  }

  /* ═══════════════════════════════════════════════════════════════
     7. SCROLL REVEAL
  ═══════════════════════════════════════════════════════════════ */
  var revObs = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (!entry.isIntersecting) return;
      var el = entry.target;
      el.classList.add("is-visible");
      /* Stagger children */
      el.querySelectorAll(".reveal-child").forEach(function(child, i) {
        setTimeout(function() {
          child.style.transitionDelay = (i * 0.1) + "s";
          child.classList.add("is-visible");
        }, 80);
      });
      revObs.unobserve(el);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".reveal-section").forEach(function(el) { revObs.observe(el); });

  /* ═══════════════════════════════════════════════════════════════
     8. STAGGERED GRID CHILDREN
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".portfolio-grid,.services-grid,.process-steps,.stats-inner").forEach(function(grid) {
    Array.from(grid.children).forEach(function(child, i) {
      child.classList.add("reveal-child");
      child.style.opacity = "0";
      child.style.transform = "translateY(36px) scale(0.97)";
      child.style.transition = "opacity 0.6s ease " + (i * 0.12) + "s,transform 0.6s ease " + (i * 0.12) + "s";
    });
    new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll(".reveal-child").forEach(function(child) {
          child.style.opacity = "1";
          child.style.transform = "translateY(0) scale(1)";
        });
      });
    }, { threshold: 0.07, rootMargin: "0px 0px -40px 0px" }).observe(grid);
  });

  /* ═══════════════════════════════════════════════════════════════
     9. STAT COUNTERS
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".stat-num[data-target]").forEach(function(el) {
    new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var target = parseInt(el.dataset.target, 10);
        var dur = 2000, start = performance.now();
        (function step(now) {
          var p = clamp((now - start) / dur, 0, 1);
          el.textContent = Math.round((1 - Math.pow(1 - p, 4)) * target);
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.5 }).observe(el);
  });

  /* ═══════════════════════════════════════════════════════════════
     10. SMOOTH SCROLL
  ═══════════════════════════════════════════════════════════════ */
  function smoothScrollTo(destY) {
    var start     = window.scrollY;
    var dist      = destY - start;
    var duration  = Math.min(650, 200 + Math.abs(dist) * 0.18); /* max 650ms */
    var startTime = null;
    function ease(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
    function step(ts) {
      if (!startTime) startTime = ts;
      var progress = Math.min((ts - startTime) / duration, 1);
      window.scrollTo(0, start + dist * ease(progress));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll("a[href^=\"#\"]").forEach(function(link) {
    link.addEventListener("click", function(e) {
      var id = link.getAttribute("href").slice(1);
      var target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      var dest = target.getBoundingClientRect().top + window.scrollY - (siteNav ? siteNav.offsetHeight : 72) - 16;
      smoothScrollTo(dest);
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     10b. POP-OUT CARD SPRING PHYSICS
     Cards spring up on hover with slight overshoot, press on click
  ═══════════════════════════════════════════════════════════════ */
  (function initPopCards() {
    var popSelectors = [
      ".portfolio-card", ".flip-card", ".process-step",
      ".review-card", ".about-pillar", ".stat-pill"
    ].join(",");

    document.querySelectorAll(popSelectors).forEach(function(card) {
      var vy = 0;          // velocity
      var cy = 0;          // current Y offset
      var ty = 0;          // target Y
      var scale = 1;
      var ts = 1;          // target scale
      var raf = null;
      var isHovered = false;

      function springTick() {
        /* Spring: F = -k(x - target) - damping * v */
        var k = 0.18, damp = 0.72;
        var ay = -k * (cy - ty);
        vy = vy * damp + ay;
        cy += vy;

        var ds = ts - scale;
        scale += ds * 0.14;

        var settled = Math.abs(cy - ty) < 0.05 && Math.abs(vy) < 0.05 && Math.abs(scale - ts) < 0.001;
        card.style.transform = "translateY(" + cy + "px) scale(" + scale + ")";

        if (!settled) {
          raf = requestAnimationFrame(springTick);
        } else {
          cy = ty; scale = ts;
          card.style.transform = "translateY(" + cy + "px) scale(" + scale + ")";
          raf = null;
        }
      }

      function startSpring() { if (!raf) raf = requestAnimationFrame(springTick); }

      card.addEventListener("mouseenter", function() {
        isHovered = true;
        ty = -14; ts = 1.025;
        startSpring();
      });
      card.addEventListener("mouseleave", function() {
        isHovered = false;
        ty = 0; ts = 1;
        startSpring();
      });
      card.addEventListener("mousedown", function() {
        ty = -4; ts = 0.985;
        startSpring();
      });
      card.addEventListener("mouseup", function() {
        ty = isHovered ? -14 : 0;
        ts  = isHovered ? 1.025 : 1;
        startSpring();
      });
    });

    /* Button spring */
    document.querySelectorAll(".primary-button,.ghost-button,.nav-cta").forEach(function(btn) {
      btn.addEventListener("mouseenter", function() {
        btn.style.transition = "transform 0.35s cubic-bezier(.22,1,.36,1), box-shadow 0.35s ease";
        btn.style.transform = "translateY(-5px) scale(1.05)";
      });
      btn.addEventListener("mouseleave", function() {
        btn.style.transform = "translateY(0) scale(1)";
      });
      btn.addEventListener("mousedown", function() {
        btn.style.transform = "translateY(-1px) scale(0.97)";
        btn.style.transition = "transform 0.1s ease";
      });
      btn.addEventListener("mouseup", function() {
        btn.style.transform = "translateY(-5px) scale(1.05)";
        btn.style.transition = "transform 0.35s cubic-bezier(.22,1,.36,1)";
      });
    });
  })();

  /* ═══════════════════════════════════════════════════════════════
     11. FLOATING LABELS
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".public-enquiry-form input,.public-enquiry-form select,.public-enquiry-form textarea").forEach(function(input) {
    var label = input.closest("label");
    if (!label) return;
    function check() { label.classList.toggle("has-value", input.value.trim().length > 0 || document.activeElement === input); }
    input.addEventListener("focus", check);
    input.addEventListener("blur", check);
    input.addEventListener("input", check);
    check();
  });

  /* ═══════════════════════════════════════════════════════════════
     12. SECTION IN-VIEW
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".public-section,.stats-strip").forEach(function(s) {
    new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) { entry.target.classList.toggle("in-view", entry.isIntersecting); });
    }, { threshold: 0.05 }).observe(s);
  });

  /* ═══════════════════════════════════════════════════════════════
     13. SHELL VISIBILITY WATCHER
  ═══════════════════════════════════════════════════════════════ */
  new MutationObserver(function() {
    var hidden = shell.classList.contains("hidden");
    var cvs = document.getElementById("particleCanvas");
    [cursor, cursorDot, scrollBar, cvs].forEach(function(el) { if (el) el.style.display = hidden ? "none" : ""; });
    trailDots.forEach(function(d) { d.el.style.display = hidden ? "none" : ""; });
  }).observe(shell, { attributes: true, attributeFilter: ["class"] });

  /* ═══════════════════════════════════════════════════════════════
     14. MOBILE HAMBURGER MENU
  ═══════════════════════════════════════════════════════════════ */
  (function () {
    var hamburger = document.getElementById("navHamburger");
    var mobileMenu = document.getElementById("mobileMenu");
    var closeBtn   = document.getElementById("mobileMenuClose");
    var mobileLinks = mobileMenu ? mobileMenu.querySelectorAll(".mobile-link, .mobile-menu-cta") : [];

    if (!hamburger || !mobileMenu) return;

    function openMenu() {
      mobileMenu.classList.add("is-open");
      hamburger.classList.add("is-open");
      hamburger.setAttribute("aria-expanded", "true");
      mobileMenu.removeAttribute("aria-hidden");
      document.body.style.overflow = "hidden";
    }

    function closeMenu() {
      mobileMenu.classList.remove("is-open");
      hamburger.classList.remove("is-open");
      hamburger.setAttribute("aria-expanded", "false");
      mobileMenu.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    hamburger.addEventListener("click", function () {
      if (mobileMenu.classList.contains("is-open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", closeMenu);
    }

    /* Close when any nav link is clicked */
    mobileLinks.forEach(function (link) {
      link.addEventListener("click", function () {
        closeMenu();
      });
    });

    /* Close on Escape key */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mobileMenu.classList.contains("is-open")) {
        closeMenu();
      }
    });

    /* Close when tapping the dark backdrop (outside the nav panel) */
    mobileMenu.addEventListener("click", function (e) {
      if (e.target === mobileMenu || e.target.classList.contains("mobile-menu-bg")) {
        closeMenu();
      }
    });
  })();

})();
