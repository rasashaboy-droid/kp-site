/* render.js — заполняет шаблон КП данными брифа.
   Данные берутся из #data=<base64 JSON> в ссылке, иначе из localStorage('kp_data'),
   иначе используются значения по умолчанию (текущий пример — бани-бочки). */
(function () {
  "use strict";

  var DEFAULTS = {
    clientName: "",
    niche: "продажи бань-бочек",
    city: "по всей России",
    channels: "Квиз-лендинг + Яндекс Директ + Авито + Догревающий чат-бот + Аналитика",
    goal: "получать стабильный и управляемый поток заявок на бани-бочки с понятной стоимостью обращения, чтобы отделу продаж было с чем работать каждый день",
    pains: "Мало входящих обращений и нет стабильного управляемого потока; непонятно, во сколько обходится заявка и окупается ли реклама; сомнение, что маркетинг сработает именно для этой компании; опыт неудачных запусков с фрилансерами и подрядчиками без специализации; страх слить бюджет на нецелевые лиды; маркетинг откладывается из-за других расходов и кажущейся несрочности.",
    pointA: "Сейчас поток обращений нестабилен: заявки приходят от случая к случаю, нет прозрачной цены заявки и понимания, какие каналы реально приносят клиентов. Из-за этого продажи проседают, а рекламный бюджет расходуется без чёткой картины эффективности.",
    pointB: "Настроенная система привлечения: квиз-страница принимает трафик, реклама в Яндекс Директ и объявления на Авито дают ежедневные обращения, чат-бот догревает заявки, а аналитика показывает цену заявки и вклад каждого канала. Ориентир — стабильный поток обращений и прозрачная картина эффективности вложений.",
    currentLeads: 20,
    currentSales: 2,
    averageCheck: 200000,
    targetLeads: 100,
    targetSales: 5,
    targetRevenue: 1000000,
    adBudget: 60000,
    leadToMeeting: 25,
    meetingToSale: 20,
    price: 49000,
    finalCta: "Если всё ок — фиксируем запуск прямо на этом созвоне"
  };

  // ——— чтение данных ———
  function readData() {
    var d = null;
    var h = location.hash || "";
    var m = h.match(/data=([^&]+)/);
    if (m) {
      try { d = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1]))))); } catch (e) { d = null; }
    }
    if (!d) {
      try { d = JSON.parse(localStorage.getItem("kp_data") || "null"); } catch (e) { d = null; }
    }
    var out = {};
    for (var k in DEFAULTS) out[k] = DEFAULTS[k];
    if (d) for (var j in d) if (d[j] !== undefined && d[j] !== null && d[j] !== "") out[j] = d[j];
    return out;
  }

  var DATA = readData();

  // ——— форматирование ———
  function moneyFull(n) { return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽"; }
  // компактный формат (как в калькуляторе): млн / тыс / полный
  function moneyCompact(r) {
    if (Math.abs(r) >= 1e6) return (r / 1e6).toFixed(1).replace(".0", "").replace(".", ",") + " млн ₽";
    if (Math.abs(r) >= 1e5) return Math.round(r / 1e3) + " тыс. ₽";
    return moneyFull(r);
  }
  function priceText(n) { var p = n / 1000; return (Math.round(p * 10) / 10) + " т.р."; }
  function num(n) { return String(Math.round(n)); }

  // ——— конфиг для калькулятора (app.js читает window.KP) ———
  window.KP = {
    price: Number(DATA.price) || 0,
    adBudget: Number(DATA.adBudget) || 0,   // фиксированный рекламный бюджет
    econ: {
      targetLeads: Number(DATA.targetLeads) || 0,
      leadToMeeting: Number(DATA.leadToMeeting) || 0,
      meetingToSale: Number(DATA.meetingToSale) || 0,
      averageCheck: Number(DATA.averageCheck) || 0
    }
  };

  // ——— заполнение текстовых блоков ———
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function setText(id, val) { var el = document.getElementById(id); if (el) el.textContent = val; }
  function setHTML(id, val) { var el = document.getElementById(id); if (el) el.innerHTML = val; }

  function fill() {
    document.title = (DATA.clientName ? DATA.clientName + " · " : "") + "КП · " + DATA.niche;

    setText("kp-hero-title", "Система привлечения клиентов для " + DATA.niche + " в " + DATA.city);
    setText("kp-hero-sub", "Соберём понятную маркетинговую систему под ключ, чтобы " + DATA.goal + ".");

    // Каналы — чипы
    var chips = String(DATA.channels).split("+").map(function (c) { return c.trim(); }).filter(Boolean);
    setHTML("kp-hero-channels", chips.map(function (c) {
      return '<span class="rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-3 py-1 text-sm font-semibold">' + esc(c) + "</span>";
    }).join(""));

    // Витрина цифр в hero
    var heroBudget = Number(DATA.adBudget) || 0;
    var heroPay = (heroBudget + Number(DATA.price)) ? DATA.targetRevenue / (heroBudget + Number(DATA.price)) : 0;
    setText("kp-hero-leads", num(DATA.targetLeads));
    setText("kp-hero-sales", num(DATA.targetSales));
    setText("kp-hero-rev", moneyCompact(DATA.targetRevenue));
    setText("kp-hero-pay", heroPay.toFixed(1) + "×");

    // Точка А
    setText("kp-a-leads", num(DATA.currentLeads));
    setText("kp-a-sales", num(DATA.currentSales));
    setText("kp-a-check", moneyFull(DATA.averageCheck));
    setText("kp-a-rev", moneyFull(DATA.currentSales * DATA.averageCheck));
    setText("kp-a-text", DATA.pointA);

    // Точка Б: чип роста выручки А -> Б
    var curRev = (Number(DATA.currentSales) || 0) * (Number(DATA.averageCheck) || 0);
    var growthEl = document.getElementById("kp-b-growth");
    if (growthEl) {
      if (curRev > 0 && DATA.targetRevenue > curRev) {
        var gr = Math.round(DATA.targetRevenue / curRev * 10) / 10;
        growthEl.textContent = "выручка ×" + String(gr).replace(".", ",");
      } else {
        growthEl.textContent = "плановая модель";
      }
    }
    setText("kp-b-leads", num(DATA.targetLeads));
    setText("kp-b-sales", num(DATA.targetSales));
    setText("kp-b-check", moneyFull(DATA.averageCheck));
    setText("kp-b-rev", moneyFull(DATA.targetRevenue));
    setText("kp-b-text", DATA.pointB);

    // Боли — маркированный список (разделители: ; или перенос строки)
    var pains = String(DATA.pains).split(/;|\n/).map(function (p) { return p.trim().replace(/\.$/, ""); }).filter(Boolean);
    setHTML("kp-pains", pains.map(function (p) {
      var t = p.charAt(0).toUpperCase() + p.slice(1);
      return '<li class="flex gap-2"><span class="font-extrabold text-red-500">✕</span>' + esc(t) + "</li>";
    }).join(""));
    setText("kp-price", priceText(DATA.price));

    setText("kp-cta-title", "Запускаем систему заявок для " + DATA.niche + "?");
    setText("kp-cta-sub", DATA.finalCta);
    setText("kp-cta-rev", moneyCompact(DATA.targetRevenue));
    setText("kp-cta-price", priceText(DATA.price));

    // Плановые цифры, повторяющиеся в этапах (плитки + упоминания в тексте)
    var meetings = Math.floor(DATA.targetLeads * DATA.leadToMeeting / 100);
    var kp = {
      leads: num(DATA.targetLeads),
      sales: num(DATA.targetSales),
      meetings: String(meetings),
      revC: moneyCompact(DATA.targetRevenue),
      revF: moneyFull(DATA.targetRevenue),
      check: moneyFull(DATA.averageCheck)
    };
    for (var key in kp) {
      var nodes = document.querySelectorAll('[data-kp="' + key + '"]');
      for (var i = 0; i < nodes.length; i++) nodes[i].textContent = kp[key];
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fill);
  else fill();
})();
