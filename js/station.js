/* Station display: kitchen, coffee bar or juice bar. Each one only sees its own items. */
(function () {
  const D = window.RS_DATA;
  const { h, modsText, tableLabel } = window.UI;
  const { t, L } = window.I18N;
  const q = new URLSearchParams(location.search);
  const station = D.STATIONS[q.get("station")] ? q.get("station") : "kitchen";
  const LIMITS = { kitchen: [8, 15], coffee: [4, 8], bar: [4, 8] }; // minutes: amber, red

  document.body.classList.add("dark");
  const tabs = h("nav", { class: "st-tabs" });
  const stats = h("div", { class: "kds-stats" });
  document.body.append(UI.bar(D.STATIONS[station].icon, () => L(D.STATIONS[station].name), h("div", { style: "display:flex;gap:14px;align-items:center;flex-wrap:wrap" }, stats, tabs)));
  const board = h("main", { class: "board" });
  document.body.append(board);

  function tickets(s) {
    const map = new Map();
    s.orders.forEach((o) => o.lines.forEach((l) => {
      if (l.station !== station || l.status === "served") return;
      const k = o.id + ":" + l.ticket;
      if (!map.has(k)) map.set(k, { key: k, order: o, ticket: l.ticket, lines: [], firedAt: l.firedAt, source: l.source });
      map.get(k).lines.push(l);
    }));
    return [...map.values()].map((tk) => {
      const st = tk.lines.map((l) => l.status);
      tk.state = st.includes("new") ? "new" : st.every((x) => x === "ready") ? "ready" : "cooking";
      tk.readyAt = Math.max(...tk.lines.map((l) => l.readyAt || 0));
      return tk;
    }).sort((a, b) => a.firedAt - b.firedAt);
  }

  function move(tk, to) {
    const ids = new Set(tk.lines.map((l) => l.id));
    STORE.update((s) => s.orders.forEach((o) => o.lines.forEach((l) => {
      if (!ids.has(l.id)) return;
      l.status = to;
      if (to === "cooking") { l.startedAt = l.startedAt || Date.now(); l.readyAt = null; }
      if (to === "ready") l.readyAt = Date.now();
    })));
  }

  function card(tk) {
    const age = UI.ageMin(tk.firedAt);
    const [warn, late] = LIMITS[station];
    const cls = tk.state === "ready" ? "" : age >= late ? " late" : age >= warn ? " warn" : "";
    const btns = tk.state === "new" ? [h("button", { class: "go", type: "button", onclick: () => move(tk, "cooking") }, t("start")), h("button", { class: "done", type: "button", onclick: () => move(tk, "ready") }, t("bumpReady"))]
      : tk.state === "cooking" ? [h("button", { class: "done", type: "button", onclick: () => move(tk, "ready") }, t("bumpReady"))]
        : [h("button", { class: "sec", type: "button", onclick: () => move(tk, "cooking") }, t("recall"))];
    return h("article", { class: "ticket" + cls },
      h("header", {}, h("b", {}, tableLabel(tk.order.tableId)), h("span", { class: "src" }, "#" + tk.ticket + (tk.source === "guest" ? " · QR" : tk.order.waiter ? " · " + tk.order.waiter : "")), h("span", { class: "grow" }),
        h("span", { class: "age" }, tk.state === "ready" ? I18N.clock(tk.readyAt) : `${age} ${t("minAgo")}`)),
      h("ul", {}, tk.lines.map((l) => h("li", {}, h("span", { class: "q" }, l.qty), h("span", { class: "nm" }, L(D.item(l.itemId).name)),
        l.mods.length ? h("span", { class: "md" }, modsText(l.mods)) : null, l.note ? h("span", { class: "nt" }, "⚠ " + l.note) : null))),
      h("footer", {}, btns));
  }

  function render(s) {
    tabs.replaceChildren(...Object.keys(D.STATIONS).map((k) => h("a", { href: `station.html?station=${k}`, "aria-current": k === station ? "page" : null }, D.STATIONS[k].icon + " " + L(D.STATIONS[k].name))));
    const all = tickets(s);
    const done = [];
    s.orders.forEach((o) => o.lines.forEach((l) => { if (l.station === station && l.readyAt && Date.now() - l.readyAt < 3 * 3600e3) done.push(l.readyAt - l.firedAt); }));
    const avg = done.length ? Math.round(done.reduce((a, x) => a + x, 0) / done.length / 60000) : 0;
    stats.replaceChildren(h("span", {}, t("openTickets") + " ", h("b", {}, String(all.filter((x) => x.state !== "ready").length))), h("span", {}, t("avgTime") + " ", h("b", {}, avg + " " + t("minAgo"))));
    const col = (state, title) => {
      const list = all.filter((x) => x.state === state);
      return h("section", { class: "col" }, h("h3", {}, h("span", {}, t(title)), h("span", {}, String(list.length))),
        h("div", { class: "list" }, list.length ? list.map(card) : h("div", { class: "empty" }, t("noTickets"))));
    };
    board.replaceChildren(col("new", "colNew"), col("cooking", "colCooking"), col("ready", "colReady"));
  }
  UI.live(render);
  setInterval(() => render(STORE.get()), 30000);
})();
