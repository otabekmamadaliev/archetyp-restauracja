/* ARCHETYP RESTAURACJA — skrypt tylko tej strony. Bez zależności.
 *
 * Rezerwacja stolika działa BEZ SERWERA: formularz waliduje, składa czytelną
 * wiadomość i przekazuje ją na telefon lokalu (WhatsApp, SMS jako zapas).
 * U realnego klienta podmienia się wyłącznie numer w site.config.json.
 */
(function () {
  'use strict';

  var T = {}, D = {};
  try { T = JSON.parse(document.getElementById('i18n').textContent) || {}; } catch (e) {}
  try { D = JSON.parse(document.getElementById('dane').textContent) || {}; } catch (e) {}
  var t = function (k, d) { return T[k] || d || ''; };
  var spokojnie = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s) { return document.querySelector(s); };

  var belka = $('.belka');
  if (belka) {
    var cien = function () { belka.classList.toggle('przewiniety', window.scrollY > 30); };
    cien(); window.addEventListener('scroll', cien, { passive: true });
  }

  var btnMenu = $('.ham'), menu = document.getElementById('mm');
  if (btnMenu && menu) {
    var etyk = btnMenu.getAttribute('aria-label');
    btnMenu.addEventListener('click', function () {
      var otwarte = menu.classList.toggle('otwarte');
      btnMenu.setAttribute('aria-expanded', String(otwarte));
      btnMenu.setAttribute('aria-label', otwarte ? t('closeMenu', etyk) : etyk);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('otwarte'); btnMenu.setAttribute('aria-expanded', 'false'); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('otwarte')) btnMenu.click();
    });
  }

  /* Godziny „dziś" liczone w przeglądarce — strona jest statyczna, więc wpisane
     przy budowaniu zestarzałyby się nazajutrz. */
  var wiersze = [].map.call(document.querySelectorAll('.kolumna-dnia'), function (tr) {
    var c = tr.querySelector('.kd-czas'); return c ? c.textContent.trim() : '';
  });
  var dzis = document.getElementById('dzis-godziny');
  if (dzis && wiersze.length === 7) dzis.textContent = wiersze[(new Date().getDay() + 6) % 7];

  /* ---------------------------------------------------------- zakładki
     Panele są w HTML od razu i tylko ukryte atrybutem hidden — bez JS karta
     dalej jest w całości czytelna, co dla menu restauracji ma znaczenie. */
  var zakladki = [].slice.call(document.querySelectorAll('.zakladka'));
  function pokazPanel(btn) {
    zakladki.forEach(function (b) {
      var wybrany = b === btn;
      b.setAttribute('aria-selected', String(wybrany));
      b.tabIndex = wybrany ? 0 : -1;
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      if (panel) panel.hidden = !wybrany;
    });
  }
  zakladki.forEach(function (b, i) {
    b.addEventListener('click', function () { pokazPanel(b); });
    b.addEventListener('keydown', function (e) {
      var krok = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!krok) return;
      e.preventDefault();
      var nast = zakladki[(i + krok + zakladki.length) % zakladki.length];
      pokazPanel(nast); nast.focus();
    });
  });

  if ('IntersectionObserver' in window && !spokojnie) {
    var cele = document.querySelectorAll('.fakt, .danie, .galeria figure, .opinia, .historia-tresc, .przyjecia-tresc');
    var io = new IntersectionObserver(function (wpisy) {
      wpisy.forEach(function (w) {
        if (!w.isIntersecting) return;
        w.target.style.transition = 'opacity .65s ease, transform .65s cubic-bezier(.2,.7,.3,1)';
        w.target.style.opacity = 1; w.target.style.transform = 'none';
        io.unobserve(w.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .05 });
    [].forEach.call(cele, function (el, i) {
      el.style.opacity = 0; el.style.transform = 'translateY(14px)';
      el.style.transitionDelay = (i % 5) * 60 + 'ms';
      io.observe(el);
    });
  }

  [].forEach.call(document.querySelectorAll('a.lang'), function (a) {
    a.addEventListener('click', function () {
      try { localStorage.setItem('jezyk', (a.getAttribute('hreflang') || a.textContent).trim().toLowerCase().slice(0, 2)); } catch (e) {}
    });
  });

  /* ========================================================= rezerwacja */
  var form = document.getElementById('rez-form');
  if (!form || !D.rez) return;

  var poleData = document.getElementById('pole-data');
  var poleGodzina = document.getElementById('pole-godzina');
  var poleOsoby = document.getElementById('pole-osoby');
  var komunikat = document.getElementById('rez-komunikat');
  var jezyk = document.documentElement.lang || 'pl';

  /* Data: dziś jako domyślna, przeszłość zablokowana atrybutem min — nikt nie
     powinien móc zarezerwować stolika na zeszły wtorek. */
  var dzisDt = new Date();
  var iso = function (d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };
  poleData.min = iso(dzisDt);
  poleData.max = iso(new Date(dzisDt.getTime() + (D.rez.dniNaprzod || 14) * 864e5));
  poleData.value = iso(dzisDt);

  /* Polski i ukraiński mają trzy formy liczby mnogiej, nie dwie:
     1 osoba, 2-4 osoby, 5+ osób — a od 12 do 14 wraca forma „osób".
     Angielski używa tej samej formy dla 2 i 5, więc reguła go nie psuje. */
  function forma(n) {
    var d = n % 10, s = n % 100;
    if (n === 1) return D.slowa.o1;
    if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return D.slowa.o2;
    return D.slowa.o5;
  }
  var maxOsob = D.rez.maxOsob || 12;
  for (var n = 1; n <= maxOsob; n++) {
    var o = document.createElement('option');
    o.value = String(n);
    o.textContent = n + ' ' + forma(n);
    if (n === 2) o.selected = true;
    poleOsoby.appendChild(o);
  }

  function zamkniete(d) {
    var i = (d.getDay() + 6) % 7;
    return /^\D+$/.test(wiersze[i] || '');
  }

  function zbudujGodziny() {
    poleGodzina.innerHTML = '';
    var wybrana = new Date(poleData.value + 'T00:00:00');
    var dzisiaj = wybrana.toDateString() === new Date().toDateString();
    var teraz = new Date();
    var od = D.rez.godzinaOd || 12, doG = D.rez.godzinaDo || 22, krok = D.rez.krokMinut || 30;
    var zajete = D.rez.zajete || [];
    var wolne = 0;

    for (var m = od * 60; m < doG * 60; m += krok) {
      var etykieta = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
      var opt = document.createElement('option');
      opt.value = etykieta;
      // Kuchnia zamyka się przed lokalem, a termin, który już minął, nie może
      // być do wyboru — inaczej gość rezerwuje stolik na godzinę temu.
      var minal = dzisiaj && (teraz.getHours() * 60 + teraz.getMinutes()) >= m;
      if (zajete.indexOf(etykieta) > -1) { opt.disabled = true; opt.textContent = etykieta + ' — ' + (D.slowa.taken || ''); }
      else if (minal) { opt.disabled = true; opt.textContent = etykieta; }
      else { opt.textContent = etykieta; wolne++; }
      poleGodzina.appendChild(opt);
    }
    if (zamkniete(wybrana)) {
      poleGodzina.innerHTML = '';
      var brak = document.createElement('option');
      brak.textContent = '—'; brak.disabled = true; brak.selected = true;
      poleGodzina.appendChild(brak);
      return 0;
    }
    var pierwsza = poleGodzina.querySelector('option:not([disabled])');
    if (pierwsza) pierwsza.selected = true;
    return wolne;
  }

  /* Jeśli na dziś nie został ani jeden wolny termin — bo lokal jest zamknięty
     albo jest już po ostatniej godzinie — przesuwamy datę na najbliższy dzień,
     w którym coś jest wolne. Pusta lista godzin bez wyjaśnienia wygląda jak
     zepsuty formularz, a nie jak „na dziś już po wszystkim". */
  function pierwszyWolnyDzien() {
    var limit = D.rez.dniNaprzod || 14;
    for (var i = 0; i < limit; i++) {
      if (zbudujGodziny() > 0) return;
      var d = new Date(poleData.value + 'T00:00:00');
      d.setDate(d.getDate() + 1);
      poleData.value = iso(d);
    }
    zbudujGodziny();
  }

  poleData.addEventListener('change', zbudujGodziny);
  pierwszyWolnyDzien();

  function pokaz(txt, zle) {
    komunikat.textContent = txt;
    komunikat.className = 'rez-komunikat ' + (zle ? 'zle' : 'ok');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var imie = document.getElementById('pole-imie').value.trim();
    var tel = document.getElementById('pole-tel').value.trim();
    var godzina = poleGodzina.value;

    if (!poleData.value || !godzina || godzina === '—') { pokaz(t('rezPick'), true); return; }
    if (!imie || tel.replace(/\D/g, '').length < 9) { pokaz(t('rezName'), true); return; }

    var czytelna = new Intl.DateTimeFormat(jezyk, { weekday: 'long', day: 'numeric', month: 'long' })
      .format(new Date(poleData.value + 'T00:00:00'));

    var tresc = [
      D.firma, '---',
      czytelna + ', ' + godzina,
      poleOsoby.options[poleOsoby.selectedIndex].textContent,
      '---', imie, tel
    ].join('\n');

    var numer = String(D.tel || '').replace(/\D/g, '');
    if (!numer) { pokaz(t('rezNoChannel'), true); return; }

    pokaz(t('rezOpening'), false);
    var okno = window.open('https://wa.me/' + numer + '?text=' + encodeURIComponent(tresc), '_blank', 'noopener');
    if (!okno) location.href = 'sms:+' + numer + '?body=' + encodeURIComponent(tresc);
    setTimeout(function () { pokaz(t('rezDone'), false); }, 900);
  });

  /* Dzisiejsza kolumna w pasie godzin. */
  (function(){
    var i=(new Date().getDay()+6)%7;
    var el=document.querySelector('.kolumna-dnia[data-dzien="'+i+'"]');
    if(el) el.classList.add('dzis');
  })();
  /* Kartka "otwarte teraz". Liczona z PRAWDZIWYCH godzin — wpisany na sztywno
     wolny termin zestarzalby sie w tydzien. Gdy dzien nie ma znanych godzin,
     kartka zostaje ukryta zamiast zgadywac. */
  (function(){
    var k=document.getElementById('kartka-stan');
    if(!k||!D.godziny||!D.stan) return;
    var g=D.godziny, teraz=new Date(), dzis=(teraz.getDay()+6)%7;
    var minuty=teraz.getHours()*60+teraz.getMinutes();
    var hhmm=function(m){return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
    var tytul=k.querySelector('[data-stan-tytul]'), opis=k.querySelector('[data-stan-opis]');
    var dzisiaj=g[dzis];
    if(dzisiaj && minuty>=dzisiaj[0] && minuty<dzisiaj[1]){
      tytul.textContent=D.stan.terazOtwarte;
      opis.textContent=D.stan.doGodz.replace('{g}',hhmm(dzisiaj[1]));
      k.hidden=false; k.classList.add('kartka--otwarte'); return;
    }
    for(var i=0;i<7;i++){
      var d=(dzis+i)%7, z=g[d];
      if(!z) continue;
      if(i===0 && minuty>=z[0]) continue;
      tytul.textContent=D.stan.zamkniete;
      opis.textContent=D.stan.otwieramy
        .replace('{d}', i===0 ? '' : (D.dniTyg&&D.dniTyg[d]||''))
        .replace('{g}', hhmm(z[0])).replace(/\s+/g,' ').trim();
      k.hidden=false; return;
    }
  })();

})();
