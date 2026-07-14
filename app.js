/* Экономика проекта — интерактивный калькулятор.
   Логика 1:1 с оригиналом: три сценария из текущих вводных.
   base = B(t,1,1,1), cautious = B(t,1.3,.7,.8), optimistic = B(t,.8,1.2,1.15) */
(function () {
  "use strict";

  var KP = window.KP || null;

  var PRICE = (KP && KP.price) || 49000;
  // Рекламный бюджет — фиксированный ввод из брифа (не меняется в калькуляторе)
  var AD_BUDGET = (KP && KP.adBudget != null) ? Number(KP.adBudget) : 60000;

  // Пресеты сценариев (из данных КП брифа, иначе — пример)
  var PRESETS = (KP && KP.presets) || {
    min: { targetLeads: 98,  leadCost: 700, leadToMeeting: 25, meetingToSale: 14, averageCheck: 162000 },
    mid: { targetLeads: 164, leadCost: 550, leadToMeeting: 35, meetingToSale: 20, averageCheck: 180000 },
    max: { targetLeads: 246, leadCost: 400, leadToMeeting: 44, meetingToSale: 24, averageCheck: 207000 }
  };
  var PRESET_ORDER = ["min", "mid", "max"]; // соответствует кнопкам Минимальный/Средний/Максимальный

  // Параметры в порядке блоков в сетке (цена заявки убрана — она = бюджет ÷ заявки)
  var PARAMS = [
    { key: "targetLeads",   min: 20,   max: 500,    step: 1 },
    { key: "leadToMeeting", min: 1,    max: 80,     step: 1 },
    { key: "meetingToSale", min: 1,    max: 80,     step: 1 },
    { key: "averageCheck",  min: 2000, max: 500000, step: 1000 }
  ];

  var THUMB = 20; // px, размер ползунка (h-5 w-5)

  var ACTIVE_CLS  = "rounded-full border px-3 py-1.5 text-sm font-medium transition border-primary bg-primary/10 text-primary";
  var IDLE_CLS    = "rounded-full border px-3 py-1.5 text-sm font-medium transition border-border text-muted-foreground hover:border-primary/50";

  // ——— расчёт: бюджет фиксированный, множители n (конверсии) и l (заявки) ———
  function B(t, n, l) {
    var budget = Math.max(0, Number(t.adBudget) || 0);
    var leads = Math.max(0, (Number(t.targetLeads) || 0) * l);
    var u = Math.max(0, (Number(t.leadToMeeting) || 0) * n / 100);
    var b = Math.max(0, (Number(t.meetingToSale) || 0) * n / 100);
    var h = Number(t.averageCheck) || 0;
    var a = Number(t.price) || 0;
    var meetings = leads * u;
    var sales = meetings * b;
    var revenue = sales * h;
    var romi = budget ? (revenue - budget) / budget * 100 : 0;
    var payback = (budget + a) ? revenue / (budget + a) : 0;
    var leadCost = leads ? budget / leads : 0;
    return { adBudget: budget, leadCost: leadCost, leads: leads, meetings: meetings, sales: sales, revenue: revenue, romi: romi, payback: payback };
  }

  function money(r) {
    if (Math.abs(r) >= 1e6) return (r / 1e6).toFixed(1).replace(".0", "").replace(".", ",") + " млн ₽";
    if (Math.abs(r) >= 1e5) return Math.round(r / 1e3) + " тыс. ₽";
    return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(r) + " ₽";
  }

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function snap(v, p) { return clamp(p.min + Math.round((v - p.min) / p.step) * p.step, p.min, p.max); }

  document.addEventListener("DOMContentLoaded", function () {
    // Находим секцию экономики по заголовку
    var section = null;
    var heads = document.querySelectorAll("h3");
    for (var q = 0; q < heads.length; q++) {
      if (heads[q].textContent.indexOf("Экономика проекта") !== -1) { section = heads[q].closest("section"); break; }
    }
    if (!section) return;

    // Кнопки пресетов
    var presetBtns = [];
    var btns = section.querySelectorAll("button");
    for (var w = 0; w < btns.length; w++) presetBtns.push(btns[w]);

    // Блоки параметров (прямые дети сетки)
    var grid = null;
    var divs = section.querySelectorAll("div.grid");
    for (var g = 0; g < divs.length; g++) {
      if (divs[g].querySelector('input[type="number"]')) { grid = divs[g]; break; }
    }
    if (!grid) return;
    var blocks = [];
    for (var c = 0; c < grid.children.length; c++) blocks.push(grid.children[c]);

    var controls = PARAMS.map(function (p, idx) {
      var block = blocks[idx];
      return {
        p: p,
        input: block.querySelector('input[type="number"]'),
        track: block.querySelector('span[dir="ltr"]'),
        fill: block.querySelector("span.bg-primary"),
        thumbWrap: block.querySelector('span[dir="ltr"] > span:last-child'),
        thumb: block.querySelector('span[role="slider"]')
      };
    });

    // Таблица результатов
    var rows = section.querySelectorAll("table tbody tr");

    // Состояние = базовые цифры из брифа (window.KP.econ), иначе из разметки
    var state = {};
    PARAMS.forEach(function (p, idx) {
      var v = (KP && KP.econ && KP.econ[p.key] != null) ? KP.econ[p.key] : Number(controls[idx].input.value);
      state[p.key] = Number(v);
    });

    function paintSlider(ctl, val) {
      var p = ctl.p;
      var frac = (val - p.min) / (p.max - p.min);
      frac = clamp(frac, 0, 1);
      if (ctl.fill) { ctl.fill.style.left = "0%"; ctl.fill.style.right = (100 - frac * 100) + "%"; }
      if (ctl.thumbWrap) ctl.thumbWrap.style.left = "calc(" + (frac * 100) + "% + " + ((0.5 - frac) * THUMB) + "px)";
      if (ctl.thumb) ctl.thumb.setAttribute("aria-valuenow", val);
    }

    function matchPreset() {
      for (var k = 0; k < PRESET_ORDER.length; k++) {
        var pv = PRESETS[PRESET_ORDER[k]];
        var ok = true;
        for (var key in pv) { if (Number(state[key]) !== Number(pv[key])) { ok = false; break; } }
        if (ok) return k;
      }
      return -1;
    }

    function render(updateInputs) {
      controls.forEach(function (ctl) {
        var val = state[ctl.p.key];
        paintSlider(ctl, val);
        if (updateInputs && document.activeElement !== ctl.input) ctl.input.value = val;
      });

      // Подсветка активного пресета
      var active = matchPreset();
      presetBtns.forEach(function (b, i) { b.className = (i === active) ? ACTIVE_CLS : IDLE_CLS; });

      // Пересчёт таблицы (бюджет фиксированный во всех сценариях)
      var t = {
        targetLeads: state.targetLeads,
        leadToMeeting: state.leadToMeeting, meetingToSale: state.meetingToSale,
        averageCheck: state.averageCheck, adBudget: AD_BUDGET, price: PRICE
      };
      var cols = [ B(t, 0.7, 0.8), B(t, 1, 1), B(t, 1.2, 1.15) ]; // осторожный, базовый, оптимистичный
      var fmt = [
        function (c) { return String(Math.floor(c.leads)); },
        function (c) { return String(Math.floor(c.meetings)); },
        function (c) { return String(Math.floor(c.sales)); },
        function (c) { return money(c.adBudget); },
        function (c) { return money(c.revenue); },
        function (c) { return c.romi.toFixed(0) + "%"; },
        function (c) { return c.payback.toFixed(1) + "×"; }
      ];
      for (var ri = 0; ri < rows.length && ri < fmt.length; ri++) {
        var cells = rows[ri].querySelectorAll("td");
        for (var ci = 0; ci < 3; ci++) {
          if (cells[ci + 1]) cells[ci + 1].textContent = fmt[ri](cols[ci]);
        }
      }

      // KPI-баннер над таблицей (базовый сценарий) — если есть в разметке
      var kpiRev = document.getElementById("kp-econ-rev");
      if (kpiRev) kpiRev.textContent = money(cols[1].revenue);
      var kpiBudget = document.getElementById("kp-econ-budget");
      if (kpiBudget) kpiBudget.textContent = money(cols[1].adBudget);
      var kpiPay = document.getElementById("kp-econ-pay");
      if (kpiPay) kpiPay.textContent = cols[1].payback.toFixed(1) + "×";
    }

    function setValue(key, val) { state[key] = val; render(true); }

    // ——— события: числовые поля ———
    controls.forEach(function (ctl) {
      ctl.input.addEventListener("input", function () {
        var v = parseFloat(ctl.input.value);
        if (isNaN(v)) return;
        state[ctl.p.key] = clamp(v, ctl.p.min, ctl.p.max);
        render(false);
      });
      ctl.input.addEventListener("change", function () {
        var v = parseFloat(ctl.input.value);
        if (isNaN(v)) v = ctl.p.min;
        setValue(ctl.p.key, clamp(v, ctl.p.min, ctl.p.max));
      });

      // ——— события: перетаскивание ползунка ———
      var dragging = false;
      function valFromEvent(clientX) {
        var rect = ctl.track.getBoundingClientRect();
        var frac = (clientX - rect.left) / rect.width;
        frac = clamp(frac, 0, 1);
        return snap(ctl.p.min + frac * (ctl.p.max - ctl.p.min), ctl.p);
      }
      ctl.track.addEventListener("pointerdown", function (e) {
        dragging = true;
        ctl.track.setPointerCapture && ctl.track.setPointerCapture(e.pointerId);
        setValue(ctl.p.key, valFromEvent(e.clientX));
        e.preventDefault();
      });
      ctl.track.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        setValue(ctl.p.key, valFromEvent(e.clientX));
      });
      function endDrag() { dragging = false; }
      ctl.track.addEventListener("pointerup", endDrag);
      ctl.track.addEventListener("pointercancel", endDrag);

      // ——— клавиатура на ползунке ———
      ctl.thumb.addEventListener("keydown", function (e) {
        var cur = state[ctl.p.key], st = ctl.p.step, nv = cur;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") nv = cur + st;
        else if (e.key === "ArrowLeft" || e.key === "ArrowDown") nv = cur - st;
        else if (e.key === "Home") nv = ctl.p.min;
        else if (e.key === "End") nv = ctl.p.max;
        else return;
        e.preventDefault();
        setValue(ctl.p.key, clamp(nv, ctl.p.min, ctl.p.max));
      });
    });

    // ——— события: кнопки пресетов ———
    presetBtns.forEach(function (btn, i) {
      btn.addEventListener("click", function () {
        var pv = PRESETS[PRESET_ORDER[i]];
        for (var key in pv) state[key] = pv[key];
        render(true);
      });
    });

    render(true);
  });
})();
