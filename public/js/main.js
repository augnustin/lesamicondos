// Les Amicondos — scripts du site (chargé en defer, le DOM est prêt)

// ---- Cube animé (logo) ----
(function(){
  var K = '#141413', BLUE = '#1381c4', YELLOW = '#fecd35', PINK = '#eb597c', GREEN = '#14963d', GROUT = '#ffffff';
  var TOP = [[K, BLUE, YELLOW], [K, PINK, K], [YELLOW, K, GREEN]];
  var BLACK1 = [[K, K, K]], BLACK2 = [[K, K, K], [K, K, K]], BLACK3 = [[K, K, K], [K, K, K], [K, K, K]];
  var LOWER = { pz: [[K, K, K], [K, GREEN, K]], px: [[BLUE, K, K], [K, K, PINK]], mx: BLACK2, mz: BLACK2 };
  var UPPER = { pz: BLACK1, px: BLACK1, mx: BLACK1, mz: BLACK1 };

  // Angles ajustés sur le logo original (assets/Logo cube seul.png)
  var YAW = -60 * Math.PI / 180, PITCH = 28 * Math.PI / 180, TOP_OFFSET = 27 * Math.PI / 180;
  var TURN_MS = 650, HOLD_MS = 350, REVERSE_SPEED = 1.8;

  function rotY(p, a){ var c = Math.cos(a), s = Math.sin(a); return [c*p[0] + s*p[2], p[1], -s*p[0] + c*p[2]]; }

  function roundedRect(inset, r){
    var pts = [], lo = inset, hi = 1 - inset, n = 6;
    [[hi-r, hi-r, 0], [lo+r, hi-r, 90], [lo+r, lo+r, 180], [hi-r, lo+r, 270]].forEach(function(c){
      for (var i = 0; i <= n; i++){ var a = (c[2] + 90*i/n) * Math.PI/180; pts.push([c[0] + r*Math.cos(a), c[1] + r*Math.sin(a)]); }
    });
    return pts;
  }
  var STICKER = roundedRect(0.075, 0.14), BASE = roundedRect(-0.03, 0.2);

  function facePolys(origin, U, V, grid, twist){
    var rows = grid.length, cols = grid[0].length, out = [];
    function pt(u, v){ return rotY([0,1,2].map(function(i){ return origin[i] + u*U[i] + v*V[i]; }), twist); }
    out.push([BASE.map(function(q){ return pt(q[0]*cols, q[1]*rows); }), GROUT]);
    grid.forEach(function(row, r){ row.forEach(function(color, c){
      out.push([STICKER.map(function(q){ return pt(c + q[0], r + q[1]); }), color]);
    }); });
    return out;
  }

  function facesCamera(n, twist){
    n = rotY(rotY(n, twist), YAW);
    return Math.sin(PITCH)*n[1] + Math.cos(PITCH)*n[2] > 1e-6;
  }

  function block(y0, y1, top, sides, twist){
    var faces = [
      [[0,1,0], facePolys([-1.5,y1,-1.5], [1,0,0], [0,0,1], top, twist)],
      [[0,-1,0], facePolys([-1.5,y0,-1.5], [1,0,0], [0,0,1], BLACK3, twist)],
      [[0,0,1], facePolys([-1.5,y1,1.5], [1,0,0], [0,-1,0], sides.pz, twist)],
      [[1,0,0], facePolys([1.5,y1,1.5], [0,0,-1], [0,-1,0], sides.px, twist)],
      [[-1,0,0], facePolys([-1.5,y1,-1.5], [0,0,1], [0,-1,0], sides.mx, twist)],
      [[0,0,-1], facePolys([1.5,y1,-1.5], [-1,0,0], [0,-1,0], sides.mz, twist)]
    ];
    return faces.filter(function(f){ return facesCamera(f[0], twist); })
                .reduce(function(acc, f){ return acc.concat(f[1]); }, []);
  }

  function draw(ctx, size, zoom, angle){
    var scale = size * zoom * 68 / 360, cx = size / 2, cy = size / 2 + size * 6 / 360;
    var cp = Math.cos(PITCH), sp = Math.sin(PITCH);
    ctx.clearRect(0, 0, size, size);
    block(-1.5, 0.5, BLACK3, LOWER, 0).concat(block(0.5, 1.5, TOP, UPPER, TOP_OFFSET + angle)).forEach(function(poly){
      ctx.beginPath();
      poly[0].forEach(function(p, i){
        p = rotY(p, YAW);
        var x = cx + p[0]*scale, y = cy - (cp*p[1] - sp*p[2])*scale;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = poly[1];
      ctx.fill();
    });
  }

  function ease(t){ return 0.5 - 0.5*Math.cos(Math.PI*t); }
  var PERIOD = TURN_MS + HOLD_MS;
  function angleAt(t){
    var q = Math.floor(t / PERIOD), local = t - q*PERIOD;
    return (q + ease(Math.min(1, local / TURN_MS))) * Math.PI / 2;
  }

  function setup(canvas){
    var ctx = canvas.getContext('2d'), size = 0, t = 0, active = false, last = null, raf = null;
    var zoom = parseFloat(canvas.dataset.zoom) || 1;
    var target = canvas.closest('a') || canvas;
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize(){
      var dpr = window.devicePixelRatio || 1;
      size = canvas.clientWidth;
      if (!size) return;
      canvas.width = canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(ctx, size, zoom, angleAt(t));
    }

    function tick(now){
      var dt = last === null ? 16 : now - last;
      last = now;
      if (active){
        t += dt;
      } else {
        var q = Math.floor(t / PERIOD);
        if (t - q*PERIOD > TURN_MS) t = q*PERIOD + TURN_MS;
        t = Math.max(0, t - dt*REVERSE_SPEED);
      }
      draw(ctx, size, zoom, angleAt(t));
      if (active || t > 0) raf = requestAnimationFrame(tick);
      else { raf = null; last = null; }
    }

    function start(){ if (reduceMotion) return; active = true; if (!raf){ last = null; raf = requestAnimationFrame(tick); } }
    function stop(){ active = false; if (!raf && t > 0){ last = null; raf = requestAnimationFrame(tick); } }

    target.addEventListener('mouseenter', start);
    target.addEventListener('mouseleave', stop);
    target.addEventListener('focus', start);
    target.addEventListener('blur', stop);
    if (target === canvas){
      canvas.addEventListener('touchstart', function(){ active ? stop() : start(); }, { passive: true });
    }
    new ResizeObserver(resize).observe(canvas);
    resize();
  }

  document.querySelectorAll('canvas.amicondos-cube').forEach(setup);
})();

// ---- Vidéo YouTube : remplace la miniature par le lecteur au clic ----
(function(){
  document.addEventListener('click', function(e){
    var link = e.target.closest && e.target.closest('a[data-yt]');
    if (!link) return;
    e.preventDefault();
    var box = document.createElement('div');
    box.className = link.className;
    var frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + link.dataset.yt + '?autoplay=1&rel=0';
    frame.title = 'Vidéo de présentation des Amicondos';
    frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    box.appendChild(frame);
    link.replaceWith(box);
  });
})();

// ---- Formulaire de contact (web3forms) ----
(function(){
  document.addEventListener('submit', async function(e){
    var form = e.target;
    if (form.id !== 'contact-form') return;
    e.preventDefault();
    var btn = form.querySelector('button[type="submit"]');
    var status = form.querySelector('#contact-status');
    var formData = new FormData(form);
    formData.append('access_key', '5a3fb266-0889-4526-8e46-937f0724df51');
    var originalText = btn.textContent;
    btn.textContent = 'Envoi en cours…';
    btn.disabled = true;
    status.hidden = true;
    function show(msg, ok){
      status.textContent = msg;
      status.style.color = ok ? '#006c32' : '#cc0347';
      status.hidden = false;
    }
    try {
      var response = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
      var data = await response.json();
      if (response.ok) {
        show('Merci ! Votre message a bien été envoyé, nous vous répondrons rapidement.', true);
        form.reset();
      } else {
        show('Le message n\u2019a pas pu être envoyé : ' + data.message, false);
      }
    } catch (err) {
      show('Le message n\u2019a pas pu être envoyé. Vérifiez votre connexion et réessayez, ou écrivez-nous à lesamicondos@gmail.com.', false);
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
})();

// ---- Actualités : modale ----
(function(){
  var dialog = null;
  function build(){
    dialog = document.createElement('dialog');
    dialog.className = 'news-modal';
    dialog.setAttribute('aria-labelledby', 'news-modal-title');
    dialog.innerHTML =
      '<button type="button" class="news-modal-close" aria-label="Fermer">×</button>' +
      '<a class="news-modal-media" target="_blank" rel="noopener" title="Voir l’image en grand"><img alt=""></a>' +
      '<div class="news-modal-body">' +
        '<span class="cond news-modal-date"></span>' +
        '<h3 id="news-modal-title"></h3>' +
        '<div class="news-modal-text"></div>' +
      '</div>';
    dialog.querySelector('.news-modal-close').addEventListener('click', function(){ dialog.close(); });
    dialog.addEventListener('click', function(e){ if (e.target === dialog) dialog.close(); });
    dialog.addEventListener('close', function(){
      if (location.hash.indexOf('#actu-') === 0) history.replaceState(null, '', location.pathname + location.search + '#actualites');
    });
    document.body.appendChild(dialog);
  }
  function open(id){
    var link = document.querySelector('[data-news="' + id + '"]');
    var card = link && link.closest('.news-card');
    if (!card) return false;
    if (!dialog) build();
    var img = card.querySelector('.news-img');
    var full = img.dataset.full || img.src;
    dialog.querySelector('.news-modal-media').href = full;
    var big = dialog.querySelector('.news-modal-media img');
    big.src = full;
    big.alt = img.alt;
    dialog.querySelector('.news-modal-date').textContent = card.querySelector('.news-date').textContent;
    dialog.querySelector('h3').textContent = card.querySelector('.news-title').textContent;
    dialog.querySelector('.news-modal-text').innerHTML = card.querySelector('.news-full').innerHTML;
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    return true;
  }
  document.addEventListener('click', function(e){
    var link = e.target.closest && e.target.closest('a[data-news]');
    if (!link) return;
    e.preventDefault();
    if (open(link.dataset.news)) history.replaceState(null, '', '#' + link.dataset.news);
  });
  function fromHash(){
    var id = location.hash.slice(1);
    if (id.indexOf('actu-') === 0) open(id);
  }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
