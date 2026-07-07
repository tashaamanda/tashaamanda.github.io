/* ============================================================
   Tasha Amanda — Portfolio interactions
   Generative motion per portfolio.json: scramble, custom cursor,
   randomized flicker, mouse-follow warmth. No looped easing.
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer  = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- Scroll progress ---------- */
  var progress = document.querySelector('.scroll-progress');
  if (progress) {
    var onScroll = function () {
      var h = document.documentElement;
      var scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
      progress.style.width = (scrolled * 100) + '%';
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Custom cursor (pink dot + trailing ring) ---------- */
  if (finePointer && !reduceMotion) {
    document.body.classList.add('cursor-on');
    var dot  = document.createElement('div'); dot.className  = 'cursor-dot';
    var ring = document.createElement('div'); ring.className = 'cursor-ring';
    document.body.appendChild(dot); document.body.appendChild(ring);

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my, started = false;

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left = mx + 'px'; dot.style.top = my + 'px';
      if (!started) { started = true; dot.classList.add('is-active'); ring.classList.add('is-active'); }
    });

    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.left = rx + 'px'; ring.style.top = ry + 'px';
      requestAnimationFrame(loop);
    })();

    var hoverSel = 'a, button, .work-row, .stat, .process-step, .tag, .cs-card';
    document.querySelectorAll(hoverSel).forEach(function (el) {
      el.addEventListener('mouseenter', function () { ring.classList.add('is-hover'); });
      el.addEventListener('mouseleave', function () { ring.classList.remove('is-hover'); });
    });
  }

  /* ---------- Hero name scramble / decode ---------- */
  // burst → decelerate → lock, letter by letter
  var scramblers = document.querySelectorAll('[data-scramble]');
  var glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>';
  // colours that flash while a letter is still scrambling; it locks to the default text colour
  var scrambleColors = ['#ffa6dd', '#ffc2e8', '#e58fa6', '#b79ce0'];
  scramblers.forEach(function (node) {
    var finalText = node.getAttribute('data-scramble');
    var chars = finalText.split('');
    // build spans
    node.textContent = '';
    var spans = chars.map(function (ch) {
      var s = document.createElement('span');
      s.className = 'char';
      s.textContent = ch === ' ' ? ' ' : '';
      node.appendChild(s);
      return s;
    });
    if (reduceMotion) { spans.forEach(function (s, i) { s.textContent = chars[i]; }); return; }

    var settled = 0;
    chars.forEach(function (ch, i) {
      if (ch === ' ') { settled++; return; }
      var start = 220 + i * 70;          // staggered start, letter by letter
      var dur   = 360 + Math.random() * 320;
      window.setTimeout(function () {
        var t0 = null, lastCol = 0;
        (function tick(ts) {
          if (t0 === null) t0 = ts;
          var p = (ts - t0) / dur;
          // lock: final letter, back to the default text colour
          if (p >= 1) { spans[i].textContent = ch; spans[i].style.color = ''; return; }
          // decelerate: scramble faster early, slower late
          spans[i].textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
          // flash a new colour every ~55ms so the pops read as distinct, not a blur
          if (ts - lastCol > 55) {
            spans[i].style.color = scrambleColors[Math.floor(Math.random() * scrambleColors.length)];
            lastCol = ts;
          }
          requestAnimationFrame(tick);
        })(performance.now ? performance.now() : Date.now());
      }, start);
    });
  });

  /* ---------- Heading accent words: scramble-morph on scroll ----------
     Same idea as the title, but per accent word: (optionally) start on a
     decoy word (data-from), scramble through glyphs + colours, then
     decelerate into the real word and lock to the pink accent colour. */
  var morphEls = document.querySelectorAll('.scramble-word');
  if (morphEls.length && !reduceMotion) {
    morphEls.forEach(function (el) { el._finalWord = el.textContent; });

    var morphWord = function (el) {
      var finalW = el._finalWord;
      var run = function () {
        el.textContent = '';
        var letters = finalW.split('').map(function (ch) {
          var s = document.createElement('span');
          // seed with a glyph (not empty) so the word keeps its width — no layout jump mid-sentence
          if (ch === ' ') { s.textContent = ' '; }
          else {
            s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
            s.style.color = scrambleColors[Math.floor(Math.random() * scrambleColors.length)];
          }
          el.appendChild(s);
          return s;
        });
        var t0 = null, lastStep = 0, dur = 1500;   // slower than the title = the slow-motion feel
        (function tick(ts) {
          if (t0 === null) t0 = ts;
          var p = (ts - t0) / dur;
          if (p >= 1) { el.textContent = finalW; return; }
          // easeOut: letters lock fast early, then slowly — slow motion before the final settle
          var pe = 1 - Math.pow(1 - p, 2.4);
          // churn slows as it goes (24ms -> ~140ms between glyph changes)
          var step = ts - lastStep > (24 + 120 * p);
          if (step) lastStep = ts;
          letters.forEach(function (s, k) {
            var lockAt = (k + 1) / letters.length;
            if (pe >= lockAt) {
              if (s.textContent !== finalW[k]) { s.textContent = finalW[k]; s.style.color = ''; }
            } else if (step) {
              s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
              s.style.color = scrambleColors[Math.floor(Math.random() * scrambleColors.length)];
            }
          });
          requestAnimationFrame(tick);
        })(performance.now ? performance.now() : Date.now());
      };
      var fromW = el.getAttribute('data-from');
      if (fromW) { el.textContent = fromW; window.setTimeout(run, 460); }   // show decoy, then scramble
      else run();
    };

    if ('IntersectionObserver' in window) {
      var mObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { morphWord(en.target); mObs.unobserve(en.target); }
        });
      }, { threshold: 0.6 });
      morphEls.forEach(function (el) { mObs.observe(el); });
    } else {
      morphEls.forEach(function (el) { morphWord(el); });
    }
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('is-visible'); io.unobserve(en.target); }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      reveals.forEach(function (el) { io.observe(el); });
    } else {
      reveals.forEach(function (el) { el.classList.add('is-visible'); });
    }
  }

  /* ---------- Stat-box randomized flicker (not a loop) ---------- */
  var stats = document.querySelectorAll('.stat');
  if (stats.length && !reduceMotion) {
    var flick = function () {
      var pick = stats[Math.floor(Math.random() * stats.length)];
      pick.classList.add('flick');
      window.setTimeout(function () { pick.classList.remove('flick'); }, 420 + Math.random() * 380);
      window.setTimeout(flick, 900 + Math.random() * 2200);   // randomized cadence
    };
    window.setTimeout(flick, 1600);
  }

  /* ---------- Hero mouse-follow warmth ---------- */
  var glow = document.querySelector('.hero-glow');
  var hero = document.querySelector('.hero');
  if (glow && hero && finePointer && !reduceMotion) {
    hero.addEventListener('mousemove', function (e) {
      var r = hero.getBoundingClientRect();
      glow.style.left = (e.clientX - r.left) + 'px';
      glow.style.top  = (e.clientY - r.top) + 'px';
      glow.style.opacity = '1';
    });
    hero.addEventListener('mouseleave', function () { glow.style.opacity = '0.55'; });
  }

  /* ---------- Mobile nav ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var links  = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('open');
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { toggle.classList.remove('open'); links.classList.remove('open'); });
    });
  }

  /* ---------- Active nav link on scroll (landing only) ---------- */
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-link[href^="#"]');
  if (sections.length && navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var id = en.target.getAttribute('id');
          navLinks.forEach(function (l) {
            l.style.color = l.getAttribute('href') === '#' + id ? 'var(--accent-bright)' : '';
          });
        }
      });
    }, { threshold: 0.4 });
    sections.forEach(function (s) { spy.observe(s); });
  }
})();
