/*
 * The live order stream. One state object, shared by every screen.
 *
 * In the demo it lives in localStorage and changes are pushed to the other tabs
 * and frames with a BroadcastChannel. The real system keeps the same shape on the
 * venue's server and pushes the same change events over SignalR, so the screens
 * do not change when the transport does.
 */
(function () {
  const KEY = "rs-state-v1";
  const D = window.RS_DATA;
  const chan = "BroadcastChannel" in window ? new BroadcastChannel("rs-suite") : null;
  const listeners = [];
  let state = null;
  let memory = null; // used if storage is blocked

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : "id-" + Math.random().toString(36).slice(2) + Date.now().toString(36));
  const now = () => Date.now();
  const MIN = 60000;

  function load() {
    try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch {}
    return memory;
  }
  function save(s) {
    memory = s;
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
  }
  function emit(origin) { listeners.forEach((f) => { try { f(state, origin); } catch (e) { console.error(e); } }); }

  /** Apply a change to the latest state, save it and tell every other screen. */
  function update(fn) {
    state = load() || state || seed();
    fn(state);
    state.rev = (state.rev || 0) + 1;
    state.touched = now();
    save(state);
    if (chan) chan.postMessage({ rev: state.rev });
    emit("local");
    return state;
  }
  function refresh() { const s = load(); if (s && (!state || s.rev !== state.rev)) { state = s; emit("remote"); } }
  if (chan) chan.onmessage = refresh;
  window.addEventListener("storage", (e) => { if (e.key === KEY) refresh(); });

  // ------------------------------------------------------------------ orders
  function line(itemId, qty, mods, note, extra) {
    const it = D.item(itemId);
    const modPrice = (mods || []).reduce((sum, m) => sum + (m.price || 0), 0);
    return Object.assign({ id: uid(), itemId, qty: qty || 1, mods: mods || [], note: note || "", unit: it.price + modPrice, station: it.station, status: "new", firedAt: now(), startedAt: null, readyAt: null, servedAt: null, paid: false }, extra || {});
  }
  function openOrder(s, tableId) { return s.orders.find((o) => o.tableId === tableId && o.status === "open"); }

  /** Add lines to the table's open order, creating it if needed. Lines go to their stations at once. */
  function sendLines(s, tableId, lines, source, waiter) {
    let o = openOrder(s, tableId);
    if (!o) {
      s.seq.order += 1;
      o = { id: uid(), no: s.seq.order, tableId, status: "open", createdAt: now(), sources: [], waiter: waiter || null };
      o.lines = [];
      s.orders.push(o);
    }
    if (!o.sources.includes(source)) o.sources.push(source);
    s.seq.ticket += 1;
    lines.forEach((l) => { l.ticket = s.seq.ticket; l.source = source; o.lines.push(l); });
    return o;
  }

  const tableState = (s, tableId) => {
    const o = openOrder(s, tableId);
    const calls = s.calls.filter((c) => c.tableId === tableId && !c.done);
    if (!o && !calls.length) return "free";
    if (calls.some((c) => c.type === "bill")) return "bill";
    if (calls.some((c) => c.type === "waiter")) return "call";
    if (!o) return "free";
    const live = o.lines.filter((l) => !l.paid);
    if (live.some((l) => l.status === "ready")) return "ready";
    if (live.some((l) => l.status === "new" || l.status === "cooking")) return "cooking";
    return "served";
  };

  // ------------------------------------------------------------------ seed
  function seed() {
    const s = { v: 1, rev: 1, seq: { order: 40, ticket: 120, bill: 0 }, mode: "zatca", orders: [], calls: [], invoices: [], log: [], device: { icv: 0, pih: null }, autopilot: true, created: now() };
    const t0 = now();
    const mk = (itemId, qty, mods, status, ago) => {
      const l = line(itemId, qty, mods);
      l.firedAt = t0 - ago * MIN;
      if (status !== "new") l.startedAt = l.firedAt + 1.5 * MIN;
      if (status === "ready" || status === "served") l.readyAt = l.startedAt + 4 * MIN;
      if (status === "served") l.servedAt = l.readyAt + 1 * MIN;
      l.status = status;
      return l;
    };
    const opt = (modId, optId) => { const o = D.MODS[modId].options.find((x) => x.id === optId); return { mod: modId, id: optId, price: o.price }; };
    sendLines(s, "3", [mk("latte", 2, [opt("size", "m"), opt("milk", "oat")], "served", 26), mk("shakshuka", 1, [], "served", 25), mk("croissant", 2, [], "served", 25)], "waiter", "Faisal");
    sendLines(s, "5", [mk("kabsa", 2, [], "cooking", 9), mk("salad", 1, [], "new", 3), mk("mango", 3, [opt("size", "l")], "ready", 8), mk("water", 2, [], "served", 9)], "waiter", "Noura");
    sendLines(s, "8", [mk("karak", 2, [opt("sugar", "less")], "new", 1), mk("kunafa", 1, [], "new", 1)], "guest");
    sendLines(s, "1", [mk("v60", 1, [], "cooking", 4), mk("dates", 1, [], "ready", 5)], "guest");
    s.calls.push({ id: uid(), tableId: "3", type: "bill", at: t0 - 2 * MIN, done: false });
    return s;
  }

  function reset() { state = seed(); save(state); if (chan) chan.postMessage({ rev: -1 }); emit("local"); }

  state = load();
  if (!state || state.v !== 1) { state = seed(); save(state); }

  window.STORE = {
    get: () => state, update, reset, subscribe: (f) => { listeners.push(f); }, uid, line, sendLines, openOrder, tableState,
    MIN,
  };
})();
