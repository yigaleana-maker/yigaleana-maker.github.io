/* Prueba los reproductores de Headpod: un teléfono de muestra con los cuatro estilos.
   Todo se siente como en la app: resortes, formas que cambian y, en Android, vibración al tacto. */
(function () {
  var raiz = document.getElementById('demo-rep');
  if (!raiz) return;
  var EN = raiz.getAttribute('data-lang') === 'en';
  var quieto = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = EN ? {
    estilos: ['Material 3', 'Turntable', 'Artwork', 'Classic'],
    pistas: ['Tap play: the cover changes shape and the wave comes alive. Press a button and it widens.',
      'Tap play: the arm lands on the record. Drag the arm to move through the episode.',
      'Swipe the cover sideways to change episodes. Drag the scale to move the red needle.',
      'The original design: the big play changes shape when it plays.'],
    de: 'of', eps: [['Your show', 'This is how Headpod feels'], ['Another show', 'An episode for the road'], ['Stories', 'Tales to hear at night']]
  } : {
    estilos: ['Material 3', 'Disco', 'Portada', 'Clásico'],
    pistas: ['Toca el play: la portada cambia de forma y la onda cobra vida. Al apretar un botón, se ensancha.',
      'Toca el play: el brazo baja al disco. Arrastra el brazo para moverte en el episodio.',
      'Desliza la portada a los lados para cambiar de episodio. Arrastra la escala para mover la aguja roja.',
      'El diseño original: el play grande cambia de forma al sonar.'],
    de: 'de', eps: [['Tu programa', 'Así se siente Headpod'], ['Otro programa', 'Un episodio para el camino'], ['Relatos', 'Historias para escuchar de noche']]
  };
  var COLORES = [['#f1953e', '#ff5f6d'], ['#5b8def', '#9b6bff'], ['#2fae7c', '#1b6f9e']];
  var LETRAS = ['H', 'O', 'R'];
  var IC = {
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pausa: '<svg viewBox="0 0 24 24"><path d="M7 5h3.6v14H7zM13.4 5H17v14h-3.6z"/></svg>',
    corazon: '<svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
    reloj: '<svg viewBox="0 0 24 24"><path d="M12 22a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm-1-9.4V7h2v4.6l3.4 2-1 1.8zM9 2h6v2H9z"/></svg>',
    guardar: '<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-6-4-6 4z"/></svg>',
    bajar: '<svg viewBox="0 0 24 24"><path d="M12 3a1 1 0 0 1 1 1v9.2l3.3-3.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.4L11 13.2V4a1 1 0 0 1 1-1zM5 19h14a1 1 0 1 1 0 2H5a1 1 0 1 1 0-2z"/></svg>'
  };

  /* Lo que se comparte entre estilos: si suena en uno, sigue sonando en otro */
  var S = { estilo: 0, ep: 0, sonando: false, pos: 9 * 60, dur: 42 * 60, meGusta: false, guardado: false, timer: false, bajado: false, iv: 0 };
  var VEL = [1, 1.25, 1.5, 2];
  var anim = { amp: 0, fase: 0, galleta: 0, giro: 0, vGiro: 0, brazo: 0, aguja: 0.2 };

  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
  function mmss(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = ('0' + s % 60).slice(-2); return h ? h + ':' + ('0' + m).slice(-2) + ':' + x : m + ':' + x; }
  function falta() { var m = Math.round((S.dur - S.pos) / 60); return '-' + Math.max(1, m) + 'm'; }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }
  function cv(tam, extra) { var c = COLORES[S.ep]; return '<div class="dm-cv ' + (extra || '') + '" style="--c1:' + c[0] + ';--c2:' + c[1] + ';font-size:' + tam + 'px">' + LETRAS[S.ep] + '</div>'; }
  function tocar(btn, fn) {
    btn.addEventListener('pointerdown', function () { vibrar(8); });
    btn.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
  }
  function playPausa() { S.sonando = !S.sonando; vibrar(14); refrescar(); }
  function saltar(s) { S.pos = Math.max(0, Math.min(S.dur, S.pos + s)); refrescar(); }

  /* ——— Armado ——— */
  raiz.innerHTML = '';
  var sel = el('<div class="demo-sel" role="group"><span class="indicador"></span></div>');
  T.estilos.forEach(function (n, i) {
    var b = el('<button type="button" aria-pressed="' + (i === 0) + '">' + n + '</button>');
    b.addEventListener('click', function () { cambiarEstilo(i); });
    sel.appendChild(b);
  });
  var tel = el('<div class="demo-tel"><div class="demo-pantalla"></div></div>');
  var pantalla = tel.firstChild;
  var pista = el('<p class="demo-pista"></p>');
  raiz.appendChild(sel); raiz.appendChild(tel); raiz.appendChild(pista);

  var vista = null, actual = null;
  function cambiarEstilo(i) {
    if (i === S.estilo && vista) return;
    vibrar(10);
    S.estilo = i;
    Array.prototype.forEach.call(sel.querySelectorAll('button'), function (b, k) { b.setAttribute('aria-pressed', k === i); });
    sel.querySelector('.indicador').style.transform = 'translateX(' + (i * 100) + '%)';
    pista.textContent = T.pistas[i];
    var vieja = vista;
    var nueva = el('<div class="demo-vista entrando"></div>');
    actual = [construirM3, construirDisco, construirPortada, construirClasico][i](nueva);
    pantalla.appendChild(nueva);
    requestAnimationFrame(function () { requestAnimationFrame(function () { nueva.classList.remove('entrando'); }); });
    if (vieja) { vieja.classList.add('saliendo'); setTimeout(function () { vieja.remove(); }, 450); }
    vista = nueva;
    refrescar();
  }

  /* ——— La onda (Material 3 y Clásico) ——— */
  function onda(canvas, grosor, ondula) {
    var arrastrando = false, ultimaMarca = -1;
    function frac(e) { var r = canvas.getBoundingClientRect(); return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)); }
    canvas.addEventListener('pointerdown', function (e) { canvas.setPointerCapture(e.pointerId); arrastrando = true; S.pos = frac(e) * S.dur; vibrar(6); e.stopPropagation(); });
    canvas.addEventListener('pointermove', function (e) {
      if (!arrastrando) return; var f = frac(e); S.pos = f * S.dur;
      var m = Math.floor(f * 30); if (m !== ultimaMarca) { if (ultimaMarca >= 0) vibrar(3); ultimaMarca = m; }
    });
    canvas.addEventListener('pointerup', function () { arrastrando = false; refrescar(); });
    return function () {
      var dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      var c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      var mid = h / 2, x = Math.max(4, Math.min(w - 8, S.pos / S.dur * w)), hueco = 6;
      c.lineCap = 'round'; c.lineWidth = grosor;
      c.strokeStyle = '#57402c'; c.beginPath(); c.moveTo(x + hueco, mid); c.lineTo(w - 6, mid); c.stroke();
      c.fillStyle = '#f4bfa9'; c.beginPath(); c.arc(w - 3, mid, 2, 0, 7); c.fill();
      c.strokeStyle = '#f4bfa9'; c.beginPath();
      for (var px = 2; px <= x - hueco; px += 2) {
        var calma = Math.min(1, (x - hueco - px) / 24);
        var y = mid + (ondula ? Math.sin(px / 6 + anim.fase) * 3.4 * anim.amp * calma : 0);
        if (px === 2) c.moveTo(px, y); else c.lineTo(px, y);
      }
      c.stroke();
      var am = arrastrando ? 6 : 4, al = arrastrando ? 28 : 20;
      if (ondula) { c.beginPath(); if (c.roundRect) c.roundRect(x - am / 2, mid - al / 2, am, al, am / 2); else c.rect(x - am / 2, mid - al / 2, am, al); c.fill(); }
    };
  }

  /* ——— Material 3 ——— */
  function construirM3(v) {
    var ep = T.eps[S.ep];
    v.innerHTML = '<div class="m3"><div class="cab">' + cv(18) + '<div class="dm-show">' + ep[0] + '</div></div>' +
      '<div class="dm-tit">' + ep[1] + '</div>' +
      '<div class="dm-tiempos"><span class="t1"></span><b class="t2"></b></div>' +
      '<canvas class="dm-lienzo" style="width:100%;height:40px;margin-top:6px"></canvas>' +
      '<div class="grupo"><button class="dm-btn">−15</button><button class="dm-btn play"></button><button class="dm-btn">+15</button></div>' +
      '<div class="acc"><button class="dm-btn b-gusta">' + IC.corazon + '</button><button class="dm-btn b-vel">1×</button><button class="dm-btn b-timer">' + IC.reloj + '</button><button class="dm-btn b-guardar">' + IC.guardar + '</button><button class="dm-btn b-bajar">' + IC.bajar + '</button></div></div>';
    var grupo = v.querySelector('.grupo'), bs = grupo.querySelectorAll('.dm-btn');
    Array.prototype.forEach.call(bs, function (b) {
      b.addEventListener('pointerdown', function () { b.classList.add('apretado'); grupo.classList.add('algo'); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (t) { b.addEventListener(t, function () { b.classList.remove('apretado'); grupo.classList.remove('algo'); }); });
    });
    tocar(bs[0], function () { saltar(-15); }); tocar(bs[1], playPausa); tocar(bs[2], function () { saltar(15); });
    acciones(v);
    var dibujarOnda = onda(v.querySelector('canvas'), 4, true), portada = v.querySelector('.cab .dm-cv');
    return {
      refrescar: function () {
        bs[1].innerHTML = S.sonando ? IC.pausa : IC.play; bs[1].classList.toggle('son', S.sonando);
        v.querySelector('.t1').textContent = T.de + ' ' + mmss(S.dur); v.querySelector('.t2').textContent = falta();
      },
      cuadro: function () {
        dibujarOnda();
        v.querySelector('.t2').textContent = falta();
        /* La portada: galleta ondulada al sonar, cuadro redondeado en pausa */
        var pts = [], n = 60;
        for (var i = 0; i < n; i++) {
          var a = i / n * 2 * Math.PI, ca = Math.cos(a), sa = Math.sin(a);
          var rs = 1 / Math.pow(Math.pow(Math.abs(ca), 5) + Math.pow(Math.abs(sa), 5), 1 / 5);
          var rg = 1 - 0.07 + 0.07 * Math.cos(9 * a), r = rs + (rg - rs) * anim.galleta;
          pts.push((50 + 50 * r * ca).toFixed(1) + '% ' + (50 + 50 * r * sa).toFixed(1) + '%');
        }
        portada.style.clipPath = 'polygon(' + pts.join(',') + ')';
      }
    };
  }
  function acciones(v) {
    var g = v.querySelector('.b-gusta'), vel = v.querySelector('.b-vel'), tm = v.querySelector('.b-timer'), gu = v.querySelector('.b-guardar'), ba = v.querySelector('.b-bajar');
    function pintar() {
      if (g) g.classList.toggle('on', S.meGusta);
      if (vel) { vel.textContent = VEL[S.iv] + '×'; vel.classList.toggle('on', S.iv > 0); }
      if (tm) tm.classList.toggle('on', S.timer);
      if (gu) gu.classList.toggle('on', S.guardado);
      if (ba) ba.classList.toggle('on', S.bajado);
    }
    if (g) tocar(g, function () { S.meGusta = !S.meGusta; pintar(); });
    if (vel) tocar(vel, function () { S.iv = (S.iv + 1) % VEL.length; pintar(); });
    if (tm) tocar(tm, function () { S.timer = !S.timer; pintar(); });
    if (gu) tocar(gu, function () { S.guardado = !S.guardado; pintar(); });
    if (ba) tocar(ba, function () { S.bajado = !S.bajado; pintar(); });
    pintar();
  }

  /* ——— Disco ——— */
  /* Ángulos del brazo: en reposo vertical; al sonar, la aguja va de la orilla del disco hacia adentro */
  var GEO = (function () {
    var px = 280 - 18 - 36, py = 46, largo = 200, cx = -80 + 130, cy = 20 + 130;
    function radio(t) { var a = t * Math.PI / 180; var x = px - Math.sin(a) * largo, y = py + Math.cos(a) * largo; return Math.hypot(x - cx, y - cy); }
    var t0 = 0, t1 = 0;
    for (var t = 0; t < 80; t += 0.5) { if (!t0 && radio(t) < 122) t0 = t; if (t0 && radio(t) < 70) { t1 = t; break; } }
    return { t0: t0 || 22, t1: t1 || 45, px: px, py: py };
  })();
  function construirDisco(v) {
    var ep = T.eps[S.ep];
    v.innerHTML = '<div class="disco"><div class="vinilo">' + cv(44) + '</div><div class="brillo"></div><div class="base"></div>' +
      '<div class="brazo"><div class="tubo"></div><div class="cap"></div><div class="eje"></div></div>' +
      '<div class="txt"><div class="dm-tit">' + ep[1] + '</div><div class="dm-show" style="margin-top:6px">' + ep[0] + ' · <span class="t2"></span></div></div>' +
      '<div class="fila"><button class="dm-btn b-gusta">' + IC.corazon + '</button><button class="dm-btn">−15</button><button class="dm-btn play"></button><button class="dm-btn">+15</button><button class="dm-btn b-vel">1×</button></div></div>';
    var fila = v.querySelectorAll('.fila .dm-btn'), vinilo = v.querySelector('.vinilo'), brazo = v.querySelector('.brazo');
    tocar(fila[1], function () { saltar(-15); }); tocar(fila[2], playPausa); tocar(fila[3], function () { saltar(15); });
    acciones(v);
    /* El único gesto: arrastrar el brazo */
    var arrastre = false, ultima = -1;
    function anguloDe(e) {
      var r = v.getBoundingClientRect(), x = e.clientX - r.left - GEO.px, y = e.clientY - r.top - GEO.py;
      return Math.atan2(-x, y) * 180 / Math.PI;
    }
    brazo.querySelectorAll('.tubo,.cap').forEach(function (p) {
      p.style.pointerEvents = 'auto';
      p.addEventListener('pointerdown', function (e) { e.stopPropagation(); p.setPointerCapture(e.pointerId); arrastre = true; brazo.classList.add('arrastre'); vibrar(8); });
      p.addEventListener('pointermove', function (e) {
        if (!arrastre) return;
        var f = Math.max(0, Math.min(1, (anguloDe(e) - GEO.t0) / (GEO.t1 - GEO.t0)));
        S.pos = f * S.dur; var m = Math.floor(f * 25); if (m !== ultima) { if (ultima >= 0) vibrar(3); ultima = m; }
      });
      p.addEventListener('pointerup', function () { arrastre = false; brazo.classList.remove('arrastre'); refrescar(); });
    });
    return {
      refrescar: function () { fila[2].innerHTML = S.sonando ? IC.pausa : IC.play; fila[2].classList.toggle('son', S.sonando); v.querySelector('.t2').textContent = falta(); },
      cuadro: function () {
        vinilo.style.transform = 'rotate(' + anim.giro.toFixed(2) + 'deg)';
        var apoyado = S.sonando || arrastre;
        var ang = apoyado ? GEO.t0 + (GEO.t1 - GEO.t0) * (S.pos / S.dur) : -2;
        brazo.style.transform = 'rotate(' + ang.toFixed(2) + 'deg)';
        v.querySelector('.t2').textContent = falta();
      }
    };
  }

  /* ——— Portada completa, con su dial ——— */
  function construirPortada(v) {
    var ep = T.eps[S.ep], c = COLORES[S.ep];
    v.innerHTML = '<div class="portada"><div class="fondo" style="--c1:' + c[0] + ';--c2:' + c[1] + '"></div>' +
      '<div class="tarjeta dm-cv" style="--c1:' + c[0] + ';--c2:' + c[1] + '">' + LETRAS[S.ep] + '</div>' +
      '<div class="txt"><div class="dm-tit">' + ep[1] + '</div><div class="dm-show" style="margin-top:5px">' + ep[0] + '</div></div>' +
      '<canvas class="dm-lienzo"></canvas></div>';
    var tarjeta = v.querySelector('.tarjeta'), lienzo = v.querySelector('canvas');
    /* Deslizar la portada como una carta para cambiar de episodio */
    var x0 = 0, dx = 0, arrastrando = false, t0 = 0;
    tarjeta.addEventListener('pointerdown', function (e) { tarjeta.setPointerCapture(e.pointerId); arrastrando = true; x0 = e.clientX; dx = 0; t0 = performance.now(); tarjeta.classList.add('arrastre'); });
    tarjeta.addEventListener('pointermove', function (e) {
      if (!arrastrando) return; dx = e.clientX - x0;
      var p = Math.max(-1, Math.min(1, dx / 220));
      tarjeta.style.transform = 'translateX(' + dx + 'px) rotate(' + (p * 8) + 'deg) scale(' + ((S.sonando ? 1 : 0.84) * (1 - 0.07 * Math.abs(p))) + ')';
      tarjeta.style.opacity = 1 - 0.4 * Math.abs(p);
    });
    tarjeta.addEventListener('pointerup', function () {
      arrastrando = false; tarjeta.classList.remove('arrastre');
      var velo = dx / Math.max(1, performance.now() - t0);
      if (Math.abs(dx) > 70 || Math.abs(velo) > 0.6) {
        var dir = dx < 0 ? -1 : 1; vibrar(16);
        tarjeta.style.transform = 'translateX(' + (dir * 340) + 'px) rotate(' + (dir * 14) + 'deg)'; tarjeta.style.opacity = 0;
        setTimeout(function () {
          S.ep = (S.ep + (dir < 0 ? 1 : 2)) % 3;
          var nueva = el('<div class="demo-vista"></div>'); actual = construirPortada(nueva);
          var t2 = nueva.querySelector('.tarjeta'); t2.classList.add('arrastre');
          t2.style.transform = 'translateX(' + (-dir * 260) + 'px) rotate(' + (-dir * 10) + 'deg)'; t2.style.opacity = 0;
          pantalla.appendChild(nueva); v.remove(); vista = nueva; refrescar();
          requestAnimationFrame(function () { requestAnimationFrame(function () { t2.classList.remove('arrastre'); t2.style.transform = ''; t2.style.opacity = ''; }); });
        }, 260);
      } else { tarjeta.style.transform = ''; tarjeta.style.opacity = ''; }
    });
    var dial = hacerDial(lienzo);
    return {
      refrescar: function () { tarjeta.classList.toggle('pausa', !S.sonando); },
      cuadro: dial
    };
  }

  /* El dial: arco con ♥, −15, play, +15 y velocidad; escala con aguja roja que se arrastra */
  function hacerDial(lienzo) {
    var A0 = -170, A1 = -10, N = 5, PLAY = 2, presion = -1, destello = 0, ultimoSeg = 0, arrastrando = false, ultimaMarca = -1;
    function rad(g) { return g * Math.PI / 180; }
    function geo() { var w = lienzo.clientWidth, h = lienzo.clientHeight, rF = Math.min(w / 2 - 2, h - 6), rD = rF - Math.max(34, rF * 0.3); return { w: w, h: h, cx: w / 2, cy: rF + 3, rF: rF, rD: rD, rEF: rD - 5, rED: rD - 5 - Math.max(14, rF * 0.15) }; }
    function donde(e) {
      var r = lienzo.getBoundingClientRect(), g = geo(), x = e.clientX - r.left - g.cx, y = e.clientY - r.top - g.cy;
      var d = Math.hypot(x, y), ang = Math.atan2(y, x) * 180 / Math.PI;
      if (d >= g.rD && d <= g.rF + 4 && ang >= A0 && ang <= A1) return { seg: Math.min(N - 1, Math.floor((ang - A0) / ((A1 - A0) / N))) };
      if (d <= g.rEF + 8 && d >= g.rED - 26 && y <= 8) { var a = ang > 0 ? (x < 0 ? -180 : 0) : ang; return { frac: (a + 180) / 180 }; }
      return null;
    }
    lienzo.addEventListener('pointerdown', function (e) {
      var p = donde(e); if (!p) return; e.stopPropagation(); lienzo.setPointerCapture(e.pointerId);
      if (p.seg !== undefined) { presion = p.seg; ultimoSeg = p.seg; vibrar(8); }
      else { arrastrando = true; S.pos = p.frac * S.dur; vibrar(6); }
    });
    lienzo.addEventListener('pointermove', function (e) {
      if (!arrastrando) return; var p = donde(e); if (p && p.frac !== undefined) { S.pos = Math.max(0, Math.min(1, p.frac)) * S.dur; var m = Math.floor(p.frac * 36); if (m !== ultimaMarca) { if (ultimaMarca >= 0) vibrar(3); ultimaMarca = m; } }
    });
    lienzo.addEventListener('pointerup', function (e) {
      if (arrastrando) { arrastrando = false; refrescar(); return; }
      if (presion < 0) return; var p = donde(e), i = presion; presion = -1; destello = 1;
      if (p && p.seg === i) {
        if (i === PLAY) playPausa();
        else if (i === 0) { S.meGusta = !S.meGusta; vibrar(10); }
        else if (i === 1) saltar(-15);
        else if (i === 3) saltar(15);
        else S.iv = (S.iv + 1) % VEL.length;
      }
    });
    function segmento(c, g, i, relleno) { var paso = (A1 - A0) / N, a = rad(A0 + paso * i), b = rad(A0 + paso * (i + 1)); c.beginPath(); c.arc(g.cx, g.cy, g.rF, a, b); c.arc(g.cx, g.cy, g.rD, b, a, true); c.closePath(); c.fillStyle = relleno; c.fill(); }
    return function () {
      var dpr = window.devicePixelRatio || 1, g = geo();
      if (lienzo.width !== Math.round(g.w * dpr)) { lienzo.width = Math.round(g.w * dpr); lienzo.height = Math.round(g.h * dpr); }
      var c = lienzo.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, g.w, g.h);
      var paso = (A1 - A0) / N, luz = anim.amp;
      destello *= 0.88;
      c.lineWidth = 1.1; c.strokeStyle = 'rgba(255,255,255,.18)';
      c.beginPath(); c.arc(g.cx, g.cy, g.rF, rad(A0), rad(A1)); c.stroke();
      c.beginPath(); c.arc(g.cx, g.cy, g.rD, rad(A0), rad(A1)); c.stroke();
      for (var k = 0; k <= N; k++) { var a = rad(A0 + paso * k); c.beginPath(); c.moveTo(g.cx + Math.cos(a) * g.rD, g.cy + Math.sin(a) * g.rD); c.lineTo(g.cx + Math.cos(a) * g.rF, g.cy + Math.sin(a) * g.rF); c.stroke(); }
      segmento(c, g, PLAY, 'rgba(255,255,255,' + (0.08 + 0.07 * luz) + ')');
      if (presion >= 0) segmento(c, g, presion, 'rgba(255,255,255,.2)');
      else if (destello > 0.02) segmento(c, g, ultimoSeg, 'rgba(255,255,255,' + (0.2 * destello) + ')');
      var cp = A0 + paso * (PLAY + 0.5), largo = (paso - 4) * (0.45 + 0.55 * luz);
      c.strokeStyle = 'rgba(255,255,255,' + (0.45 + 0.4 * luz) + ')'; c.lineWidth = 2.4; c.lineCap = 'round';
      c.beginPath(); c.arc(g.cx, g.cy, g.rF - 1, rad(cp - largo / 2), rad(cp + largo / 2)); c.stroke();
      var rI = (g.rF + g.rD) / 2;
      for (var i = 0; i < N; i++) {
        var ai = rad(A0 + paso * (i + 0.5)), x = g.cx + Math.cos(ai) * rI, y = g.cy + Math.sin(ai) * rI, e = i === presion ? 0.78 : 1;
        c.save(); c.translate(x, y); c.scale(e, e); c.fillStyle = 'rgba(255,255,255,.9)'; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (i === PLAY) { if (S.sonando) { c.fillRect(-7, -9, 5, 18); c.fillRect(2, -9, 5, 18); } else { c.beginPath(); c.moveTo(-6, -10); c.lineTo(10, 0); c.lineTo(-6, 10); c.closePath(); c.fill(); } }
        else if (i === 0) { c.font = '18px system-ui'; c.fillStyle = S.meGusta ? '#ffb3b3' : 'rgba(255,255,255,.9)'; c.fillText(S.meGusta ? '♥' : '♡', 0, 1); }
        else if (i === 1) { c.font = '700 11px system-ui'; c.fillText('−15', 0, 1); }
        else if (i === 3) { c.font = '700 11px system-ui'; c.fillText('+15', 0, 1); }
        else { c.font = '700 11px system-ui'; c.fillText(VEL[S.iv] + '×', 0, 1); }
        c.restore();
      }
      var ag = S.pos / S.dur;
      anim.aguja += (ag - anim.aguja) * (arrastrando ? 1 : 0.18);
      for (var d = -180; d <= 0; d += 4) {
        var grande = d % 20 === 0, r1 = grande ? g.rED : g.rEF - 7, ad = rad(d), pasada = (d + 180) / 180 <= anim.aguja;
        c.strokeStyle = 'rgba(255,255,255,' + (grande ? (pasada ? .75 : .4) : (pasada ? .5 : .22)) + ')'; c.lineWidth = grande ? 1.8 : 1;
        c.beginPath(); c.moveTo(g.cx + Math.cos(ad) * r1, g.cy + Math.sin(ad) * r1); c.lineTo(g.cx + Math.cos(ad) * g.rEF, g.cy + Math.sin(ad) * g.rEF); c.stroke();
      }
      var ga = rad(-180 + 180 * anim.aguja), ini = g.rED - 14;
      c.strokeStyle = '#ff3b30'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(g.cx + Math.cos(ga) * ini, g.cy + Math.sin(ga) * ini); c.lineTo(g.cx + Math.cos(ga) * (g.rEF + 2), g.cy + Math.sin(ga) * (g.rEF + 2)); c.stroke();
      c.fillStyle = '#ff3b30'; c.beginPath(); c.arc(g.cx + Math.cos(ga) * ini, g.cy + Math.sin(ga) * ini, arrastrando ? 5 : 3.6, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; c.font = '700 ' + Math.round(g.rF * 0.17) + 'px Unbounded, system-ui';
      c.fillText(mmss(S.pos), g.cx, g.cy - 16);
      c.fillStyle = 'rgba(255,255,255,.6)'; c.font = '700 10px system-ui'; c.fillText('-' + mmss(S.dur - S.pos), g.cx, g.cy - 2);
    };
  }

  /* ——— Clásico ——— */
  function construirClasico(v) {
    var ep = T.eps[S.ep];
    v.innerHTML = '<div class="clasico"><div class="dm-show">' + ep[0] + '</div><div class="dm-tit">' + ep[1] + '</div>' +
      '<div class="dm-tiempos"><span class="t1"></span><b class="t2"></b></div>' +
      '<canvas class="dm-lienzo" style="width:100%;height:24px;margin-top:6px"></canvas>' +
      '<div class="abajo"><button class="dm-btn playg"></button><div class="rejilla"><button class="dm-btn">−15</button><button class="dm-btn">+15</button><button class="dm-btn b-bajar">' + IC.bajar + '</button><button class="dm-btn b-gusta">' + IC.corazon + '</button></div></div>' +
      '<div class="chips"><span class="ch-vel">1×</span><span>⏱</span><span>🔖</span><span>📝</span></div></div>';
    var play = v.querySelector('.playg'), r = v.querySelectorAll('.rejilla .dm-btn');
    tocar(play, playPausa); tocar(r[0], function () { saltar(-15); }); tocar(r[1], function () { saltar(15); });
    acciones(v);
    var dibujar = onda(v.querySelector('canvas'), 2.4, true);
    return {
      refrescar: function () { play.innerHTML = S.sonando ? IC.pausa : IC.play; play.classList.toggle('son', S.sonando); v.querySelector('.t1').textContent = T.de + ' ' + mmss(S.dur); v.querySelector('.ch-vel').textContent = VEL[S.iv] + '×'; },
      cuadro: function () { dibujar(); v.querySelector('.t2').textContent = falta(); }
    };
  }

  function refrescar() { if (actual && actual.refrescar) actual.refrescar(); }

  /* ——— El reloj de la animación: solo corre mientras el teléfono se ve ——— */
  var visible = false, ultimo = 0;
  function cuadro(ts) {
    var dt = ultimo ? Math.min(0.05, (ts - ultimo) / 1000) : 0; ultimo = ts;
    var meta = S.sonando ? 1 : 0, k = quieto ? 1 : Math.min(1, dt * 4);
    anim.amp += (meta - anim.amp) * k;
    anim.galleta += (meta - anim.galleta) * (quieto ? 1 : Math.min(1, dt * 5));
    if (S.sonando) { anim.fase += dt * 5.2; S.pos = Math.min(S.dur, S.pos + dt * VEL[S.iv]); }
    /* El disco: sube a su velocidad y frena suave */
    anim.vGiro += ((S.sonando ? 120 : 0) - anim.vGiro) * Math.min(1, dt * (S.sonando ? 3 : 1.5));
    anim.giro = (anim.giro + anim.vGiro * dt) % 360;
    if (actual && actual.cuadro) actual.cuadro();
    if (visible) requestAnimationFrame(cuadro); else ultimo = 0;
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { es.forEach(function (e) { var antes = visible; visible = e.isIntersecting; if (visible && !antes) requestAnimationFrame(cuadro); }); }).observe(tel);
  } else { visible = true; requestAnimationFrame(cuadro); }
  window.addEventListener('resize', function () { if (actual && actual.cuadro) actual.cuadro(); });

  cambiarEstilo(0);
})();
