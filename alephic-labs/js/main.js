/* ==========================================================================
   ALEPHIC LABS — Main JavaScript
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------- Navigation: Scroll Effect ---------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile Navigation ---------- */
  const toggle = document.querySelector('.nav__toggle');
  const mobileNav = document.querySelector('.nav__mobile');
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active');
      mobileNav.classList.toggle('active');
      document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
    });

    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.classList.remove('active');
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------- Scroll Reveal (Intersection Observer) ---------- */
  const revealElements = document.querySelectorAll('.reveal');
  if (revealElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    revealElements.forEach(el => observer.observe(el));
  }

  /* ---------- Accordion ---------- */
  document.querySelectorAll('.accordion__trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion__item');
      const isActive = item.classList.contains('active');

      // Close all in same accordion group
      item.closest('.accordion')?.querySelectorAll('.accordion__item').forEach(i => {
        i.classList.remove('active');
      });

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });

  /* ---------- Smooth scroll for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---------- Animated Counter ---------- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length > 0) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.count, 10);
          const suffix = el.dataset.suffix || '';
          const prefix = el.dataset.prefix || '';
          const duration = 1500;
          const start = performance.now();

          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(eased * target);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(c => counterObserver.observe(c));
  }

  /* ---------- Dashboard Bar Animation ---------- */
  const bars = document.querySelectorAll('.dashboard-preview__bar');
  if (bars.length > 0) {
    const barObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const barContainer = entry.target;
          barContainer.querySelectorAll('.dashboard-preview__bar').forEach(bar => {
            const h = bar.dataset.height || '50%';
            bar.style.height = h;
          });
          barObserver.unobserve(barContainer);
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('.dashboard-preview__bars').forEach(container => {
      barObserver.observe(container);
    });
  }

  /* ---------- Form Submission Handler ---------- */
  // PASTE YOUR GOOGLE APPS SCRIPT WEB APP URL BELOW (see google-apps-script.js for setup)
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxblpSFEwjNFA0Fn1Nuc6Bi7S9eZd2bB_tZea3D03u-mJzQbZn_xuRQsSwFfRYM-4mL/exec';

  document.querySelectorAll('form[data-form]').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const btn = form.querySelector('button[type="submit"]');
      const originalHTML = btn?.innerHTML;
      const formType = form.dataset.form;

      // Remove any previous status banners
      const prevBanner = form.parentNode.querySelector('.banner');
      if (prevBanner) prevBanner.remove();

      if (btn) {
        btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.5rem;">Submitting<span class="btn__icon" style="animation:pulse-dot 1s ease-in-out infinite;">...</span></span>';
        btn.disabled = true;
      }

      // Collect form data into an object
      const formData = { _formType: formType };
      const inputs = form.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          if (input.checked) {
            if (!formData[input.name]) formData[input.name] = [];
            formData[input.name].push(input.value);
          }
        } else if (input.value && input.name) {
          formData[input.name] = input.value;
        }
      });

      try {
        const response = await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });

        // Show success (no-cors means we can't read response, but submission goes through)
        if (btn) {
          btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:0.5rem;">&#10003; Submitted!</span>';
          btn.style.background = 'var(--accent-green)';
        }

        // Fire GA4 conversion event for Google Ads tracking
        if (typeof gtag !== 'undefined') {
          gtag('event', 'generate_lead', {
            event_category: 'Form Submission',
            event_label: formType
          });
        }

        const success = document.createElement('div');
        success.className = 'banner mt-4';
        success.innerHTML = `
          <span class="banner__icon">&#10003;</span>
          <span>Thank you! We've received your submission and will be in touch soon.</span>
        `;
        form.parentNode.insertBefore(success, form.nextSibling);
        form.reset();

        setTimeout(() => {
          if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
            btn.style.background = '';
          }
        }, 4000);

      } catch (error) {
        // Show error state
        if (btn) {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }

        const errorBanner = document.createElement('div');
        errorBanner.className = 'banner mt-4';
        errorBanner.style.borderColor = 'rgba(255, 80, 80, 0.2)';
        errorBanner.style.background = 'rgba(255, 80, 80, 0.06)';
        errorBanner.innerHTML = `
          <span class="banner__icon" style="color:#ff5050;">&#10007;</span>
          <span>Something went wrong. Please try again or email us directly at <a href="mailto:contact@alephiclabs.com">contact@alephiclabs.com</a>.</span>
        `;
        form.parentNode.insertBefore(errorBanner, form.nextSibling);

        setTimeout(() => errorBanner.remove(), 6000);
      }
    });
  });

  /* ---------- Typing Effect for Code Blocks ---------- */
  document.querySelectorAll('[data-typing]').forEach(el => {
    const text = el.innerHTML;
    el.innerHTML = '';
    let i = 0;
    const typeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const type = () => {
            if (i < text.length) {
              // Handle HTML tags - add them all at once
              if (text[i] === '<') {
                const closingIndex = text.indexOf('>', i);
                el.innerHTML += text.substring(i, closingIndex + 1);
                i = closingIndex + 1;
              } else {
                el.innerHTML += text[i];
                i++;
              }
              setTimeout(type, 15);
            }
          };
          type();
          typeObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    typeObserver.observe(el);
  });

  /* ---------- Particle Canvas (Hero Background) ---------- */
  const canvas = document.getElementById('hero-particles');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let particles = [];
    let animId;

    const resize = () => {
      canvas.width = canvas.parentElement.offsetWidth;
      canvas.height = canvas.parentElement.offsetHeight;
    };

    const createParticles = () => {
      particles = [];
      const count = Math.floor((canvas.width * canvas.height) / 15000);
      for (let i = 0; i < Math.min(count, 80); i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 1.5 + 0.5,
          opacity: Math.random() * 0.4 + 0.1
        });
      }
    };

    const drawParticles = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p, i) => {
        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 212, 255, ${p.opacity})`;
        ctx.fill();

        // Draw connections
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[j].x - p.x;
          const dy = particles[j].y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 212, 255, ${0.06 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animId = requestAnimationFrame(drawParticles);
    };

    resize();
    createParticles();
    drawParticles();

    window.addEventListener('resize', () => {
      resize();
      createParticles();
    });

    // Pause when not visible
    const heroObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animId) drawParticles();
        } else {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });
    });
    heroObserver.observe(canvas.parentElement);
  }
});
