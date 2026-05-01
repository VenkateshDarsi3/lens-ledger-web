/**
 * Tales by DVS — Public Website Interactions
 * Scroll animations · 3D parallax · Magnetic cursor · Reveal effects
 */

(function () {
  "use strict";

  /* ─── Only run on the public shell ─────────────────────────── */
  const shell = document.getElementById("publicShell");
  if (!shell || shell.classList.contains("hidden")) return;

  /* ─── Utils ─────────────────────────────────────────────────── */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /* ═══════════════════════════════════════════════════════════════
     1. CUSTOM MAGNETIC CURSOR
  ═══════════════════════════════════════════════════════════════ */
  const cursor    = document.getElementById("cursor");
  const cursorDot = document.getElementById("cursorDot");

  if (cursor && cursorDot) {
    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let cx = mx, cy = my;
    let dotX = mx, dotY = my;
    let isVisible = false;

    document.addEventListener("mousemove", (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!isVisible) {
        isVisible = true;
        cursor.style.opacity = "1";
        cursorDot.style.opacity = "1";
      }
    });

    document.addEventListener("mouseleave", () => {
      cursor.style.opacity = "0";
      cursorDot.style.opacity = "0";
      isVisible = false;
    });

    /* Magnetic hover targets */
    const magneticSelectors = [
      ".btn-magnetic", ".nav-cta", ".nav-link", ".portfolio-card",
      ".flip-card", ".public-ai-prompt", ".primary-button", ".ghost-button",
      ".process-step", "button", "a"
    ];

    const magnetRange = 80;  // px radius for magnetic pull
    const magnetStrength = 0.35;

    let hoveredMagnetic = null;
    let magOffX = 0, magOffY = 0;

    function updateMagneticTargets() {
      document.querySelectorAll(magneticSelectors.join(",")).forEach((el) => {
        el.addEventListener("mouseenter", () => {
          cursor.classList.add("is-hovering");
          hoveredMagnetic = el;
        });
        el.addEventListener("mouseleave", () => {
          cursor.classList.remove("is-hovering");
          hoveredMagnetic = null;
          magOffX = 0;
          magOffY = 0;
          el.style.transform = "";
        });
      });
    }
    updateMagneticTargets();

    /* Smooth cursor animation loop */
    function animateCursor() {
      /* Outer ring — smooth follow */
      cx = lerp(cx, mx, 0.12);
      cy = lerp(cy, my, 0.12);
      cursor.style.left = cx + "px";
      cursor.style.top  = cy + "px";

      /* Dot — instant follow */
      dotX = lerp(dotX, mx, 0.28);
      dotY = lerp(dotY, my, 0.28);
      cursorDot.style.left = dotX + "px";
      cursorDot.style.top  = dotY + "px";

      /* Magnetic pull on hovered element */
      if (hoveredMagnetic) {
        const rect = hoveredMagnetic.getBoundingClientRect();
        const elCX = rect.left + rect.width / 2;
        const elCY = rect.top  + rect.height / 2;
        const dx = mx - elCX;
        const dy = my - elCY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < magnetRange) {
          const pull = (1 - dist / magnetRange) * magnetStrength;
          magOffX = lerp(magOffX, dx * pull, 0.14);
          magOffY = lerp(magOffY, dy * pull, 0.14);
          hoveredMagnetic.style.transform = `translate(${magOffX}px, ${magOffY}px)`;
        }
      }

      requestAnimationFrame(animateCursor);
    }
    animateCursor();
  }

  /* ═══════════════════════════════════════════════════════════════
     2. SCROLL PROGRESS BAR + NAV STATE
  ═══════════════════════════════════════════════════════════════ */
  const scrollBar = document.getElementById("scrollBar");
  const siteNav   = document.getElementById("siteNav");

  function onScroll() {
    const scrolled = window.scrollY;
    const maxScroll = document.body.scrollHeight - window.innerHeight;

    /* Progress bar */
    if (scrollBar) {
      scrollBar.style.width = (maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0) + "%";
    }

    /* Nav glass effect */
    if (siteNav) {
      siteNav.classList.toggle("is-scrolled", scrolled > 40);
    }

    /* Parallax layers */
    updateParallax(scrolled);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // init

  /* ═══════════════════════════════════════════════════════════════
     3. SCROLL REVEAL (IntersectionObserver)
  ═══════════════════════════════════════════════════════════════ */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          /* Stagger children with .reveal-child class */
          entry.target.querySelectorAll(".reveal-child").forEach((child, i) => {
            child.style.transitionDelay = `${i * 0.1}s`;
            child.classList.add("is-visible");
          });
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -60px 0px" }
  );

  document.querySelectorAll(".reveal-section").forEach((el) => {
    revealObserver.observe(el);
  });

  /* ═══════════════════════════════════════════════════════════════
     4. HERO 3D TILT
  ═══════════════════════════════════════════════════════════════ */
  const heroTilt = document.getElementById("heroTilt");
  if (heroTilt) {
    let tiltX = 0, tiltY = 0;
    let targetTX = 0, targetTY = 0;

    heroTilt.addEventListener("mousemove", (e) => {
      const rect = heroTilt.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;  // -0.5 → 0.5
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      targetTX = -y * 12;  // degrees
      targetTY =  x * 12;
    });

    heroTilt.addEventListener("mouseleave", () => {
      targetTX = 0;
      targetTY = 0;
    });

    function animateTilt() {
      tiltX = lerp(tiltX, targetTX, 0.08);
      tiltY = lerp(tiltY, targetTY, 0.08);
      heroTilt.style.transform = `perspective(900px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      requestAnimationFrame(animateTilt);
    }
    animateTilt();
  }

  /* ═══════════════════════════════════════════════════════════════
     5. 3D CARD TILT (portfolio & process cards)
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".card-3d:not(#heroTilt), .process-step").forEach((card) => {
    let tx = 0, ty = 0, targetTX = 0, targetTY = 0;
    let animating = false;

    function tick() {
      tx = lerp(tx, targetTX, 0.1);
      ty = lerp(ty, targetTY, 0.1);
      card.style.transform = `perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg) translateZ(4px)`;
      if (Math.abs(tx) > 0.01 || Math.abs(ty) > 0.01 || animating) {
        requestAnimationFrame(tick);
      }
    }

    card.addEventListener("mouseenter", () => { animating = true; tick(); });

    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width  - 0.5;
      const y = (e.clientY - rect.top)  / rect.height - 0.5;
      targetTX = -y * 10;
      targetTY =  x * 10;
    });

    card.addEventListener("mouseleave", () => {
      targetTX = 0;
      targetTY = 0;
      animating = false;
      tick();
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     6. PARALLAX LAYERS ON SCROLL
  ═══════════════════════════════════════════════════════════════ */
  const parallaxElements = [
    { sel: ".bokeh.b1", speed: 0.06, axis: "y" },
    { sel: ".bokeh.b2", speed: -0.04, axis: "y" },
    { sel: ".bokeh.b3", speed: 0.08, axis: "y" },
    { sel: ".bokeh.b4", speed: -0.05, axis: "y" },
    { sel: ".bokeh.b5", speed: 0.03, axis: "y" },
    { sel: ".public-hero-logo", speed: 0.12, axis: "y" },
    { sel: ".hero-scroll-hint", speed: 0.15, axis: "y" },
  ];

  const parallaxTargets = parallaxElements.map(({ sel, speed, axis }) => ({
    el: document.querySelector(sel),
    speed,
    axis,
  })).filter(({ el }) => el !== null);

  function updateParallax(scrollY) {
    parallaxTargets.forEach(({ el, speed }) => {
      el.style.transform = `translateY(${scrollY * speed}px)`;
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     7. STAT COUNTER ANIMATION
  ═══════════════════════════════════════════════════════════════ */
  const statNums = document.querySelectorAll(".stat-num[data-target]");

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        const duration = 1800;
        const start = performance.now();

        function step(now) {
          const elapsed = now - start;
          const progress = clamp(elapsed / duration, 0, 1);
          /* Ease out cubic */
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        counterObserver.unobserve(el);
      });
    },
    { threshold: 0.5 }
  );

  statNums.forEach((el) => counterObserver.observe(el));

  /* ═══════════════════════════════════════════════════════════════
     8. SMOOTH SCROLL FOR NAV LINKS
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const navH = siteNav ? siteNav.offsetHeight : 72;
      const top  = target.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top, behavior: "smooth" });
    });
  });

  /* ═══════════════════════════════════════════════════════════════
     9. SECTION ENTRANCE — staggered children
  ═══════════════════════════════════════════════════════════════ */
  /* Auto-tag direct children of grids for stagger */
  document.querySelectorAll(".portfolio-grid, .services-grid, .process-steps, .stats-inner").forEach((grid) => {
    Array.from(grid.children).forEach((child, i) => {
      child.classList.add("reveal-child");
      child.style.opacity = "0";
      child.style.transform = "translateY(28px)";
      child.style.transition = `opacity 0.55s ease ${i * 0.1}s, transform 0.55s ease ${i * 0.1}s`;
    });
  });

  const childObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.querySelectorAll(".reveal-child").forEach((child) => {
          child.style.opacity = "1";
          child.style.transform = "translateY(0)";
        });
        childObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
  );

  document.querySelectorAll(".portfolio-grid, .services-grid, .process-steps, .stats-inner").forEach((grid) => {
    childObserver.observe(grid);
  });

  /* ═══════════════════════════════════════════════════════════════
     10. HERO TEXT SPLIT ANIMATION
  ═══════════════════════════════════════════════════════════════ */
  const heroLines = document.querySelectorAll(".hero-line");
  heroLines.forEach((line, i) => {
    line.style.opacity = "0";
    line.style.transform = "translateY(24px)";
    line.style.transition = `opacity 0.75s ease ${0.3 + i * 0.18}s, transform 0.75s ease ${0.3 + i * 0.18}s`;
    /* Trigger after a short delay */
    setTimeout(() => {
      line.style.opacity = "1";
      line.style.transform = "translateY(0)";
    }, 80);
  });

  /* Hero sub-text */
  const heroSub = document.querySelector(".hero-sub");
  if (heroSub) {
    heroSub.style.opacity = "0";
    heroSub.style.transform = "translateY(16px)";
    heroSub.style.transition = "opacity 0.75s ease 0.85s, transform 0.75s ease 0.85s";
    setTimeout(() => {
      heroSub.style.opacity = "1";
      heroSub.style.transform = "translateY(0)";
    }, 80);
  }

  /* Hero CTA buttons */
  const heroCTAs = document.querySelectorAll(".public-hero-actions a");
  heroCTAs.forEach((btn, i) => {
    btn.style.opacity = "0";
    btn.style.transform = "translateY(14px)";
    btn.style.transition = `opacity 0.65s ease ${1.0 + i * 0.15}s, transform 0.65s ease ${1.0 + i * 0.15}s`;
    setTimeout(() => {
      btn.style.opacity = "1";
      btn.style.transform = "translateY(0)";
    }, 80);
  });

  /* ═══════════════════════════════════════════════════════════════
     11. SCROLL-TRIGGERED PARALLAX SECTIONS
  ═══════════════════════════════════════════════════════════════ */
  const sections = document.querySelectorAll(".public-section, .stats-strip");
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle("in-view", entry.isIntersecting);
      });
    },
    { threshold: 0.05 }
  );
  sections.forEach((s) => sectionObserver.observe(s));

  /* ═══════════════════════════════════════════════════════════════
     12. FLOATING LABEL INPUTS
  ═══════════════════════════════════════════════════════════════ */
  document.querySelectorAll(".public-enquiry-form input, .public-enquiry-form select, .public-enquiry-form textarea").forEach((input) => {
    const label = input.closest("label");
    if (!label) return;

    function check() {
      label.classList.toggle("has-value", input.value.trim().length > 0 || document.activeElement === input);
    }
    input.addEventListener("focus", check);
    input.addEventListener("blur", check);
    input.addEventListener("input", check);
    check();
  });

  /* ═══════════════════════════════════════════════════════════════
     DONE — Re-run on publicShell visibility change (admin ↔ public)
  ═══════════════════════════════════════════════════════════════ */
  const shellObserver = new MutationObserver(() => {
    const hidden = shell.classList.contains("hidden");
    if (cursor) cursor.style.display = hidden ? "none" : "";
    if (cursorDot) cursorDot.style.display = hidden ? "none" : "";
    if (scrollBar) scrollBar.style.display = hidden ? "none" : "";
  });
  shellObserver.observe(shell, { attributes: true, attributeFilter: ["class"] });

})();
