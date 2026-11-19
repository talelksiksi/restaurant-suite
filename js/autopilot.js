/*
 * "Busy service": a simulated crowd so the screens keep moving while someone
 * looks at the demo. Guests order by QR, stations start and finish tickets,
 * the waiter serves, tables ask for the bill and the cashier closes it in the
 * current billing mode. Only one open tab drives it at a time.
 */
(function () {
  const D = window.RS_DATA;
  const me = STORE.uid();
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const SEC = 1000;

  function lead() {
    let mine = false;
    STORE.update((s) => {
      const p = s.pilot;
      if (!p || p.tab === me || Date.now() - p.at > 8 * SEC) { s.pilot = { tab: me, at: Date.now() }; mine = true; }
    });
    return mine;
  }

  function guestOrder(s) {
    const busy = new Set(s.orders.filter((o) => o.status === "open").map((o) => o.tableId));
    const free = D.TABLES.filter((x) => x.id !== "C" && !busy.has(x.id));
    if (!free.length || busy.size >= 6) return false;
    const table = pick(free).id;
    const n = 1 + Math.floor(Math.random() * 3);
    const lines = [];
    for (let i = 0; i < n; i++) {
      const it = pick(D.ITEMS);
      const mods = it.mods.filter((m) => D.MODS[m].one).map((m) => { const o = pick(D.MODS[m].options); return { mod: m, id: o.id, price: o.price }; });
      lines.push(STORE.line(it.id, 1 + (Math.random() < 0.3 ? 1 : 0), mods, ""));
    }
    STORE.sendLines(s, table, lines, Math.random() < 0.55 ? "guest" : "waiter", "Faisal");
    return true;
  }

  function step() {
    const s = STORE.get();
    if (!s.autopilot || !lead()) return;
    const now = Date.now();
    const all = [];
    s.orders.filter((o) => o.status === "open").forEach((o) => o.lines.forEach((l) => all.push({ o, l })));
    const r = Math.random();
    // Stations move the oldest tickets first.
    const start = all.filter((x) => x.l.status === "new" && now - x.l.firedAt > 12 * SEC).sort((a, b) => a.l.firedAt - b.l.firedAt)[0];
    const finish = all.filter((x) => x.l.status === "cooking" && now - (x.l.startedAt || 0) > 18 * SEC).sort((a, b) => a.l.startedAt - b.l.startedAt)[0];
    const serve = all.filter((x) => x.l.status === "ready" && now - x.l.readyAt > 14 * SEC)[0];
    const doneTables = s.orders.filter((o) => o.status === "open" && o.lines.length && o.lines.every((l) => l.status === "served") && now - Math.max(...o.lines.map((l) => l.servedAt || 0)) > 20 * SEC);
    const billCall = s.calls.find((c) => c.type === "bill" && !c.done && now - c.at > 15 * SEC);

    if (billCall) {
      const o = STORE.openOrder(s, billCall.tableId);
      if (o) {
        const open = o.lines.filter((l) => !l.paid);
        const left = INVOICE.r2(open.reduce((a, l) => a + l.unit * l.qty, 0) - (o.paidShares || 0));
        INVOICE.issue({ tableId: o.tableId, orderNo: o.no, lines: o.paidShares ? [] : open, share: o.paidShares ? left : 0, payment: Math.random() < 0.7 ? "card" : "cash", mode: s.mode });
        return;
      }
      STORE.update((st) => { const c = st.calls.find((x) => x.id === billCall.id); if (c) c.done = true; });
      return;
    }
    if (doneTables.length && r < 0.5) {
      const o = doneTables[0];
      STORE.update((st) => { if (!st.calls.some((c) => c.tableId === o.tableId && !c.done)) st.calls.push({ id: STORE.uid(), tableId: o.tableId, type: "bill", at: Date.now(), done: false }); });
      return;
    }
    const moves = [];
    if (start) moves.push(() => STORE.update((st) => { st.orders.forEach((o) => o.lines.forEach((l) => { if (l.ticket === start.l.ticket && l.station === start.l.station && l.status === "new") { l.status = "cooking"; l.startedAt = Date.now(); } })); }));
    if (finish) moves.push(() => STORE.update((st) => { st.orders.forEach((o) => o.lines.forEach((l) => { if (l.ticket === finish.l.ticket && l.station === finish.l.station && l.status === "cooking") { l.status = "ready"; l.readyAt = Date.now(); } })); }));
    if (serve) moves.push(() => STORE.update((st) => { st.orders.forEach((o) => o.lines.forEach((l) => { if (l.id === serve.l.id) { l.status = "served"; l.servedAt = Date.now(); } })); }));
    if (moves.length && r < 0.8) return pick(moves)();
    let placed = false;
    STORE.update((st) => { placed = guestOrder(st); });
    if (!placed && moves.length) pick(moves)();
  }

  setInterval(step, 4500);
  setInterval(INVOICE.processQueue, 900);
})();
