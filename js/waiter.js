/* Waiter tablet: the floor, alerts, and taking an order at a table. */
(function () {
  const D = window.RS_DATA;
  const { h, modsText, tableLabel, toast, modal, ageMin } = window.UI;
  const { t, L, money } = window.I18N;
  const WAITER = "Noura";

  let selected = null;           // table id
  let cat = D.CATEGORIES[0].id;
  const drafts = {};             // table id -> [{itemId, qty, mods, note}]

  const app = h("div", { class: "waiter-app" });
  const floorView = h("div", { class: "floor floor-view" });
  const orderPane = h("div", { class: "floor order-pane" });
  const side = h("aside", { class: "side" });
  app.append(h("div", { style: "min-height:0;overflow:auto" }, floorView, orderPane), side);
  document.body.append(UI.bar("🧾", "waiter", null), app);

  const STATUS_KEY = { free: "free", cooking: "inKitchen", ready: "readyToServe", served: "served", bill: "billAsked", call: "callAsked" };
  const chipFor = (st) => ({ new: "amber", cooking: "teal", ready: "pine", served: "" })[st] || "";

  function select(id) { selected = id; render(STORE.get()); }

  function renderFloor(s) {
    floorView.replaceChildren(...Object.keys(D.ZONES).map((z) => {
      const tables = D.TABLES.filter((x) => x.zone === z);
      return h("section", { class: "zone" }, h("h3", {}, L(D.ZONES[z])), h("div", { class: "tables" }, tables.map((tb) => {
        const st = STORE.tableState(s, tb.id);
        const o = STORE.openOrder(s, tb.id);
        const total = o ? o.lines.filter((l) => !l.paid).reduce((a, l) => a + l.unit * l.qty, 0) : 0;
        return h("button", { class: `tbl ${st}${selected === tb.id ? " sel" : ""}`, type: "button", onclick: () => select(tb.id) },
          o && o.sources.includes("guest") ? h("span", { class: "badge chip dawn" }, "QR") : null,
          h("span", { class: "n" }, tb.id === "C" ? "☕" : tb.id),
          h("span", { class: "s" + (st === "ready" || st === "bill" || st === "call" ? " pulse" : "") }, t(STATUS_KEY[st])),
          h("span", { class: "m" }, o ? h("bdi", { class: "num" }, money(total)) : tb.seats ? `${tb.seats} ${t("seats")}` : t("counter")));
      })));
    }));
  }

  function alertsList(s) {
    const items = [];
    s.calls.filter((c) => !c.done).forEach((c) => items.push({ kind: c.type, table: c.tableId, at: c.at, label: t(c.type === "bill" ? "billAsked" : "callAsked"), act: () => STORE.update((st) => { const x = st.calls.find((y) => y.id === c.id); if (x) x.done = true; }) }));
    s.orders.filter((o) => o.status === "open").forEach((o) => {
      const ready = o.lines.filter((l) => l.status === "ready" && !l.paid);
      if (ready.length) items.push({ kind: "ready", table: o.tableId, at: Math.min(...ready.map((l) => l.readyAt)), label: ready.map((l) => `${l.qty}× ${L(D.item(l.itemId).name)}`).join(", "), act: () => serve(o.tableId) });
    });
    return items.sort((a, b) => a.at - b.at);
  }

  function serve(tableId, lineId) {
    STORE.update((st) => {
      const o = STORE.openOrder(st, tableId);
      if (!o) return;
      o.lines.forEach((l) => { if (l.status === "ready" && (!lineId || l.id === lineId)) { l.status = "served"; l.servedAt = Date.now(); } });
    });
  }

  function renderAlerts(s) {
    const list = alertsList(s);
    side.replaceChildren(
      h("div", { class: "side-head" }, h("h2", {}, t("alerts")), list.length ? h("span", { class: "chip dawn" }, String(list.length)) : null),
      h("div", { class: "side-body" },
        list.length ? h("div", { class: "alerts" }, list.map((a) => h("div", { class: "alert " + a.kind },
          h("button", { class: "btn", type: "button", onclick: () => select(a.table), style: "min-width:54px" }, a.table === "C" ? "☕" : a.table),
          h("div", { class: "grow" }, h("b", {}, a.kind === "ready" ? t("readyToServe") : a.label), h("span", {}, a.kind === "ready" ? a.label : `${tableLabel(a.table)} · ${ageMin(a.at)} ${t("minAgo")}`)),
          h("button", { class: "btn " + (a.kind === "ready" ? "primary" : ""), type: "button", onclick: a.act }, a.kind === "ready" ? t("serve") : t("acknowledge")))))
          : h("p", { class: "muted small" }, t("noAlerts")),
        h("p", { class: "muted small", style: "margin-top:16px" }, t("pickTable"))));
  }

  // ---------------------------------------------------------------- ordering
  function addToDraft(item, qty, mods, note) {
    const d = (drafts[selected] = drafts[selected] || []);
    const key = item.id + "|" + mods.map((m) => m.id).join(",") + "|" + note;
    const same = d.find((x) => x.key === key);
    if (same) same.qty += qty; else d.push({ key, itemId: item.id, qty, mods, note });
    render(STORE.get());
  }

  function pickItem(item) {
    if (!item.mods.length) return addToDraft(item, 1, [], "");
    const chosen = {};
    item.mods.forEach((m) => { const mod = D.MODS[m]; if (mod.one) chosen[m] = [mod.options[0].id]; else chosen[m] = []; });
    let qty = 1;
    const qtyEl = h("span", {}, "1");
    const noteEl = h("input", { type: "text", placeholder: t("notePh"), maxlength: "80" });
    const groups = item.mods.map((m) => {
      const mod = D.MODS[m];
      const wrap = h("div", { class: "opts" });
      const paint = () => wrap.replaceChildren(...mod.options.map((o) => h("button", {
        class: "opt", type: "button", "aria-pressed": String(chosen[m].includes(o.id)),
        onclick: () => { if (mod.one) chosen[m] = [o.id]; else chosen[m] = chosen[m].includes(o.id) ? chosen[m].filter((x) => x !== o.id) : [...chosen[m], o.id]; paint(); },
      }, L(o.name), o.price ? h("small", {}, "+" + o.price) : null)));
      paint();
      return h("div", { class: "field" }, h("span", {}, L(mod.name)), wrap);
    });
    modal(`${item.emoji} ${L(item.name)}`, [
      ...groups,
      h("div", { class: "field" }, h("span", {}, t("qty")), h("div", { class: "stepper" },
        h("button", { type: "button", onclick: () => { qty = Math.max(1, qty - 1); qtyEl.textContent = qty; } }, "−"), qtyEl,
        h("button", { type: "button", onclick: () => { qty += 1; qtyEl.textContent = qty; } }, "+"))),
      h("label", { class: "field" }, h("span", {}, t("note")), noteEl),
    ], [[t("cancel"), null], [t("add"), () => {
      const mods = [];
      Object.entries(chosen).forEach(([m, ids]) => ids.forEach((id) => { const o = D.MODS[m].options.find((x) => x.id === id); mods.push({ mod: m, id, price: o.price }); }));
      addToDraft(item, qty, mods, noteEl.value.trim());
    }, "primary"]]);
  }

  function renderMenu() {
    const tabs = h("div", { class: "menu-tabs" }, D.CATEGORIES.map((c) => h("button", { type: "button", "aria-pressed": String(c.id === cat), onclick: () => { cat = c.id; render(STORE.get()); } }, L(c.name))));
    const grid = h("div", { class: "menu-grid" }, D.ITEMS.filter((i) => i.cat === cat).map((i) => h("button", { class: "mi", type: "button", onclick: () => pickItem(i) },
      h("span", { class: "e", "aria-hidden": "true" }, i.emoji), h("span", { class: "nm" }, L(i.name)), h("bdi", { class: "pr" }, money(i.price)))));
    orderPane.replaceChildren(
      h("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:12px" },
        h("button", { class: "btn", type: "button", onclick: () => select(null) }, h("span", { class: "flip", "aria-hidden": "true" }, "←"), " ", t("back")),
        h("h2", { style: "font-size:20px" }, tableLabel(selected))),
      tabs, grid);
  }

  function renderTable(s) {
    const o = STORE.openOrder(s, selected);
    const draft = drafts[selected] || [];
    const lines = o ? o.lines.filter((l) => !l.paid) : [];
    const calls = s.calls.filter((c) => c.tableId === selected && !c.done);
    const draftTotal = draft.reduce((a, d) => a + (D.item(d.itemId).price + d.mods.reduce((x, m) => x + m.price, 0)) * d.qty, 0);
    const curTotal = lines.reduce((a, l) => a + l.unit * l.qty, 0);
    const hasReady = lines.some((l) => l.status === "ready");
    side.replaceChildren(
      h("div", { class: "side-head" }, h("h2", {}, tableLabel(selected)), o && o.sources.includes("guest") ? h("span", { class: "chip dawn" }, t("fromQr")) : null),
      h("div", { class: "side-body" },
        calls.map((c) => h("div", { class: "alert " + c.type, style: "margin-bottom:8px" }, h("div", { class: "grow" }, h("b", {}, t(c.type === "bill" ? "billAsked" : "callAsked")), h("span", {}, `${ageMin(c.at)} ${t("minAgo")}`)),
          h("button", { class: "btn", type: "button", onclick: () => STORE.update((st) => { const x = st.calls.find((y) => y.id === c.id); if (x) x.done = true; }) }, t("acknowledge")))),
        lines.length ? [h("div", { class: "sub" }, h("span", {}, t("current")), hasReady ? h("button", { class: "btn", type: "button", style: "min-height:30px;padding:4px 10px;font-size:12px", onclick: () => serve(selected) }, t("serveAll")) : null),
          h("div", { class: "lines" }, lines.map((l) => h("div", { class: "ln" },
            h("span", { class: "q" }, l.qty + "×"),
            h("div", {}, h("div", { class: "nm" }, L(D.item(l.itemId).name)), l.mods.length ? h("div", { class: "md" }, modsText(l.mods)) : null, l.note ? h("div", { class: "md" }, "“" + l.note + "”") : null),
            l.status === "ready" ? h("button", { class: "btn primary", type: "button", style: "min-height:30px;padding:4px 10px;font-size:12px", onclick: () => serve(selected, l.id) }, t("serve"))
              : h("span", { class: "chip " + chipFor(l.status) }, t("status_" + l.status)))))] : null,
        h("div", { class: "sub" }, h("span", {}, t("newItems"))),
        draft.length ? h("div", { class: "lines" }, draft.map((d, i) => {
          const it = D.item(d.itemId);
          return h("div", { class: "ln" }, h("span", { class: "q" }, d.qty + "×"),
            h("div", {}, h("div", { class: "nm" }, L(it.name)), d.mods.length ? h("div", { class: "md" }, modsText(d.mods)) : null, d.note ? h("div", { class: "md" }, "“" + d.note + "”") : null),
            h("button", { class: "x", type: "button", "aria-label": t("cancel"), onclick: () => { draft.splice(i, 1); render(STORE.get()); } }, "×"));
        })) : h("p", { class: "muted small" }, t("emptyDraft"))),
      h("div", { class: "side-foot" },
        h("div", { class: "totals" }, h("div", {}, h("span", {}, t("total")), h("bdi", { class: "num" }, money(curTotal + draftTotal)))),
        h("button", { class: "btn primary big block", type: "button", disabled: !draft.length, onclick: send }, t("send"), draft.length ? h("bdi", { class: "num" }, " · " + money(draftTotal)) : null)));
  }

  function send() {
    const draft = drafts[selected] || [];
    if (!draft.length) return;
    STORE.update((s) => STORE.sendLines(s, selected, draft.map((d) => STORE.line(d.itemId, d.qty, d.mods, d.note)), "waiter", WAITER));
    const n = draft.reduce((a, d) => a + d.qty, 0);
    drafts[selected] = [];
    toast(`${t("sent")} · ${tableLabel(selected)} · ${n} ${t("items")}`);
    render(STORE.get());
  }

  function render(s) {
    app.classList.toggle("ordering", !!selected);
    if (selected) { renderMenu(); renderTable(s); } else { renderFloor(s); renderAlerts(s); }
    if (selected) renderFloor(s);
  }

  const q = new URLSearchParams(location.search).get("table");
  if (q && D.TABLES.some((x) => x.id === q)) selected = q;
  UI.live(render);
})();
