/* ═══════════════════════════════════════════════════════════════
   Соль · приложение
   Роутер по hash, пять экранов, модалки, поповеры, тосты.
   Анимации: только transform/opacity, токены в app.css.
   ═══════════════════════════════════════════════════════════════ */

"use strict";

/* ═══════════ утилиты ═══════════ */

const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const fmtMoney = n => new Intl.NumberFormat("ru-RU").format(Math.round(n)) + " ₽";
const fmtDay = d => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(d);
const fmtDayShort = d => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(d).replace(".", "");
const fmtDow = d => new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(d);
const MONTHS_IM = ["январе", "феврале", "марте", "апреле", "мае", "июне", "июле", "августе", "сентябре", "октябре", "ноябре", "декабре"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

function plural(n, one, few, many) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const lessonsWord = n => plural(n, "занятие", "занятия", "занятий");

/* маленькое фирменное солнце для пустых состояний — вместо системного эмодзи */
const SUN_INLINE = `<svg viewBox="0 0 20 20" width="14" height="14" style="display:inline-block;vertical-align:-2px;margin-left:5px"><circle cx="10" cy="10" r="3.6" fill="var(--accent)"/><g stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"><path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M15.8 4.2l-1.7 1.7M5.9 14.1l-1.7 1.7"/></g></svg>`;

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

function initials(name) {
  const clean = String(name || "").replace(/[«»"]/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  /* результат уходит прямо в innerHTML — экранируем здесь же */
  return esc((parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase());
}

const KIND_META = {
  adult:  { label: "Взрослый",  cls: "adult"  },
  kid:    { label: "Ребёнок",   cls: "kid"    },
  online: { label: "Онлайн",    cls: "online" },
  group:  { label: "Группа",    cls: "group"  },
};
function kindOfStudent(s) {
  return s.type === "group" ? "group" : (s.format === "online" ? "online" : s.type === "kid" ? "kid" : "adult");
}
function typeLabelOf(s) {
  return s.type === "kid" ? "Ребёнок" : s.type === "group" ? "Группа" : "Взрослый";
}

/* счётчик-анимация чисел */
function countUp(node, target, format) {
  format = format || (v => fmtMoney(v));
  if (REDUCED || !animateEntry) { node.textContent = format(target); return; }
  const dur = 650, start = performance.now();
  const tick = now => {
    const p = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = format(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ═══════════ тосты ═══════════ */

function toast(msg, icon) {
  const stack = $("#toast-stack");
  const t = el(`<div class="toast">${icon || `<svg viewBox="0 0 20 20"><path d="m4 10.5 4 4 8-8.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`}<span>${esc(msg)}</span></div>`);
  stack.appendChild(t);
  setTimeout(() => {
    t.classList.add("leaving");
    t.addEventListener("animationend", () => t.remove(), { once: true });
  }, 3200);
}

/* ═══════════ модалки ═══════════ */

let modalCleanup = null;
let modalHideTimer = null;
let modalReturnFocus = null;
let modalTitleSeq = 0;

function openModal(contentEl, opts = {}) {
  clearTimeout(modalHideTimer);
  closeModal(true);
  modalReturnFocus = document.activeElement;
  const layer = $("#modal-layer");
  layer.hidden = false;
  layer.classList.toggle("drawer-mode", !!opts.drawer);
  layer.classList.remove("closing");
  const backdrop = el(`<div class="modal-backdrop"></div>`);
  layer.append(backdrop, contentEl);
  backdrop.addEventListener("click", () => closeModal());

  /* заголовок диалога — в aria-labelledby */
  const h = contentEl.querySelector("h3");
  if (h) {
    if (!h.id) h.id = "modal-title-" + (++modalTitleSeq);
    contentEl.setAttribute("aria-labelledby", h.id);
  }

  const onKey = e => {
    if (e.key === "Escape") { closeModal(); return; }
    /* focus trap: Tab не уходит из диалога */
    if (e.key === "Tab") {
      const focusables = $$("input, select, textarea, button, [tabindex='0']", contentEl)
        .filter(n => !n.disabled && n.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      else if (!contentEl.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    }
  };
  document.addEventListener("keydown", onKey);
  modalCleanup = () => document.removeEventListener("keydown", onKey);
  const focusable = contentEl.querySelector("input, select, textarea, button");
  if (focusable) setTimeout(() => focusable.focus(), 60);
}

function closeModal(instant) {
  const layer = $("#modal-layer");
  clearTimeout(modalHideTimer);
  if (layer.hidden) return;
  if (modalCleanup) { modalCleanup(); modalCleanup = null; }
  if (modalReturnFocus && document.contains(modalReturnFocus)) {
    modalReturnFocus.focus({ preventScroll: true });
  }
  modalReturnFocus = null;
  const wipe = () => { layer.hidden = true; layer.innerHTML = ""; layer.classList.remove("closing"); };
  if (instant || REDUCED) { wipe(); return; }
  layer.classList.add("closing");
  modalHideTimer = setTimeout(wipe, 140);
}

function confirmDialog(title, text, okLabel, danger) {
  return new Promise(resolve => {
    const m = el(`
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head"><h3>${esc(title)}</h3></div>
        <div class="modal-body"><p style="color:var(--ink-2);font-size:13.5px">${esc(text)}</p></div>
        <div class="modal-foot">
          <button class="btn btn-ghost" data-act="no">Отмена</button>
          <button class="btn ${danger ? "btn-danger-soft" : "btn-primary"}" data-act="yes">${esc(okLabel || "Да")}</button>
        </div>
      </div>`);
    m.addEventListener("click", e => {
      const act = e.target.closest("[data-act]");
      if (!act) return;
      closeModal();
      resolve(act.dataset.act === "yes");
    });
    openModal(m);
  });
}

/* ═══════════ поповер ═══════════ */

function closePopover() {
  const layer = $("#popover-layer");
  layer.innerHTML = "";
  document.removeEventListener("click", popoverOutside, true);
  document.removeEventListener("keydown", popoverKey);
}
function popoverKey(e) {
  if (e.key === "Escape") closePopover();
}
function popoverOutside(e) {
  if (!e.target.closest(".popover")) closePopover();
}
function openPopover(anchorRect, contentEl) {
  closePopover();
  const layer = $("#popover-layer");
  layer.appendChild(contentEl);
  const w = 280, gap = 8;
  let x = anchorRect.right + gap;
  if (x + w > window.innerWidth - 12) x = anchorRect.left - w - gap;
  if (x < 12) x = Math.max(12, Math.min(window.innerWidth - w - 12, anchorRect.left));
  let y = anchorRect.top + window.scrollY;
  contentEl.style.left = x + "px";
  contentEl.style.top = y + "px";
  requestAnimationFrame(() => {
    const r = contentEl.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 12) {
      contentEl.style.top = (y - (r.bottom - window.innerHeight) - 12) + "px";
    }
  });
  setTimeout(() => {
    document.addEventListener("click", popoverOutside, true);
    document.addEventListener("keydown", popoverKey);
  }, 0);
}

/* ═══════════ роутер ═══════════ */

const VIEWS = {
  dashboard: { title: "Обзор", render: renderDashboard },
  calendar:  { title: "Календарь", render: renderCalendar },
  students:  { title: "Ученики", render: renderStudents },
  finance:   { title: "Финансы", render: renderFinance },
  reminders: { title: "Напоминания", render: renderReminders },
  settings:  { title: "Настройки", render: renderSettings },
};

const ui = {
  route: "dashboard",
  calMode: "week",
  weekStart: null,       /* Date понедельника */
  monthCursor: null,     /* Date 1-го числа */
  studentFilter: "all",
  studentQuery: "",
};

function navigate(route) { location.hash = "#/" + route; }

function currentRoute() {
  const h = location.hash.replace(/^#\//, "");
  return VIEWS[h] ? h : "dashboard";
}

/* входную хореографию (stagger, count-up, рост баров) играем один раз
   на смену экрана; повторный рендер того же экрана после клика — без шоу */
let animateEntry = true;

function render() {
  closePopover();
  const route = currentRoute();
  animateEntry = ui.lastRoute !== route;
  ui.lastRoute = route;
  ui.route = route;
  const view = $("#view");
  const def = VIEWS[route];

  $$(".nav-link").forEach(a => a.classList.toggle("active", a.dataset.route === route));
  $("#view-title").textContent = def.title;
  $("#view-subtitle").textContent = subtitleFor(route);

  view.classList.remove("view-enter");
  view.onclick = null;
  view.onkeydown = null;
  view.innerHTML = "";
  view.classList.toggle("no-anim", !animateEntry);
  def.render(view);
  if (animateEntry) {
    void view.offsetWidth;
    view.classList.add("view-enter");
  }

  updateRemindersBadge();
  $("#sidebar").classList.remove("open");
}

function subtitleFor(route) {
  const T = new Date();
  const s = Store.state.settings;
  if (route === "dashboard") {
    const h = T.getHours();
    const hello = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
    return `${hello}, ${s.ownerName}! Сегодня ${fmtDay(T)}, ${fmtDow(T)}`;
  }
  if (route === "calendar") return "Занятия студии и онлайн";
  if (route === "students") return `${Store.activeStudents().length} активных`;
  if (route === "finance") return "Выручка, оплаты и продления";
  if (route === "reminders") return "Абонементы на исходе";
  if (route === "settings") return s.studioName;
  return "";
}

function updateRemindersBadge() {
  const badge = $("#reminders-badge");
  const n = Store.pendingRemindersCount();
  badge.hidden = n === 0;
  badge.textContent = n;
}

/* ═══════════ экран: обзор ═══════════ */

function renderDashboard(view) {
  const T = new Date();
  const monthName = MONTHS_IM[T.getMonth()];
  const months = Store.revenueByMonth(6);
  const cur = months[months.length - 1].sum;
  const prev = months[months.length - 2].sum;
  const deltaPct = prev ? Math.round((cur - prev) / prev * 100) : 0;

  const monday = mondayOf(new Date());
  const weekLessons = Store.lessonsBetween(iso(monday), iso(addDays(monday, 6)))
    .filter(l => l.status !== "canceled");

  const renewals = Store.upcomingRenewals().filter(r => r.dueDate <= addDays(today(), 30));
  const expectSum = renewals.reduce((a, r) => a + r.amount, 0);

  const todayLessons = Store.lessonsOnDate(iso(today()));
  const attention = Store.reminders();

  view.innerHTML = `
    <div class="kpi-row stagger">
      <div class="card kpi" style="--i:0">
        <span class="kpi-label"><svg viewBox="0 0 20 20"><path d="M3.5 16.5V11M8 16.5V7.5M12.5 16.5v-6M17 16.5V4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>Выручка в ${monthName}</span>
        <span class="kpi-value" data-count="${cur}">0 ₽</span>
        <span class="kpi-hint">месяц ещё идёт · в ${MONTHS_IM[(T.getMonth() + 11) % 12]} ${fmtMoney(prev)}</span>
      </div>
      <div class="card kpi" style="--i:1">
        <span class="kpi-label"><svg viewBox="0 0 20 20"><circle cx="7.5" cy="7" r="3.2" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M2.5 17c.6-3 2.6-4.6 5-4.6s4.4 1.6 5 4.6M13.4 4.6a3.2 3.2 0 0 1 0 4.8M15.2 12.6c1.4.8 2.2 2.3 2.5 4.4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Активных учеников</span>
        <span class="kpi-value" data-count="${Store.activeStudents().length}" data-fmt="int">0</span>
        <span class="kpi-hint">взрослые, дети и группа</span>
      </div>
      <div class="card kpi" style="--i:2">
        <span class="kpi-label"><svg viewBox="0 0 20 20"><rect x="3" y="4.5" width="14" height="12.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M3 8.5h14M7 2.8v3M13 2.8v3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Занятий на этой неделе</span>
        <span class="kpi-value" data-count="${weekLessons.length}" data-fmt="int">0</span>
        <span class="kpi-hint">${weekLessons.filter(l => l.status === "done").length} уже проведено</span>
      </div>
      <div class="card kpi" style="--i:3">
        <span class="kpi-label"><svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10 6.5V10l2.4 2" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>Предстоящие оплаты</span>
        <span class="kpi-value" data-count="${expectSum}">0 ₽</span>
        <span class="kpi-hint">${renewals.length} ${plural(renewals.length, "продление", "продления", "продлений")} в ближайшие 30 дней</span>
      </div>
    </div>

    <div class="grid-dash">
      <div class="dash-col stagger">
        <div class="card" style="--i:4">
          <div class="card-head">
            <span class="card-title">Выручка по месяцам</span>
          </div>
          <div class="chart-wrap" id="rev-chart"></div>
        </div>
        <div class="card" style="--i:5">
          <div class="card-head" style="padding-bottom:8px">
            <span class="card-title">Требуют внимания</span>
            ${attention.length ? `<button class="btn btn-sm btn-soft" data-nav="reminders">Все напоминания</button>` : ""}
          </div>
          <div id="attn-list"></div>
        </div>
      </div>
      <div class="dash-col stagger">
        <div class="card" style="--i:5">
          <div class="card-head" style="padding-bottom:8px">
            <span class="card-title">Сегодня</span>
            <button class="btn btn-sm btn-soft" data-nav="calendar">Календарь</button>
          </div>
          <div class="today-list" id="today-list"></div>
        </div>
      </div>
    </div>
  `;

  /* KPI count-up */
  $$("[data-count]", view).forEach(node => {
    const target = Number(node.dataset.count);
    const fmt = node.dataset.fmt === "int" ? (v => String(Math.round(v))) : undefined;
    countUp(node, target, fmt);
  });

  renderRevenueChart($("#rev-chart", view), months);

  /* сегодня */
  const list = $("#today-list", view);
  if (!todayLessons.length) {
    list.innerHTML = `<div class="empty-note">
      <svg class="empty-icon" viewBox="0 0 34 34"><circle cx="17" cy="17" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M17 3v4M17 27v4M3 17h4M27 17h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      Сегодня занятий нет — свободный день</div>`;
  } else {
    todayLessons.forEach(l => {
      const st = Store.student(l.studentId);
      const meta = KIND_META[l.kind];
      const item = el(`
        <div class="today-item">
          <span class="today-time">${l.time}</span>
          <span class="today-strip" style="background:var(--cat-${meta.cls})"></span>
          <span>
            <span class="today-name">${esc(st ? st.name : "—")}</span>
            <span class="today-sub">${st ? typeLabelOf(st) : meta.label} · ${l.durationMin} мин · ${l.format === "online" ? "онлайн" : "студия"}</span>
          </span>
          <span class="today-status">
            ${l.status === "done"
              ? `<span class="tag t-ok">проведено</span>`
              : l.status === "canceled"
                ? `<span class="tag">отменено</span>`
                : `<button class="btn btn-sm btn-soft" data-done="${l.id}">Провели ✓</button>`}
          </span>
        </div>`);
      list.appendChild(item);
    });
  }

  /* требуют внимания */
  const attn = $("#attn-list", view);
  if (!attention.length) {
    attn.innerHTML = `<div class="empty-note">Все абонементы в порядке${SUN_INLINE}</div>`;
  } else {
    attention.slice(0, 4).forEach(r => {
      const k = kindOfStudent(r.student);
      attn.appendChild(el(`
        <div class="attn-item">
          <span class="avatar c-${k}">${initials(r.student.name)}</span>
          <span class="attn-text">
            <b>${esc(r.student.name)}</b>
            <small>${r.remaining ? `осталось ${r.remaining} ${lessonsWord(r.remaining)}${r.runsOut ? " · до " + fmtDayShort(r.runsOut) : ""}` : "абонемент закончился"}</small>
          </span>
          ${r.sentAt
            ? `<span class="tag t-ok" style="margin-left:auto">напомнили</span>`
            : `<button class="btn btn-sm ${r.stage === "final" ? "btn-primary" : "btn-soft"}" data-nav="reminders">Напомнить</button>`}
        </div>`));
    });
  }

  view.onclick = e => {
    const nav = e.target.closest("[data-nav]");
    if (nav) { navigate(nav.dataset.nav); return; }
    const done = e.target.closest("[data-done]");
    if (done) {
      Store.completeLesson(done.dataset.done);
      toast("Занятие отмечено проведённым");
      render();
    }
  };
}

/* график выручки: один ряд → один тон, подсказка по ховеру */
function renderRevenueChart(wrap, months) {
  const W = 560, H = 190, padL = 40, padB = 24, padT = 12;
  const max = Math.max(...months.map(m => m.sum), 1);
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const plotH = H - padB - padT;
  const colW = (W - padL) / months.length;
  const barW = Math.min(48, colW * .52);

  let grid = "", labels = "";
  for (let v = 0; v <= top; v += step) {
    const y = padT + plotH - (v / top) * plotH;
    grid += `<line class="chart-grid-line" x1="${padL}" x2="${W}" y1="${y}" y2="${y}"/>`;
    labels += `<text class="chart-y-label" x="${padL - 7}" y="${y + 3.5}" text-anchor="end">${v >= 1000 ? (v / 1000) + "к" : v}</text>`;
  }

  let bars = "";
  months.forEach((m, i) => {
    const h = Math.max(3, (m.sum / top) * plotH);
    const x = padL + i * colW + (colW - barW) / 2;
    const y = padT + plotH - h;
    bars += `
      <g class="chart-col" data-i="${i}">
        <rect class="chart-bar-hit" x="${padL + i * colW}" y="${padT}" width="${colW}" height="${plotH + padB}"/>
        <rect class="chart-bar ${m.isCurrent ? "is-current" : ""}" style="--i:${i};transform-box:fill-box;transform-origin:center bottom"
              x="${x}" y="${y}" width="${barW}" height="${h}" rx="4"/>
        <text class="chart-x-label" x="${padL + i * colW + colW / 2}" y="${H - 6}" text-anchor="middle">${MONTHS_SHORT[m.date.getMonth()]}</text>
      </g>`;
  });

  wrap.innerHTML = `<svg class="chart-svg ${REDUCED || !animateEntry ? "" : "chart-anim"}" viewBox="0 0 ${W} ${H}">${grid}${labels}${bars}</svg>`;

  const tip = el(`<div class="chart-tip"></div>`);
  document.body.appendChild(tip);
  const svg = $("svg", wrap);
  svg.addEventListener("mousemove", e => {
    const col = e.target.closest(".chart-col");
    if (!col) { tip.classList.remove("show"); return; }
    const m = months[Number(col.dataset.i)];
    tip.innerHTML = `<b>${fmtMoney(m.sum)}</b>${MONTHS_SHORT[m.date.getMonth()]} ${m.date.getFullYear()}${m.isCurrent ? " · месяц идёт" : ""}`;
    tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 150) + "px";
    tip.style.top = (e.clientY - 14) + "px";
    tip.classList.add("show");
  });
  svg.addEventListener("mouseleave", () => tip.classList.remove("show"));
  cleanupFns.push(() => tip.remove());
}

function niceStep(max) {
  const raw = max / 3;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (raw <= m * pow) return m * pow;
  return 10 * pow;
}

/* ═══════════ экран: календарь ═══════════ */

function renderCalendar(view) {
  if (!ui.weekStart) ui.weekStart = mondayOf(new Date());
  if (!ui.monthCursor) { const t = new Date(); ui.monthCursor = new Date(t.getFullYear(), t.getMonth(), 1); }

  view.innerHTML = `
    <div class="cal-toolbar">
      <div class="cal-nav">
        <button class="icon-btn" id="cal-prev" aria-label="Назад"><svg viewBox="0 0 20 20"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button class="btn btn-sm btn-ghost" id="cal-today">Сегодня</button>
        <button class="icon-btn" id="cal-next" aria-label="Вперёд"><svg viewBox="0 0 20 20"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
      <span class="cal-range" id="cal-range"></span>
      <span class="spacer"></span>
      <div class="cal-legend">
        <span><i class="dot" style="background:var(--cat-adult)"></i> взрослые</span>
        <span><i class="dot" style="background:var(--cat-kid)"></i> дети</span>
        <span><i class="dot" style="background:var(--cat-online)"></i> онлайн</span>
        <span><i class="dot" style="background:var(--cat-group)"></i> группа</span>
      </div>
      <div class="seg" id="cal-seg">
        <button data-mode="week" class="${ui.calMode === "week" ? "active" : ""}">Неделя</button>
        <button data-mode="month" class="${ui.calMode === "month" ? "active" : ""}">Месяц</button>
      </div>
    </div>
    <div class="card" id="cal-body" style="overflow:hidden"></div>
  `;

  const draw = () => {
    if (ui.calMode === "week") drawWeek($("#cal-body", view));
    else drawMonth($("#cal-body", view));
  };

  $("#cal-prev", view).onclick = () => {
    if (ui.calMode === "week") ui.weekStart = addDays(ui.weekStart, -7);
    else ui.monthCursor = new Date(ui.monthCursor.getFullYear(), ui.monthCursor.getMonth() - 1, 1);
    draw();
  };
  $("#cal-next", view).onclick = () => {
    if (ui.calMode === "week") ui.weekStart = addDays(ui.weekStart, 7);
    else ui.monthCursor = new Date(ui.monthCursor.getFullYear(), ui.monthCursor.getMonth() + 1, 1);
    draw();
  };
  $("#cal-today", view).onclick = () => {
    ui.weekStart = mondayOf(new Date());
    const t = new Date(); ui.monthCursor = new Date(t.getFullYear(), t.getMonth(), 1);
    draw();
  };
  $("#cal-seg", view).addEventListener("click", e => {
    const b = e.target.closest("[data-mode]");
    if (!b) return;
    ui.calMode = b.dataset.mode;
    $$("#cal-seg button", view).forEach(x => x.classList.toggle("active", x === b));
    draw();
  });

  draw();
}

function drawWeek(body) {
  const s = Store.state.settings;
  const hourH = 52;
  const days = Array.from({ length: 7 }, (_, i) => addDays(ui.weekStart, i));
  const tIso = iso(today());

  /* границы сетки: рабочие часы, расширенные под занятия вне их —
     ничего не должно молча пропадать из недели */
  let H0 = s.workStart, H1 = s.workEnd;
  days.forEach(d => {
    Store.lessonsOnDate(iso(d)).forEach(l => {
      const [hh, mm] = l.time.split(":").map(Number);
      H0 = Math.min(H0, hh);
      H1 = Math.max(H1, Math.ceil((hh * 60 + mm + l.durationMin) / 60));
    });
  });

  const range = `${fmtDayShort(days[0])} — ${fmtDayShort(days[6])} ${days[6].getFullYear()}`;
  $("#cal-range").textContent = range;

  let head = `<div class="week-head week-head-corner"></div>`;
  days.forEach(d => {
    head += `<div class="week-head ${iso(d) === tIso ? "is-today" : ""}">
      <div class="dow">${fmtDow(d)}</div><span class="dnum">${d.getDate()}</span></div>`;
  });

  let hoursCol = `<div class="week-hours" style="padding-top:0">`;
  for (let h = H0; h < H1; h++) hoursCol += `<div class="hour-label">${String(h).padStart(2, "0")}:00</div>`;
  hoursCol += `</div>`;

  let cols = "";
  days.forEach((d, di) => {
    const dayIso = iso(d);
    const lessons = Store.lessonsOnDate(dayIso);
    let evs = "", hits = "", linesHtml = "";
    for (let h = H0; h < H1; h++) {
      const top = (h - H0) * hourH;
      linesHtml += `<div class="hour-line" style="top:${top}px"></div>`;
      hits += `<div class="slot-hit" data-date="${dayIso}" data-time="${String(h).padStart(2, "0")}:00" style="top:${top}px;height:${hourH}px" title="Добавить занятие"></div>`;
    }
    lessons.forEach((l, li) => {
      const [hh, mm] = l.time.split(":").map(Number);
      const top = (hh - H0) * hourH + (mm / 60) * hourH;
      const height = Math.max(24, (l.durationMin / 60) * hourH - 3);
      const st = Store.student(l.studentId);
      evs += `<div class="ev k-${l.kind} ${l.status === "done" ? "is-done" : ""} ${l.status === "canceled" ? "is-canceled" : ""}"
        data-lesson="${l.id}" tabindex="0" role="button" style="top:${top}px;height:${height}px;--i:${di + li}">
        <b>${esc(st ? st.name : "—")}</b><small>${l.time} · ${l.durationMin}′</small>
      </div>`;
    });
    let now = "";
    if (dayIso === tIso) {
      const n = new Date();
      const mins = n.getHours() * 60 + n.getMinutes();
      if (mins >= H0 * 60 && mins <= H1 * 60) {
        now = `<div class="now-line" style="top:${((mins - H0 * 60) / 60) * hourH}px"></div>`;
      }
    }
    cols += `<div class="week-col" style="height:${(H1 - H0) * hourH}px">${linesHtml}${hits}${evs}${now}</div>`;
  });

  body.innerHTML = `<div class="week-grid-wrap"><div class="week-grid" style="--hour-h:${hourH}px">
    ${head}${hoursCol}${cols}</div></div>`;

  body.onclick = e => {
    const ev = e.target.closest("[data-lesson]");
    if (ev) { lessonPopover(ev); return; }
    const hit = e.target.closest(".slot-hit");
    if (hit) lessonModal({ date: hit.dataset.date, time: hit.dataset.time });
  };
  body.onkeydown = e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const ev = e.target.closest("[data-lesson]");
    if (ev) { e.preventDefault(); lessonPopover(ev); }
  };
}

function drawMonth(body) {
  const cur = ui.monthCursor;
  const monthName = new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(cur);
  $("#cal-range").textContent = monthName[0].toUpperCase() + monthName.slice(1);

  const first = mondayOf(new Date(cur.getFullYear(), cur.getMonth(), 1));
  const tIso = iso(today());
  const dows = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

  let html = `<div class="month-grid">`;
  dows.forEach(d => html += `<div class="month-dow">${d}</div>`);
  for (let i = 0; i < 42; i++) {
    const d = addDays(first, i);
    const dIso = iso(d);
    const out = d.getMonth() !== cur.getMonth();
    const lessons = Store.lessonsOnDate(dIso).filter(l => l.status !== "canceled");
    let chips = "";
    lessons.slice(0, 3).forEach(l => {
      const st = Store.student(l.studentId);
      chips += `<div class="month-ev" style="background:var(--cat-${KIND_META[l.kind].cls}-soft);color:var(--cat-${KIND_META[l.kind].cls}-ink)">${l.time} ${esc(st ? st.name.split(" ")[0] : "")}</div>`;
    });
    if (lessons.length > 3) chips += `<div class="month-more">ещё ${lessons.length - 3}</div>`;
    html += `<div class="month-cell ${out ? "is-out" : ""} ${dIso === tIso ? "is-today" : ""}" data-day="${dIso}">
      <span class="month-num">${d.getDate()}</span>${chips}</div>`;
  }
  html += `</div>`;
  body.innerHTML = html;

  body.onclick = e => {
    const cell = e.target.closest("[data-day]");
    if (!cell) return;
    ui.weekStart = mondayOf(fromIso(cell.dataset.day));
    ui.calMode = "week";
    render();
  };
}

/* поповер занятия */
function lessonPopover(anchor) {
  const l = Store.state.lessons.find(x => x.id === anchor.dataset.lesson);
  if (!l) return;
  const st = Store.student(l.studentId);
  const meta = KIND_META[l.kind];
  const d = fromIso(l.date);
  const rem = Store.remaining(l.studentId);
  const p = el(`
    <div class="popover">
      <div class="popover-head">
        <span class="avatar c-${meta.cls}">${initials(st ? st.name : "—")}</span>
        <span><b>${esc(st ? st.name : "—")}</b><small>${st ? typeLabelOf(st) : meta.label} · ${l.format === "online" ? "онлайн" : "студия"}</small></span>
      </div>
      <div class="popover-rows">
        <span>${fmtDay(d)}, ${fmtDow(d)} · ${l.time} · ${l.durationMin} минут</span>
        ${st && st.type !== "group" && Store.passOf(st.id) ? `<span>Абонемент: осталось ${rem} ${lessonsWord(rem)}</span>` : ""}
        ${l.status === "done" ? `<span style="color:var(--ok);font-weight:600">Проведено ✓</span>` : ""}
        ${l.status === "canceled" ? `<span style="color:var(--muted)">Отменено</span>` : ""}
      </div>
      <div class="popover-actions">
        ${l.status === "planned" ? `<button class="btn btn-sm btn-primary" data-act="done">Провели ✓</button>` : ""}
        ${l.status === "done" ? `<button class="btn btn-sm btn-ghost" data-act="undone">Вернуть в план</button>` : ""}
        ${l.status === "planned" ? `<button class="btn btn-sm btn-ghost" data-act="cancel">Отменить</button>` : ""}
        ${st ? `<button class="btn btn-sm btn-soft" data-act="student">Ученик</button>` : ""}
        <button class="icon-btn" data-act="delete" title="Удалить занятие"><svg viewBox="0 0 20 20"><path d="M4 6h12M8 6V4.5h4V6M6.5 6l.6 9.5h5.8L13.5 6M8.6 9v4M11.4 9v4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></button>
      </div>
    </div>`);
  p.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "done") {
      Store.completeLesson(l.id);
      toast(Store.passOf(l.studentId) ? "Занятие проведено — списано с абонемента" : "Занятие проведено");
      closePopover(); render();
    }
    if (act === "undone") { Store.uncompleteLesson(l.id); closePopover(); render(); }
    if (act === "cancel") {
      closePopover();
      if (await confirmDialog("Отменить занятие?", `${st ? st.name : ""}, ${fmtDay(d)} в ${l.time}. Занятие останется в календаре как отменённое, с абонемента не списывается.`, "Отменить занятие", true)) {
        Store.cancelLesson(l.id); render();
      }
    }
    if (act === "delete") {
      closePopover();
      if (await confirmDialog("Удалить занятие?", "Занятие исчезнет из календаря без следа.", "Удалить", true)) {
        Store.deleteLesson(l.id); render();
      }
    }
    if (act === "student") { closePopover(); studentDrawer(l.studentId); }
  });
  openPopover(anchor.getBoundingClientRect(), p);
}

/* ═══════════ экран: ученики ═══════════ */

function renderStudents(view) {
  view.innerHTML = `
    <div class="students-toolbar">
      <label class="search">
        <svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="m13.2 13.2 3.6 3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>
        <input id="student-q" placeholder="Найти ученика…" value="${esc(ui.studentQuery)}">
      </label>
      <div class="seg" id="student-filter">
        ${[["all", "Все"], ["adult", "Взрослые"], ["kid", "Дети"], ["online", "Онлайн"], ["group", "Группа"]]
          .map(([k, label]) => `<button data-f="${k}" class="${ui.studentFilter === k ? "active" : ""}">${label}</button>`).join("")}
      </div>
    </div>
    <div class="students-grid stagger" id="students-grid"></div>
  `;

  const grid = $("#students-grid", view);

  const draw = () => {
    grid.innerHTML = "";
    const q = ui.studentQuery.trim().toLowerCase();
    let list = Store.activeStudents();
    if (ui.studentFilter !== "all") list = list.filter(s => kindOfStudent(s) === ui.studentFilter);
    if (q) list = list.filter(s => s.name.toLowerCase().includes(q));
    if (!list.length) {
      grid.innerHTML = `<div class="empty-note card card-pad" style="grid-column:1/-1">Никого не нашлось</div>`;
      return;
    }
    list.forEach((s, i) => {
      const k = kindOfStudent(s);
      const p = Store.passOf(s.id);
      const rem = p ? p.size - p.used : 0;
      const meterCls = p ? (rem <= 1 ? "m-danger" : rem <= 3 ? "m-warn" : "") : "";
      grid.appendChild(el(`
        <div class="card student-card" data-student="${s.id}" tabindex="0" role="button" style="--i:${i}">
          <div class="student-card-top">
            <span class="avatar c-${k}">${initials(s.name)}</span>
            <span><b>${esc(s.name)}</b><small>${esc(s.tg || "")}</small></span>
          </div>
          <div class="student-tags">
            <span class="tag t-${k}">${typeLabelOf(s)}</span>
            <span class="tag">${s.format === "online" ? "онлайн" : "студия"}</span>
            ${p && rem <= 1 ? `<span class="tag t-danger">оплата на носу</span>` : p && rem <= 3 ? `<span class="tag t-warn">скоро оплата</span>` : ""}
          </div>
          ${p ? `
          <div class="pass-meter">
            <div class="pass-meter-row"><span>Абонемент</span><b>${rem} из ${p.size}</b></div>
            <div class="meter ${meterCls}"><i style="width:${Math.max(4, rem / p.size * 100)}%"></i></div>
          </div>` : `<div class="pass-meter"><div class="pass-meter-row"><span>Разовые занятия</span><b>${fmtMoney(Store.ltv(s.id))}</b></div></div>`}
        </div>`));
    });
  };

  draw();

  $("#student-q", view).addEventListener("input", e => { ui.studentQuery = e.target.value; draw(); });
  $("#student-filter", view).addEventListener("click", e => {
    const b = e.target.closest("[data-f]");
    if (!b) return;
    ui.studentFilter = b.dataset.f;
    $$("#student-filter button", view).forEach(x => x.classList.toggle("active", x === b));
    draw();
  });
  grid.addEventListener("click", e => {
    const c = e.target.closest("[data-student]");
    if (c) studentDrawer(c.dataset.student);
  });
  grid.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const c = e.target.closest("[data-student]");
    if (c) { e.preventDefault(); studentDrawer(c.dataset.student); }
  });
}

/* карточка ученика (drawer) */
function studentDrawer(id) {
  const s = Store.student(id);
  if (!s) return;
  const k = kindOfStudent(s);
  const p = Store.passOf(id);
  const rem = p ? p.size - p.used : 0;
  const runsOut = Store.passRunsOutOn(id);
  const ltv = Store.ltv(id);
  const created = fromIso(s.createdAt);

  const future = Store.lessonsOf(id)
    .filter(l => l.status === "planned" && l.date >= iso(today()))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).slice(0, 4);
  const pastPays = Store.paymentsOf(id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const doneCount = Store.lessonsOf(id).filter(l => l.status === "done").length;

  const drawer = el(`
    <div class="drawer" role="dialog" aria-modal="true">
      <div class="drawer-head">
        <span class="avatar c-${k}">${initials(s.name)}</span>
        <span style="flex:1;min-width:0">
          <h3>${esc(s.name)}</h3>
          <div class="sub">${typeLabelOf(s)} · ${s.format === "online" ? "онлайн" : "в студии"} · с нами с ${fmtDayShort(created)} ${created.getFullYear()}</div>
        </span>
        <button class="icon-btn" data-act="close" aria-label="Закрыть"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>
      <div class="drawer-body">
        ${p ? `
        <div class="drawer-section">
          <h4>Абонемент</h4>
          <div class="pass-meter">
            <div class="pass-meter-row"><span>Осталось ${rem} из ${p.size} ${lessonsWord(p.size)}</span><b>${runsOut ? "до ~" + fmtDayShort(runsOut) : ""}</b></div>
            <div class="meter ${rem <= 1 ? "m-danger" : rem <= 3 ? "m-warn" : ""}"><i style="width:${Math.max(4, rem / p.size * 100)}%"></i></div>
          </div>
        </div>` : ""}
        <div class="drawer-section">
          <h4>Данные</h4>
          <div class="info-grid">
            <div><dt>Telegram</dt><dd>${esc(s.tg || "—")}</dd></div>
            <div><dt>Проведено занятий</dt><dd>${doneCount}</dd></div>
            <div><dt>Оплачено всего</dt><dd>${fmtMoney(ltv)}</dd></div>
            <div><dt>Продление</dt><dd>${fmtMoney(Store.renewalPrice(id))}</dd></div>
          </div>
          ${s.note ? `<p style="margin-top:12px;font-size:13px;color:var(--ink-2);background:var(--surface-warm);border-radius:10px;padding:10px 12px">${esc(s.note)}</p>` : ""}
        </div>
        <div class="drawer-section">
          <h4>Ближайшие занятия</h4>
          ${future.length ? future.map(l => {
            const d = fromIso(l.date);
            return `<div class="mini-item">
              <span class="mini-date">${fmtDayShort(d)}, ${fmtDow(d)}</span>
              <span class="grow">${l.time} · ${l.durationMin} мин · ${l.format === "online" ? "онлайн" : "студия"}</span>
            </div>`;
          }).join("") : `<div class="empty-note" style="padding:12px">Занятий в плане нет</div>`}
        </div>
        <div class="drawer-section">
          <h4>Последние оплаты</h4>
          ${pastPays.length ? pastPays.map(pp => `
            <div class="mini-item">
              <span class="mini-date">${fmtDayShort(fromIso(pp.date))}</span>
              <span class="grow">${esc(pp.comment || methodLabel(pp.method))}</span>
              <span class="num">${fmtMoney(pp.amount)}</span>
            </div>`).join("") : `<div class="empty-note" style="padding:12px">Оплат пока не было</div>`}
        </div>
      </div>
      <div class="drawer-actions">
        <button class="btn btn-primary btn-sm" data-act="pay">Принять оплату</button>
        <button class="btn btn-soft btn-sm" data-act="lesson">Занятие</button>
        <button class="btn btn-ghost btn-sm" data-act="edit">Изменить</button>
        <button class="btn btn-ghost btn-sm" data-act="archive" style="margin-left:auto;color:var(--danger)">В архив</button>
      </div>
    </div>`);

  drawer.addEventListener("click", async e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const act = b.dataset.act;
    if (act === "close") closeModal();
    if (act === "pay") paymentModal(id);
    if (act === "lesson") lessonModal({ studentId: id });
    if (act === "edit") studentModal(id);
    if (act === "archive") {
      closeModal();
      if (await confirmDialog("В архив?", `${s.name} исчезнет из списков, занятия останутся в истории.`, "В архив", true)) {
        Store.updateStudent(id, { archived: true });
        toast("Ученик в архиве");
        render();
      }
    }
  });

  openModal(drawer, { drawer: true });
}

function methodLabel(m) {
  return m === "card" ? "Карта" : m === "cash" ? "Наличные" : "Перевод";
}

/* ═══════════ экран: финансы ═══════════ */

function renderFinance(view) {
  const T = new Date();
  const months = Store.revenueByMonth(6);
  const cur = months[months.length - 1].sum;
  const total = Store.revenueTotal();
  const pays = Store.state.payments.slice().sort((a, b) => b.date.localeCompare(a.date));
  const avg = pays.length ? Math.round(total / pays.length) : 0;
  const renewals = Store.upcomingRenewals();
  const expectSum = renewals.reduce((a, r) => a + r.amount, 0);

  view.innerHTML = `
    <div class="fin-kpis stagger">
      <div class="card kpi" style="--i:0">
        <span class="kpi-label">Выручка в ${MONTHS_IM[T.getMonth()]}</span>
        <span class="kpi-value" data-count="${cur}">0 ₽</span>
      </div>
      <div class="card kpi" style="--i:1">
        <span class="kpi-label">За всё время</span>
        <span class="kpi-value" data-count="${total}">0 ₽</span>
      </div>
      <div class="card kpi" style="--i:2">
        <span class="kpi-label">Средний чек</span>
        <span class="kpi-value" data-count="${avg}">0 ₽</span>
      </div>
      <div class="card kpi" style="--i:3">
        <span class="kpi-label">Предстоящие продления</span>
        <span class="kpi-value" data-count="${expectSum}">0 ₽</span>
        <span class="kpi-hint">${renewals.length} ${plural(renewals.length, "ученик", "ученика", "учеников")}</span>
      </div>
    </div>

    <div class="stagger">
      <div class="card" style="--i:4;margin-bottom:14px">
        <div class="card-head" style="padding-bottom:6px">
          <span class="card-title">Предстоящие оплаты</span>
          <button class="btn btn-sm btn-primary" id="btn-pay-any">Принять оплату</button>
        </div>
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th>Ученик</th><th>Абонемент</th><th>Закончится</th><th>Продление</th><th>Напоминание</th><th></th></tr></thead>
            <tbody id="renewals-body"></tbody>
          </table>
        </div>
      </div>

      <div class="card" style="--i:5">
        <div class="card-head" style="padding-bottom:6px"><span class="card-title">История платежей</span></div>
        <div class="table-wrap">
          <table class="tbl">
            <thead><tr><th>Дата</th><th>Ученик</th><th>Что оплачено</th><th>Способ</th><th style="text-align:right">Сумма</th></tr></thead>
            <tbody id="pays-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  $$("[data-count]", view).forEach(node => countUp(node, Number(node.dataset.count)));

  const rb = $("#renewals-body", view);
  if (!renewals.length) {
    rb.innerHTML = `<tr><td colspan="6"><div class="empty-note">Ближайших продлений нет</div></td></tr>`;
  } else {
    renewals.forEach(r => {
      const k = kindOfStudent(r.student);
      const rem = r.remaining;
      const remind = Store.reminders().find(x => x.student.id === r.student.id);
      rb.appendChild(el(`
        <tr>
          <td><div style="display:flex;gap:10px;align-items:center"><span class="avatar c-${k}" style="width:30px;height:30px;font-size:11.5px">${initials(r.student.name)}</span><b>${esc(r.student.name)}</b></div></td>
          <td>${r.overdue ? `<span class="tag t-danger">закончился</span>` : `осталось <b>${rem}</b> ${lessonsWord(rem)}`}</td>
          <td class="num">${r.overdue ? "—" : (r.approx ? "~" : "") + fmtDayShort(r.dueDate)}</td>
          <td class="num">${fmtMoney(r.amount)}</td>
          <td>${remind ? (remind.sentAt ? `<span class="tag t-ok">отправлено ${fmtDayShort(fromIso(remind.sentAt))}</span>` : `<span class="tag t-warn">ждёт отправки</span>`) : `<span class="sub">рано</span>`}</td>
          <td style="text-align:right"><button class="btn btn-sm btn-soft" data-pay="${r.student.id}">Принять оплату</button></td>
        </tr>`));
    });
  }

  const pb = $("#pays-body", view);
  pays.slice(0, 25).forEach(pp => {
    const st = Store.student(pp.studentId);
    pb.appendChild(el(`
      <tr>
        <td class="num" style="font-weight:500">${fmtDayShort(fromIso(pp.date))}</td>
        <td>${esc(st ? st.name : "—")}</td>
        <td class="sub">${esc(pp.comment || "—")}</td>
        <td><span class="pay-method">${methodIcon(pp.method)}${methodLabel(pp.method)}</span></td>
        <td class="num" style="text-align:right">${fmtMoney(pp.amount)}</td>
      </tr>`));
  });

  view.onclick = e => {
    const pay = e.target.closest("[data-pay]");
    if (pay) { paymentModal(pay.dataset.pay); return; }
    if (e.target.closest("#btn-pay-any")) paymentModal();
  };
}

function methodIcon(m) {
  if (m === "card") return `<svg viewBox="0 0 20 20"><rect x="2.5" y="5" width="15" height="10.5" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2.5 8.5h15" stroke="currentColor" stroke-width="1.5"/></svg>`;
  if (m === "cash") return `<svg viewBox="0 0 20 20"><rect x="2.5" y="6" width="15" height="8.5" rx="1.8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="10.2" r="2" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
  return `<svg viewBox="0 0 20 20"><path d="M4 10h11M11.5 5.5 16 10l-4.5 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/* ═══════════ экран: напоминания ═══════════ */

function buildReminderText(r) {
  const s = Store.state.settings;
  const tpl = r.stage === "final" ? s.tplFinal : s.tplSoft;
  /* дети: пишем родителю (имя берём из контакта «(мама Ольга)»), группа — общее обращение */
  let name = r.student.name.split(" ")[0];
  if (r.student.type === "kid") {
    const parent = /\((?:мама|папа)\s+([А-ЯЁA-Z][^)\s]*)\)/.exec(r.student.tg || "");
    name = parent ? parent[1] : name;
  }
  if (r.student.type === "group") name = "Друзья";
  return tpl
    .replaceAll("{имя}", name)
    .replaceAll("{осталось}", `${r.remaining} ${lessonsWord(r.remaining)}`)
    .replaceAll("{дата}", r.runsOut ? fmtDay(r.runsOut) : "скоро")
    .replaceAll("{сумма}", new Intl.NumberFormat("ru-RU").format(Store.renewalPrice(r.student.id)));
}

function renderReminders(view) {
  const all = Store.reminders();
  const pending = all.filter(r => !r.sentAt);
  const sent = all.filter(r => r.sentAt);

  view.innerHTML = `
    <div class="rules-row stagger">
      <div class="card rule-card" style="--i:0">
        <span class="rule-num">3</span>
        <div>
          <b>Осталось 3 занятия — первое напоминание</b>
          <p>Примерно за две недели до конца абонемента мягко предупреждаем, что скоро продление.</p>
        </div>
      </div>
      <div class="card rule-card" style="--i:1">
        <span class="rule-num">1</span>
        <div>
          <b>Осталось 1 занятие — финальное напоминание</b>
          <p>За неделю: впереди последнее занятие, пора оплатить, чтобы не потерять время в расписании.</p>
        </div>
      </div>
    </div>

    <div class="stagger">
      <div class="card" style="--i:2;margin-bottom:14px">
        <div class="card-head" style="padding-bottom:6px">
          <span class="card-title">Ждут отправки</span>
          ${pending.length ? `<span class="tag t-warn">${pending.length}</span>` : ""}
        </div>
        <div id="pending-list"></div>
      </div>
      <div class="card" style="--i:3">
        <div class="card-head" style="padding-bottom:6px"><span class="card-title">Отправленные</span></div>
        <div id="sent-list"></div>
      </div>
    </div>
  `;

  const pl = $("#pending-list", view);
  if (!pending.length) {
    pl.innerHTML = `<div class="empty-note">Сейчас напоминать некому — все абонементы в порядке${SUN_INLINE}</div>`;
  } else {
    pending.forEach(r => {
      const k = kindOfStudent(r.student);
      const text = buildReminderText(r);
      pl.appendChild(el(`
        <div class="rem-item">
          <span class="avatar c-${k}">${initials(r.student.name)}</span>
          <div class="rem-body">
            <b>${esc(r.student.name)}</b>
            <span class="tag ${r.stage === "final" ? "t-danger" : "t-warn"}" style="margin-left:8px">${r.stage === "final" ? "финальное" : "первое"}</span>
            <div class="rem-when" style="margin-top:3px">осталось ${r.remaining} ${lessonsWord(r.remaining)}${r.runsOut ? ` · закончится ~${fmtDayShort(r.runsOut)}` : ""} · ${esc(r.student.tg || "")}</div>
            <div class="rem-msg">${esc(text)}</div>
          </div>
          <div class="rem-actions">
            <button class="btn btn-sm btn-primary" data-copy="${r.key}">Скопировать текст</button>
            <button class="btn btn-sm btn-ghost" data-sent="${r.key}">Отметить отправленным</button>
          </div>
        </div>`));
    });
  }

  const sl = $("#sent-list", view);
  if (!sent.length) {
    sl.innerHTML = `<div class="empty-note">Пока пусто</div>`;
  } else {
    sent.forEach(r => {
      const k = kindOfStudent(r.student);
      sl.appendChild(el(`
        <div class="rem-item">
          <span class="avatar c-${k}">${initials(r.student.name)}</span>
          <div class="rem-body">
            <b>${esc(r.student.name)}</b>
            <div class="rem-when" style="margin-top:3px">${r.stage === "final" ? "финальное" : "первое"} напоминание · отправлено ${fmtDayShort(fromIso(r.sentAt))}</div>
          </div>
          <span class="tag t-ok" style="align-self:center">✓</span>
        </div>`));
    });
  }

  view.onclick = async e => {
    const copy = e.target.closest("[data-copy]");
    if (copy) {
      const r = all.find(x => x.key === copy.dataset.copy);
      try {
        await navigator.clipboard.writeText(buildReminderText(r));
        toast("Текст скопирован — вставьте в чат с учеником");
      } catch (_) {
        toast("Не удалось скопировать — выделите текст вручную");
      }
      return;
    }
    const sentBtn = e.target.closest("[data-sent]");
    if (sentBtn) {
      Store.markReminderSent(sentBtn.dataset.sent);
      toast("Отмечено отправленным");
      render();
    }
  };
}

/* ═══════════ экран: настройки ═══════════ */

function renderSettings(view) {
  const s = Store.state.settings;
  const p = s.prices;
  view.innerHTML = `
    <div class="settings-grid stagger">
      <div class="card card-pad" style="--i:0">
        <h3 style="font-family:var(--font-display);font-weight:400;font-size:18px;margin-bottom:14px">Цены</h3>
        <div class="field-row">
          <div class="field"><label>Разовое (взрослые)</label><input type="number" id="pr-single" value="${p.single}"></div>
          <div class="field"><label>Разовое (дети)</label><input type="number" id="pr-kidSingle" value="${p.kidSingle}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Абонемент 4 (взрослые)</label><input type="number" id="pr-pack4" value="${p.pack4}"></div>
          <div class="field"><label>Абонемент 4 (дети)</label><input type="number" id="pr-kidPack4" value="${p.kidPack4}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Абонемент 8 (взрослые)</label><input type="number" id="pr-pack8" value="${p.pack8}"></div>
          <div class="field"><label>Абонемент 8 (дети)</label><input type="number" id="pr-kidPack8" value="${p.kidPack8}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Группа, за место</label><input type="number" id="pr-group" value="${p.group}"></div>
          <div class="field"><label>Часы работы</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" id="work-start" min="6" max="23" value="${s.workStart}" style="width:70px"> —
              <input type="number" id="work-end" min="7" max="24" value="${s.workEnd}" style="width:70px">
            </div>
          </div>
        </div>
        <button class="btn btn-primary" id="save-prices">Сохранить</button>
      </div>

      <div class="card card-pad" style="--i:1">
        <h3 style="font-family:var(--font-display);font-weight:400;font-size:18px;margin-bottom:14px">Шаблоны напоминаний</h3>
        <div class="field">
          <label>Первое напоминание (осталось 3 занятия)</label>
          <textarea id="tpl-soft">${esc(s.tplSoft)}</textarea>
          <span class="hint">Подстановки: {имя}, {осталось}, {дата}, {сумма}</span>
        </div>
        <div class="field">
          <label>Финальное (осталось 1 занятие)</label>
          <textarea id="tpl-final">${esc(s.tplFinal)}</textarea>
        </div>
        <button class="btn btn-primary" id="save-tpl">Сохранить шаблоны</button>

        <div style="border-top:1px solid var(--line-soft);margin:20px 0 16px"></div>
        <p style="font-size:12.5px;color:var(--muted);margin-bottom:10px">Демо-режим: все данные живут в этом браузере (localStorage).</p>
        <button class="btn btn-ghost" id="reset-demo" style="color:var(--danger)">Сбросить демо-данные</button>
      </div>
    </div>
  `;

  $("#save-prices", view).onclick = () => {
    const num = id => Math.max(0, Number($(id, view).value) || 0);
    Object.assign(Store.state.settings.prices, {
      single: num("#pr-single"), kidSingle: num("#pr-kidSingle"),
      pack4: num("#pr-pack4"), kidPack4: num("#pr-kidPack4"),
      pack8: num("#pr-pack8"), kidPack8: num("#pr-kidPack8"),
      group: num("#pr-group"),
    });
    const ws = Math.min(23, Math.max(6, Number($("#work-start", view).value) || 10));
    const we = Math.min(24, Math.max(ws + 1, Number($("#work-end", view).value) || 21));
    Store.state.settings.workStart = ws;
    Store.state.settings.workEnd = we;
    Store.save();
    toast("Сохранено");
  };

  $("#save-tpl", view).onclick = () => {
    Store.state.settings.tplSoft = $("#tpl-soft", view).value;
    Store.state.settings.tplFinal = $("#tpl-final", view).value;
    Store.save();
    toast("Шаблоны сохранены");
  };

  $("#reset-demo", view).onclick = async () => {
    if (await confirmDialog("Сбросить данные?", "Вернутся исходные демо-данные. Всё, что вы добавили, исчезнет.", "Сбросить", true)) {
      Store.reset();
      toast("Демо-данные пересозданы");
      render();
    }
  };
}

/* ═══════════ модалка: занятие ═══════════ */

function lessonModal(prefill = {}) {
  const students = Store.activeStudents();
  if (!students.length) { toast("Сначала добавьте ученика"); studentModal(); return; }
  const defDate = prefill.date || iso(today());
  const defTime = prefill.time || "18:00";
  const s0 = prefill.studentId || (students[0] && students[0].id);

  const times = [];
  for (let h = 8; h <= 21; h++) { times.push(`${String(h).padStart(2, "0")}:00`); times.push(`${String(h).padStart(2, "0")}:30`); }

  const m = el(`
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>Новое занятие</h3>
        <button class="icon-btn" data-close aria-label="Закрыть"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Ученик</label>
          <select id="lm-student">${students.map(s => `<option value="${s.id}" ${s.id === s0 ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
        </div>
        <div class="field-row-3">
          <div class="field"><label>Дата</label><input type="date" id="lm-date" value="${defDate}"></div>
          <div class="field"><label>Время</label>
            <select id="lm-time">${times.map(t => `<option ${t === defTime ? "selected" : ""}>${t}</option>`).join("")}</select>
          </div>
          <div class="field"><label>Минут</label>
            <select id="lm-dur"><option>45</option><option selected>60</option><option>90</option></select>
          </div>
        </div>
        <div class="field">
          <label>Формат</label>
          <div class="choice-row" id="lm-format">
            <button class="choice active" data-v="offline">В студии</button>
            <button class="choice" data-v="online">Онлайн</button>
          </div>
        </div>
        <div class="field">
          <label>Повторять</label>
          <div class="choice-row" id="lm-repeat">
            <button class="choice active" data-v="1">Один раз</button>
            <button class="choice" data-v="4">4 недели</button>
            <button class="choice" data-v="8">8 недель</button>
          </div>
        </div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-primary" id="lm-save">Добавить в расписание</button>
      </div>
    </div>`);

  const syncFormat = () => {
    const st = Store.student($("#lm-student", m).value);
    if (!st) return;
    $$("#lm-format .choice", m).forEach(c => c.classList.toggle("active", c.dataset.v === st.format));
  };
  $("#lm-student", m).addEventListener("change", syncFormat);
  if (!prefill.studentId) syncFormat();
  else syncFormat();

  m.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) { closeModal(); return; }
    const choice = e.target.closest(".choice");
    if (choice) {
      $$(".choice", choice.parentElement).forEach(c => c.classList.remove("active"));
      choice.classList.add("active");
      return;
    }
    if (e.target.closest("#lm-save")) {
      const studentId = $("#lm-student", m).value;
      const st = Store.student(studentId);
      if (!st) { toast("Выберите ученика"); return; }
      const date = $("#lm-date", m).value;
      if (!date) { toast("Укажите дату"); return; }
      const time = $("#lm-time", m).value;
      const dur = Number($("#lm-dur", m).value);
      const format = $("#lm-format .choice.active", m).dataset.v;
      const weeks = Number($("#lm-repeat .choice.active", m).dataset.v);
      const kind = st.type === "group" ? "group" : format === "online" ? "online" : st.type === "kid" ? "kid" : "adult";
      for (let w = 0; w < weeks; w++) {
        Store.addLesson({ studentId, date: iso(addDays(fromIso(date), w * 7)), time, durationMin: dur, kind, format });
      }
      closeModal();
      toast(weeks > 1 ? `Добавлено ${weeks} ${lessonsWord(weeks)}` : "Занятие в расписании");
      ui.weekStart = mondayOf(fromIso(date));
      ui.calMode = "week";
      if (ui.route !== "calendar") navigate("calendar"); else render();
    }
  });

  openModal(m);
}

/* ═══════════ модалка: ученик ═══════════ */

function studentModal(editId) {
  const s = editId ? Store.student(editId) : null;
  const m = el(`
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>${s ? "Изменить ученика" : "Новый ученик"}</h3>
        <button class="icon-btn" data-close aria-label="Закрыть"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="field"><label>Имя и фамилия</label><input id="sm-name" value="${esc(s ? s.name : "")}" placeholder="Например: Анна Смирнова"></div>
        <div class="field">
          <label>Кто это</label>
          <div class="choice-row" id="sm-type">
            <button class="choice ${!s || s.type === "adult" ? "active" : ""}" data-v="adult">Взрослый</button>
            <button class="choice ${s && s.type === "kid" ? "active" : ""}" data-v="kid">Ребёнок</button>
            <button class="choice ${s && s.type === "group" ? "active" : ""}" data-v="group">Группа</button>
          </div>
        </div>
        <div class="field">
          <label>Формат занятий</label>
          <div class="choice-row" id="sm-format">
            <button class="choice ${!s || s.format === "offline" ? "active" : ""}" data-v="offline">В студии</button>
            <button class="choice ${s && s.format === "online" ? "active" : ""}" data-v="online">Онлайн</button>
          </div>
        </div>
        <div class="field"><label>Telegram / контакт</label><input id="sm-tg" value="${esc(s ? s.tg : "")}" placeholder="@username или телефон"></div>
        <div class="field"><label>Заметка</label><textarea id="sm-note" placeholder="Цель, особенности, репертуар…">${esc(s ? s.note : "")}</textarea></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-primary" id="sm-save">${s ? "Сохранить" : "Добавить"}</button>
      </div>
    </div>`);

  m.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) { closeModal(); return; }
    const choice = e.target.closest(".choice");
    if (choice) {
      $$(".choice", choice.parentElement).forEach(c => c.classList.remove("active"));
      choice.classList.add("active");
      return;
    }
    if (e.target.closest("#sm-save")) {
      const name = $("#sm-name", m).value.trim();
      if (!name) { toast("Как зовут ученика?"); return; }
      const data = {
        name,
        type: $("#sm-type .choice.active", m).dataset.v,
        format: $("#sm-format .choice.active", m).dataset.v,
        tg: $("#sm-tg", m).value.trim(),
        note: $("#sm-note", m).value.trim(),
      };
      if (s) {
        Store.updateStudent(s.id, data);
        toast("Сохранено");
      } else {
        Store.addStudent(data);
        toast(`${name} — в списке учеников`);
      }
      closeModal();
      if (ui.route !== "students") navigate("students"); else render();
    }
  });

  openModal(m);
}

/* ═══════════ модалка: оплата ═══════════ */

function paymentModal(studentId) {
  const students = Store.activeStudents();
  if (!students.length) { toast("Сначала добавьте ученика"); studentModal(); return; }
  const s0 = studentId || (students[0] && students[0].id);

  const m = el(`
    <div class="modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <h3>Принять оплату</h3>
        <button class="icon-btn" data-close aria-label="Закрыть"><svg viewBox="0 0 20 20"><path d="m5 5 10 10M15 5 5 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
      </div>
      <div class="modal-body">
        <div class="field">
          <label>Ученик</label>
          <select id="pm-student">${students.map(s => `<option value="${s.id}" ${s.id === s0 ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select>
        </div>
        <div class="field">
          <label>Что оплачивает</label>
          <div class="choice-row" id="pm-what">
            <button class="choice active" data-v="4">Абонемент 4</button>
            <button class="choice" data-v="8">Абонемент 8</button>
            <button class="choice" data-v="1">Разовое</button>
          </div>
        </div>
        <div class="field-row">
          <div class="field"><label>Сумма, ₽</label><input type="number" id="pm-amount"></div>
          <div class="field"><label>Способ</label>
            <select id="pm-method">
              <option value="card">Карта</option>
              <option value="transfer">Перевод</option>
              <option value="cash">Наличные</option>
            </select>
          </div>
        </div>
        <p class="hint" id="pm-note" style="font-size:12px;color:var(--muted)"></p>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" data-close>Отмена</button>
        <button class="btn btn-primary" id="pm-save">Записать оплату</button>
      </div>
    </div>`);

  const suggest = () => {
    const st = Store.student($("#pm-student", m).value);
    if (!st) return;
    const size = Number($("#pm-what .choice.active", m).dataset.v);
    const p = Store.state.settings.prices;
    let sum;
    if (st.type === "group") sum = p.group;
    else if (st.type === "kid") sum = size === 8 ? p.kidPack8 : size === 4 ? p.kidPack4 : p.kidSingle;
    else sum = size === 8 ? p.pack8 : size === 4 ? p.pack4 : p.single;
    $("#pm-amount", m).value = sum;
    const rem = Store.remaining(st.id);
    $("#pm-note", m).textContent = size > 1
      ? (rem > 0 ? `Сейчас на абонементе ${rem} ${lessonsWord(rem)} — новые добавятся к ним.` : "Начнётся новый абонемент.")
      : "Разовое занятие — абонемент не меняется.";
  };

  $("#pm-student", m).addEventListener("change", suggest);
  suggest();

  m.addEventListener("click", e => {
    if (e.target.closest("[data-close]")) { closeModal(); return; }
    const choice = e.target.closest(".choice");
    if (choice) {
      $$(".choice", choice.parentElement).forEach(c => c.classList.remove("active"));
      choice.classList.add("active");
      suggest();
      return;
    }
    if (e.target.closest("#pm-save")) {
      const sid = $("#pm-student", m).value;
      const st = Store.student(sid);
      const size = Number($("#pm-what .choice.active", m).dataset.v);
      const amount = Number($("#pm-amount", m).value) || 0;
      if (amount <= 0) { toast("Проверьте сумму"); return; }
      const comment = size > 1 ? `Абонемент ${size} ${lessonsWord(size)}` : "Разовое занятие";
      Store.addPayment({ studentId: sid, amount, method: $("#pm-method", m).value, passSize: size, comment });
      closeModal();
      toast(`Оплата записана: ${st.name.split(" ")[0]}, ${fmtMoney(amount)}`);
      render();
    }
  });

  openModal(m);
}

/* ═══════════ инициализация ═══════════ */

let cleanupFns = [];

const _render = render;
render = function () {
  cleanupFns.forEach(fn => fn());
  cleanupFns = [];
  _render();
};

Store.load();

window.addEventListener("hashchange", render);

$("#btn-add-lesson").addEventListener("click", () => lessonModal());
$("#btn-add-student").addEventListener("click", () => studentModal());
$("#burger").addEventListener("click", () => $("#sidebar").classList.toggle("open"));

document.addEventListener("click", e => {
  /* клик мимо сайдбара на мобиле закрывает его */
  const sb = $("#sidebar");
  if (sb.classList.contains("open") && !e.target.closest("#sidebar") && !e.target.closest("#burger")) {
    sb.classList.remove("open");
  }
});

render();
