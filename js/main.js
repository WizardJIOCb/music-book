/* Romana's Book - Main JavaScript */

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all components
  initHeader();
  initMobileNav();
  initScrollReveal();
  initFloatingNotes();
  initParticles();
  initSmoothScroll();
  initBookCards();
  initMagneticButtons();
});

/* ================================
   Header Scroll Effect
================================ */
function initHeader() {
  const header = document.querySelector('.header');
  if (!header) return;
  
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
    
    lastScroll = currentScroll;
  });
}

/* ================================
   Mobile Navigation
================================ */
function initMobileNav() {
  const toggle = document.querySelector('.nav__toggle');
  const navList = document.querySelector('.nav__list');
  
  if (!toggle || !navList) return;
  
  toggle.addEventListener('click', () => {
    toggle.classList.toggle('nav__toggle--active');
    navList.classList.toggle('nav__list--active');
    document.body.classList.toggle('nav-open');
  });
  
  // Close on link click
  navList.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      toggle.classList.remove('nav__toggle--active');
      navList.classList.remove('nav__list--active');
      document.body.classList.remove('nav-open');
    });
  });
}

/* ================================
   Scroll Reveal Animation
================================ */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  
  if (!reveals.length) return;
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal--visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });
  
  reveals.forEach(el => observer.observe(el));
}

/* ================================
   Floating Musical Notes
================================ */
function initFloatingNotes() {
  const container = document.querySelector('.hero__notes');
  if (!container) return;
  
  const notes = ['♪', '♫', '♬', '♩', '𝄞'];
  const noteCount = 15;
  
  for (let i = 0; i < noteCount; i++) {
    const note = document.createElement('span');
    note.className = 'hero__note';
    note.textContent = notes[Math.floor(Math.random() * notes.length)];
    note.style.left = `${Math.random() * 100}%`;
    note.style.animationDelay = `${Math.random() * 8}s`;
    note.style.animationDuration = `${6 + Math.random() * 4}s`;
    note.style.fontSize = `${1 + Math.random() * 1.5}rem`;
    container.appendChild(note);
  }
}

/* ================================
   Particle System
================================ */
function initParticles() {
  const container = document.querySelector('.particles-container');
  if (!container) return;
  
  const particleCount = 20;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    particle.style.animationDuration = `${6 + Math.random() * 4}s`;
    container.appendChild(particle);
  }
}

/* ================================
   Smooth Scroll
================================ */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      
      if (target) {
        const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
        const targetPosition = target.offsetTop - headerHeight;
        
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ================================
   Book Cards Interaction
================================ */
function initBookCards() {
  const cards = document.querySelectorAll('.book-card');
  
  cards.forEach(card => {
    card.addEventListener('mouseenter', function(e) {
      this.style.transform = 'translateY(-12px) scale(1.02)';
    });
    
    card.addEventListener('mouseleave', function(e) {
      this.style.transform = '';
    });
    
    // 3D Tilt Effect
    card.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 20;
      const rotateY = (centerX - x) / 20;
      
      this.style.transform = `translateY(-12px) scale(1.02) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
  });
}

/* ================================
   Magnetic Buttons
================================ */
function initMagneticButtons() {
  const buttons = document.querySelectorAll('.btn, .magnetic-btn');
  
  buttons.forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      this.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px)`;
    });
    
    btn.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });
}

/* ================================
   Page Transition
================================ */
function pageTransition(url) {
  const transition = document.querySelector('.page-transition');
  if (!transition) {
    window.location.href = url;
    return;
  }
  
  transition.classList.add('page-transition--active');
  
  setTimeout(() => {
    window.location.href = url;
  }, 500);
}

/* ================================
   Form Handling
================================ */
function initForms() {
  const forms = document.querySelectorAll('form[data-ajax]');
  
  forms.forEach(form => {
    form.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = this.querySelector('[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.textContent = 'Отправка...';
      submitBtn.disabled = true;
      
      try {
        const formData = new FormData(this);
        // Handle form submission
        
        submitBtn.textContent = 'Отправлено!';
        this.reset();
        
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }, 2000);
        
      } catch (error) {
        submitBtn.textContent = 'Ошибка';
        setTimeout(() => {
          submitBtn.textContent = originalText;
          submitBtn.disabled = false;
        }, 2000);
      }
    });
  });
}

/* ================================
   Image Lazy Loading
================================ */
function initLazyLoading() {
  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  });
  
  images.forEach(img => imageObserver.observe(img));
}

/* ================================
   Counter Animation
================================ */
function animateCounter(element, target, duration = 2000) {
  let start = 0;
  const increment = target / (duration / 16);
  
  function updateCounter() {
    start += increment;
    if (start < target) {
      element.textContent = Math.floor(start);
      requestAnimationFrame(updateCounter);
    } else {
      element.textContent = target;
    }
  }
  
  updateCounter();
}

/* ================================
   Lightbox for Gallery
================================ */
class Lightbox {
  constructor() {
    this.createLightbox();
    this.bindEvents();
  }
  
  createLightbox() {
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.innerHTML = `
      <div class="lightbox__overlay"></div>
      <div class="lightbox__content">
        <button class="lightbox__close">&times;</button>
        <img class="lightbox__image" src="" alt="">
        <button class="lightbox__prev">&larr;</button>
        <button class="lightbox__next">&rarr;</button>
      </div>
    `;
    document.body.appendChild(lightbox);
    
    this.lightbox = lightbox;
    this.image = lightbox.querySelector('.lightbox__image');
    this.images = [];
    this.currentIndex = 0;
  }
  
  bindEvents() {
    document.querySelectorAll('.book-gallery__item').forEach((item, index) => {
      const img = item.querySelector('img');
      this.images.push(img.src);
      
      item.addEventListener('click', () => this.open(index));
    });
    
    this.lightbox.querySelector('.lightbox__close').addEventListener('click', () => this.close());
    this.lightbox.querySelector('.lightbox__overlay').addEventListener('click', () => this.close());
    this.lightbox.querySelector('.lightbox__prev').addEventListener('click', () => this.prev());
    this.lightbox.querySelector('.lightbox__next').addEventListener('click', () => this.next());
    
    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.classList.contains('lightbox--active')) return;
      
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowLeft') this.prev();
      if (e.key === 'ArrowRight') this.next();
    });
  }
  
  open(index) {
    this.currentIndex = index;
    this.image.src = this.images[index];
    this.lightbox.classList.add('lightbox--active');
    document.body.style.overflow = 'hidden';
  }
  
  close() {
    this.lightbox.classList.remove('lightbox--active');
    document.body.style.overflow = '';
  }
  
  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.images.length) % this.images.length;
    this.image.src = this.images[this.currentIndex];
  }
  
  next() {
    this.currentIndex = (this.currentIndex + 1) % this.images.length;
    this.image.src = this.images[this.currentIndex];
  }
}

// Initialize lightbox if gallery exists
if (document.querySelector('.book-gallery__item')) {
  new Lightbox();
}

/* ================================
   Utility Functions
================================ */

// Debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}
