/* Shared site JS - works across all pages */
/* Defensive coding and null checks included */

/* Immediately-invoked function to avoid polluting global scope */
(() => {
  // Helpers
  const qs = (s, el = document) => el.querySelector(s);
  const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

  // Theme (dark mode) handling
  const themeToggleButtons = qsa("#theme-toggle");
  const THEME_KEY = "mb_theme";

  function applyTheme(theme) {
    document.body.classList.remove("theme-light", "theme-dark");
    document.body.classList.add(
      theme === "dark" ? "theme-dark" : "theme-light"
    );
    // update aria-pressed states
    themeToggleButtons.forEach((btn) => {
      try {
        btn.setAttribute("aria-pressed", theme === "dark");
      } catch (e) {}
    });
  }

  function loadTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light") {
        applyTheme(stored);
      } else {
        // default: prefer user's system
        const prefersDark =
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark ? "dark" : "light");
      }
    } catch (e) {
      applyTheme("light");
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.contains("theme-dark");
    const next = isDark ? "light" : "dark";
    applyTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (e) {}
  }

  // Nav toggle for mobile
  const navToggle = qs(".nav-toggle");
  const mainNav = qs("#main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => {
      const expanded = navToggle.getAttribute("aria-expanded") === "true";
      navToggle.setAttribute("aria-expanded", String(!expanded));
      // toggle nav visibility
      const hidden = mainNav.getAttribute("aria-hidden") === "true";
      mainNav.setAttribute("aria-hidden", String(!hidden));
    });

    // Ensure nav is hidden initially on small screens
    if (window.matchMedia && window.matchMedia("(max-width:900px)").matches) {
      mainNav.setAttribute("aria-hidden", "true");
    }
  }

  // Smooth scroll for in-page anchor links and global smooth behavior
  document.documentElement.style.scrollBehavior = "smooth";
  // For links to anchors ensure offset for sticky header
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    const targetId = a.getAttribute("href").slice(1);
    const target = document.getElementById(targetId);
    if (target) {
      e.preventDefault();
      const topOffset = Math.max(16, qs(".site-header")?.offsetHeight || 64);
      const rect = target.getBoundingClientRect();
      const scrollTop = window.scrollY + rect.top - topOffset;
      window.scrollTo({ top: scrollTop, behavior: "smooth" });
      // close mobile nav if open
      if (mainNav && mainNav.getAttribute("aria-hidden") === "false") {
        mainNav.setAttribute("aria-hidden", "true");
        if (navToggle) navToggle.setAttribute("aria-expanded", "false");
      }
    }
  });

  // Scroll-to-top button
  const scrollTopBtn = qs("#scroll-top");
  if (scrollTopBtn) {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        scrollTopBtn.style.display = "flex";
      } else {
        scrollTopBtn.style.display = "none";
      }
    };
    window.addEventListener("scroll", toggleVisibility, { passive: true });
    toggleVisibility();
    scrollTopBtn.addEventListener("click", () =>
      window.scrollTo({ top: 0, behavior: "smooth" })
    );
  }

  // Reveal on scroll (IntersectionObserver)
  const revealElements = qsa(
    ".reveal, .card, .section, .panel, .stat, .tilt, .review-card, .chef-card"
  );
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealElements.forEach((el) => observer.observe(el));
  } else {
    // fallback
    revealElements.forEach((el) => el.classList.add("visible"));
  }

  // Simple tilt hover effect by mouse movement (adds tiny parallax)
  const tiltElements = qsa(".tilt");
  tiltElements.forEach((el) => {
    let rect = null;
    const handleMove = (e) => {
      rect = rect || el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const rx = (y - 0.5) * 6; // rotateX
      const ry = (x - 0.5) * -10; // rotateY
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
    };
    const reset = () => (el.style.transform = "");
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", reset);
    el.addEventListener("focus", () => el.classList.add("focus"));
    el.addEventListener("blur", () => reset());
  });

  // Animated counters for stats (when visible)
  const counters = qsa(".stat-number");
  counters.forEach((counter) => {
    const target = parseInt(counter.getAttribute("data-target") || "0", 10);
    if (isNaN(target)) return;
    const animate = () => {
      let start = 0;
      const duration = 1500;
      const startTs = performance.now();
      const step = (ts) => {
        const elapsed = ts - startTs;
        const progress = Math.min(elapsed / duration, 1);
        const value = Math.floor(progress * target);
        counter.textContent = value.toLocaleString();
        if (progress < 1) requestAnimationFrame(step);
        else counter.textContent = target.toLocaleString();
      };
      requestAnimationFrame(step);
    };

    if ("IntersectionObserver" in window) {
      const o = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((en) => {
            if (en.isIntersecting) {
              animate();
              obs.unobserve(en.target);
            }
          });
        },
        { threshold: 0.5 }
      );
      o.observe(counter);
    } else {
      animate();
    }
  });

  // Reviews slider simple controls
  const reviewSlider = qs("#review-slider");
  const prevBtn = qs("#prev-review");
  const nextBtn = qs("#next-review");
  if (reviewSlider && (prevBtn || nextBtn)) {
    const cardWidth = () =>
      (reviewSlider.firstElementChild?.getBoundingClientRect().width || 320) +
      16;
    if (prevBtn)
      prevBtn.addEventListener("click", () =>
        reviewSlider.scrollBy({ left: -cardWidth(), behavior: "smooth" })
      );
    if (nextBtn)
      nextBtn.addEventListener("click", () =>
        reviewSlider.scrollBy({ left: cardWidth(), behavior: "smooth" })
      );
  }

  // Booking form simulation
  const bookingForm = qs("#booking-form");
  if (bookingForm) {
    bookingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Basic validation (browser already ensures required), grab values safely
      const formData = new FormData(bookingForm);
      const name = formData.get("name") || "Guest";
      const date = formData.get("date") || "";
      const time = formData.get("time") || "";
      const guests = formData.get("guests") || "1";
      const msgEl = qs("#booking-message");
      if (msgEl) {
        msgEl.hidden = false;
        msgEl.textContent = `Thanks ${String(name)} — your table for ${String(
          guests
        )} on ${String(date)} at ${String(
          time
        )} is provisionally reserved. We will confirm by email shortly.`;
        // Add subtle focus for screen readers
        msgEl.focus && msgEl.focus();
      }
      // simulate form disable and re-enable after a short time
      const submitBtn = bookingForm.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        setTimeout(() => {
          submitBtn.disabled = false;
        }, 2500);
      }
      bookingForm.reset();
    });
  }

  // Year in footer
  const yearSpans = qsa("#year");
  const y = new Date().getFullYear();
  yearSpans.forEach((sp) => {
    sp.textContent = String(y);
  });

  // Keyboard accessibility: ensure interactive elements focus styles present and tab order natural
  // (Most are native focusable; add role=button to custom ones if necessary.)

  // Attach theme toggles
  if (themeToggleButtons.length) {
    themeToggleButtons.forEach((btn) => {
      btn.addEventListener("click", toggleTheme);
    });
    loadTheme();
  } else {
    loadTheme();
  }

  // On load, add 'reveal' class to common elements so IntersectionObserver will reveal them
  document.addEventListener("DOMContentLoaded", () => {
    qsa(
      ".card, .section, .panel, .stat, .tilt, .review-card, .chef-card"
    ).forEach((el) => {
      if (!el.classList.contains("reveal")) el.classList.add("reveal");
    });
  });

  // Ensure all images have alt (best effort, cannot enforce but attempt to warn in console)
  qsa("img").forEach((img) => {
    if (!img.hasAttribute("alt") || img.getAttribute("alt").trim() === "") {
      console.warn("Image missing alt text:", img);
    }
  });
})();
