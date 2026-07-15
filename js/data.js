/* ═══════════════════════════════════════════════════════════════
   Соль · данные
   Хранилище: localStorage. Демо-сид генерируется относительно
   сегодняшней даты, чтобы календарь и напоминания всегда были живыми.
   ═══════════════════════════════════════════════════════════════ */

const DB_KEY = "sol-crm-v1";
const DAY = 86400000;

/* — утилиты дат — */
function d0(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); return d; }
function today() { return d0(new Date()); }
function addDays(date, n) { return new Date(d0(date).getTime() + n * DAY); }
function iso(date) {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function fromIso(s) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
/* понедельник недели, в которую попадает дата */
function mondayOf(date) {
  const d = d0(date);
  const shift = (d.getDay() + 6) % 7;
  return addDays(d, -shift);
}
/* ближайшая дата с нужным днём недели (1=Пн … 7=Вс), начиная с from */
function nextDow(from, dow) {
  const d = d0(from);
  const cur = ((d.getDay() + 6) % 7) + 1;
  return addDays(d, (dow - cur + 7) % 7);
}

/* ═══════════ демо-сид ═══════════ */

function buildSeed() {
  const T = today();

  const settings = {
    studioName: "SA Music Lab",
    ownerName: "Анастасия",
    workStart: 10,
    workEnd: 21,
    prices: {
      single: 2500, pack4: 9000, pack8: 16800,
      kidSingle: 2000, kidPack4: 7600, kidPack8: 14000,
      group: 1490,
    },
    tplSoft: "{имя}, привет! 🌞 На вашем абонементе осталось {осталось} — примерно до {дата}. Чтобы не прерывать занятия, можно продлить заранее: {сумма} ₽. Напишите, как будет удобно!",
    tplFinal: "{имя}, привет! Осталось последнее занятие по абонементу — {дата}. Продлим? Абонемент — {сумма} ₽. Забронирую ваше время в расписании 🎤",
  };

  /* slots: [день недели 1-7, "ЧЧ:ММ", минуты] */
  const students = [
    { id: "s1", name: "Марина Ковалёва", type: "adult", format: "offline", tg: "@marina_kov", note: "Готовится к корпоративу в сентябре — «Кукушка».", slots: [[1, "18:00", 60], [4, "19:00", 60]], passSize: 8, passRemaining: 6, since: -150 },
    { id: "s2", name: "Сергей Дронов", type: "adult", format: "offline", tg: "@sdronov", note: "Работает над низами, любит рок.", slots: [[3, "20:00", 60]], passSize: 4, passRemaining: 1, since: -210 },
    { id: "s3", name: "Алиса Тян", type: "kid", format: "offline", tg: "@olga_tyan (мама Ольга)", note: "9 лет. Конкурс «Голос дети Сочи» в октябре.", slots: [[2, "16:00", 45], [5, "16:00", 45]], passSize: 8, passRemaining: 3, since: -260 },
    { id: "s4", name: "Тимур Гасанов", type: "kid", format: "offline", tg: "@gasanova_m (мама Мадина)", note: "11 лет. Стесняется, раскрывается на распевках.", slots: [[6, "12:00", 45]], passSize: 4, passRemaining: 2, since: -90 },
    { id: "s5", name: "Екатерина Лебедева", type: "adult", format: "online", tg: "@katelebedeva", note: "Онлайн из Краснодара. Цель — перестать бояться голосовых.", slots: [[2, "19:00", 60]], passSize: 4, passRemaining: 4, since: -30 },
    { id: "s6", name: "Полина Шарова", type: "adult", format: "online", tg: "@psharova", note: "Москва. Пишет свой первый трек, разбираем куплеты.", slots: [[1, "11:00", 60], [4, "11:00", 60]], passSize: 8, passRemaining: 5, since: -120 },
    { id: "s7", name: "Дарья Мельник", type: "adult", format: "offline", tg: "@dashamelnik", note: "Ходит разово, обычно раз в 2 недели.", slots: [], passSize: 1, passRemaining: 0, since: -180 },
    { id: "s8", name: "Владимир Кац", type: "adult", format: "offline", tg: "@vkats", note: "Джазовые стандарты. Просил сместить время на 17:00.", slots: [[4, "17:00", 60]], passSize: 4, passRemaining: 1, since: -110 },
    { id: "s9", name: "София Крылова", type: "kid", format: "offline", tg: "@krylova_mama (мама Вера)", note: "7 лет. Занимается полгода, чистая интонация.", slots: [[3, "15:00", 45]], passSize: 8, passRemaining: 5, since: -170 },
    { id: "s10", name: "Лейла Абдулова", type: "adult", format: "offline", tg: "@leyla_abd", note: "Новенькая — пришла после концерта в Marine Garden.", slots: [[2, "12:00", 60]], passSize: 4, passRemaining: 4, since: -6 },
    { id: "g1", name: "Группа «Голос громче страха»", type: "group", format: "online", tg: "закрытый чат потока", note: "2-й поток, 7 участниц. Воскресные онлайн-встречи.", slots: [[7, "18:00", 90]], passSize: 4, passRemaining: 2, since: -33 },
  ];

  /* — абонементы — */
  const priceFor = (st) => {
    if (st.type === "group") return settings.prices.group;
    const p = settings.prices;
    if (st.type === "kid") return st.passSize === 8 ? p.kidPack8 : st.passSize === 4 ? p.kidPack4 : p.kidSingle;
    return st.passSize === 8 ? p.pack8 : st.passSize === 4 ? p.pack4 : p.single;
  };

  const passes = students
    .filter(s => s.passSize > 1)
    .map(s => ({
      id: "p_" + s.id,
      studentId: s.id,
      size: s.passSize,
      used: s.passSize - s.passRemaining,
      price: priceFor(s),
      purchasedAt: iso(addDays(T, -Math.min(40, Math.round((s.passSize - s.passRemaining) * 5 + 6)))),
    }));

  /* — занятия: прошлое (8 недель) + будущее (3 недели) по слотам — */
  const lessons = [];
  let lid = 1;
  const kindOf = (s) => s.type === "group" ? "group" : (s.format === "online" ? "online" : s.type === "kid" ? "kid" : "adult");

  students.forEach(s => {
    const startFrom = addDays(T, Math.max(-56, s.since));
    s.slots.forEach(([dow, time, dur]) => {
      let d = nextDow(startFrom, dow);
      const horizon = addDays(T, 21);
      while (d <= horizon) {
        const past = d < T;
        /* редкие отмены в прошлом — детерминированно по дате */
        const canceled = past && (d.getDate() % 17 === 0);
        lessons.push({
          id: "l" + (lid++),
          studentId: s.id,
          date: iso(d),
          time, durationMin: dur,
          kind: kindOf(s),
          format: s.format,
          status: past ? (canceled ? "canceled" : "done") : "planned",
          note: "",
        });
        d = addDays(d, 7);
      }
    });
  });

  /* разовые занятия Дарьи — раз в две недели по субботам 14:00 */
  for (let w = -8; w <= 2; w += 2) {
    const d = addDays(nextDow(addDays(T, w * 7), 6), 0);
    if (d > addDays(T, 21)) continue;
    lessons.push({
      id: "l" + (lid++), studentId: "s7", date: iso(d), time: "14:00", durationMin: 60,
      kind: "adult", format: "offline", status: d < T ? "done" : "planned", note: "разовое",
    });
  }

  /* пробное занятие Лейлы — уже в расписании через слот; отметим прошедшее одно */
  /* — оплаты за последние 6 месяцев — рисуют рост выручки — */
  const payments = [];
  let pid = 1;
  const pay = (studentId, daysAgo, amount, method, comment) => {
    payments.push({
      id: "pay" + (pid++), studentId,
      date: iso(addDays(T, -daysAgo)),
      amount, method, comment: comment || "",
    });
  };

  /* история: каждый постоянный ученик платит примерно раз в 4-5 недель */
  const history = [
    /* ~5 месяцев назад */
    ["s1", 152, 16800], ["s2", 148, 9000], ["s3", 155, 14000], ["s7", 150, 2500], ["s9", 146, 14000],
    /* ~4 месяца */
    ["s1", 118, 16800], ["s2", 120, 9000], ["s3", 115, 14000], ["s6", 122, 16800], ["s7", 117, 2500], ["s8", 113, 9000],
    /* ~3 месяца */
    ["s1", 87, 16800], ["s2", 90, 9000], ["s3", 82, 14000], ["s4", 85, 7600], ["s6", 88, 16800], ["s7", 84, 2500], ["s8", 81, 9000], ["s9", 86, 14000],
    /* ~2 месяца */
    ["s1", 55, 16800], ["s2", 58, 9000], ["s3", 50, 14000], ["s4", 52, 7600], ["s6", 57, 16800], ["s7", 54, 2500], ["s8", 49, 9000], ["s9", 51, 14000], ["s5", 48, 9000],
    /* ~1 месяц */
    ["s1", 26, 16800], ["s2", 24, 9000], ["s3", 20, 14000], ["s6", 25, 16800], ["s7", 22, 2500], ["s8", 18, 9000], ["s9", 21, 14000],
    /* текущий месяц */
    ["s1", 9, 16800], ["s5", 8, 9000], ["s4", 6, 7600], ["s10", 5, 9000], ["s7", 3, 2500],
  ];
  const methods = ["card", "transfer", "cash"];
  history.forEach(([sid, ago, amt], i) => {
    const st = students.find(s => s.id === sid);
    pay(sid, ago, amt, methods[i % 3], st && st.passSize > 1 ? `Абонемент ${st.passSize} занятий` : "Разовое занятие");
  });

  /* оплаты группы: 7 участниц по 1490 при старте потока (~33 дня назад) */
  for (let i = 0; i < 7; i++) pay("g1", 33 - (i % 3), 1490, "transfer", "«Голос громче страха», 2-й поток");

  return {
    version: 1,
    seededAt: iso(T),
    settings,
    students: students.map(({ slots, passSize, passRemaining, since, ...rest }) => ({
      ...rest, slots, archived: false,
      createdAt: iso(addDays(T, since)),
    })),
    passes,
    lessons,
    payments,
    remindersSent: {},   /* key: passId_stage → iso даты отправки */
    nextId: { lesson: lid, payment: pid, student: 20, pass: 20 },
  };
}

/* ═══════════ store ═══════════ */

const Store = {
  state: null,

  load() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1) { this.state = parsed; return; }
      }
    } catch (e) { /* повреждённые данные → пересев */ }
    this.state = buildSeed();
    this.save();
  },

  save() {
    localStorage.setItem(DB_KEY, JSON.stringify(this.state));
  },

  reset() {
    localStorage.removeItem(DB_KEY);
    this.load();
  },

  /* — выборки — */
  student(id) { return this.state.students.find(s => s.id === id); },
  activeStudents() { return this.state.students.filter(s => !s.archived); },
  passOf(studentId) { return this.state.passes.find(p => p.studentId === studentId); },
  lessonsOf(studentId) { return this.state.lessons.filter(l => l.studentId === studentId); },
  paymentsOf(studentId) { return this.state.payments.filter(p => p.studentId === studentId); },

  lessonsOnDate(isoDate) {
    return this.state.lessons
      .filter(l => l.date === isoDate)
      .sort((a, b) => a.time.localeCompare(b.time));
  },

  lessonsBetween(fromIsoD, toIsoD) {
    return this.state.lessons.filter(l => l.date >= fromIsoD && l.date <= toIsoD);
  },

  remaining(studentId) {
    const p = this.passOf(studentId);
    return p ? Math.max(0, p.size - p.used) : 0;
  },

  /* дата, когда закончится абонемент: дата N-го будущего запланированного занятия */
  passRunsOutOn(studentId) {
    const rem = this.remaining(studentId);
    if (!rem) return null;
    const future = this.lessonsOf(studentId)
      .filter(l => l.status === "planned" && l.date >= iso(today()))
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    if (!future.length) return null;
    const idx = Math.min(rem, future.length) - 1;
    return fromIso(future[idx].date);
  },

  renewalPrice(studentId) {
    const st = this.student(studentId);
    const p = this.passOf(studentId);
    const pr = this.state.settings.prices;
    if (!st) return pr.pack4;
    if (st.type === "group") return pr.group;
    const size = p ? p.size : 4;
    if (st.type === "kid") return size === 8 ? pr.kidPack8 : pr.kidPack4;
    return size === 8 ? pr.pack8 : pr.pack4;
  },

  /* — напоминания —
     Правило Влада: осталось 3 занятия → предупредить (~за 2 недели),
     осталось 1 занятие → финальное напоминание (~за неделю). */
  reminders() {
    const out = [];
    this.activeStudents().forEach(st => {
      const p = this.passOf(st.id);
      if (!p) return;
      const rem = p.size - p.used;
      if (rem <= 0 || rem > 3) return;
      const stage = rem <= 1 ? "final" : "soft";
      const key = p.id + "_" + stage;
      out.push({
        student: st, pass: p, remaining: rem, stage,
        runsOut: this.passRunsOutOn(st.id),
        sentAt: this.state.remindersSent[key] || null,
        key,
      });
    });
    /* финальные раньше мягких, внутри — по дате окончания */
    return out.sort((a, b) =>
      (a.stage === b.stage ? 0 : a.stage === "final" ? -1 : 1) ||
      ((a.runsOut ? a.runsOut.getTime() : 9e15) - (b.runsOut ? b.runsOut.getTime() : 9e15)));
  },

  pendingRemindersCount() {
    return this.reminders().filter(r => !r.sentAt).length;
  },

  markReminderSent(key) {
    this.state.remindersSent[key] = iso(today());
    this.save();
  },

  /* — мутации — */
  addLesson(data) {
    const id = "l" + (this.state.nextId.lesson++);
    this.state.lessons.push({ id, status: "planned", note: "", ...data });
    this.save();
    return id;
  },

  updateLesson(id, patch) {
    const l = this.state.lessons.find(x => x.id === id);
    if (!l) return;
    Object.assign(l, patch);
    this.save();
  },

  /* отметить проведённым → списать занятие с абонемента */
  completeLesson(id) {
    const l = this.state.lessons.find(x => x.id === id);
    if (!l || l.status === "done") return;
    l.status = "done";
    const p = this.passOf(l.studentId);
    if (p && p.used < p.size) p.used++;
    this.save();
  },

  uncompleteLesson(id) {
    const l = this.state.lessons.find(x => x.id === id);
    if (!l || l.status !== "done") return;
    l.status = "planned";
    const p = this.passOf(l.studentId);
    if (p && p.used > 0) p.used--;
    this.save();
  },

  cancelLesson(id) {
    this.updateLesson(id, { status: "canceled" });
  },

  deleteLesson(id) {
    this.state.lessons = this.state.lessons.filter(l => l.id !== id);
    this.save();
  },

  addStudent(data) {
    const id = "s" + (this.state.nextId.student++);
    this.state.students.push({
      id, archived: false, slots: [], note: "", tg: "",
      createdAt: iso(today()), ...data,
    });
    this.save();
    return id;
  },

  updateStudent(id, patch) {
    const s = this.student(id);
    if (!s) return;
    Object.assign(s, patch);
    this.save();
  },

  /* оплата: создаёт платёж и продлевает/создаёт абонемент */
  addPayment({ studentId, amount, method, passSize, comment }) {
    const id = "pay" + (this.state.nextId.payment++);
    this.state.payments.push({ id, studentId, amount, method, date: iso(today()), comment: comment || "" });
    if (passSize > 1) {
      let p = this.passOf(studentId);
      if (p && p.used >= p.size) p = null;              /* исчерпан — новый */
      if (p && p.used < p.size) {
        /* докупка к действующему: расширяем */
        p.size += passSize; p.price += amount;
      } else {
        this.state.passes = this.state.passes.filter(x => x.studentId !== studentId);
        this.state.passes.push({
          id: "p" + (this.state.nextId.pass++), studentId,
          size: passSize, used: 0, price: amount, purchasedAt: iso(today()),
        });
        /* сброс отметок напоминаний по старому абонементу не нужен: ключи по passId */
      }
    }
    this.save();
    return id;
  },

  /* — аналитика — */
  monthKey(isoDate) { return isoDate.slice(0, 7); },

  revenueByMonth(nMonths = 6) {
    const out = [];
    const T = today();
    for (let i = nMonths - 1; i >= 0; i--) {
      const d = new Date(T.getFullYear(), T.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const sum = this.state.payments
        .filter(p => this.monthKey(p.date) === key)
        .reduce((a, p) => a + p.amount, 0);
      out.push({ key, date: d, sum, isCurrent: i === 0 });
    }
    return out;
  },

  revenueTotal() { return this.state.payments.reduce((a, p) => a + p.amount, 0); },

  ltv(studentId) {
    return this.paymentsOf(studentId).reduce((a, p) => a + p.amount, 0);
  },

  /* предстоящие оплаты: у кого абонемент закончится в ближайшие 45 дней */
  upcomingRenewals() {
    const out = [];
    this.activeStudents().forEach(st => {
      const p = this.passOf(st.id);
      if (!p) return;
      const rem = p.size - p.used;
      if (rem <= 0) {
        out.push({ student: st, remaining: 0, dueDate: today(), amount: this.renewalPrice(st.id), overdue: true });
        return;
      }
      const due = this.passRunsOutOn(st.id);
      if (!due) return;
      if (due <= addDays(today(), 45)) {
        out.push({ student: st, remaining: rem, dueDate: due, amount: this.renewalPrice(st.id), overdue: false });
      }
    });
    return out.sort((a, b) => a.dueDate - b.dueDate);
  },
};
