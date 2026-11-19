/* Guest menu, opened by scanning the QR code on the table. Orders go straight to the stations. */
(function () {
  const D = window.RS_DATA;
  const { h, toast, modsText } = window.UI;
  const { t, L, money } = window.I18N;
  const params = new URLSearchParams(location.search);
  let table = D.TABLES.some((x) => x.id === params.get("table")) ? params.get("table") : null;
  let cart = [];
  let sheet = null;
  document.body.classList.add("guest");

  const hero = h("header", { class: "g-hero" });
  const tabs = h("div", { class: "g-tabs" });
  const list = h("main", { class: "g-list" });
  const status = h("section", { class: "g-status" });
  const cta = h("div", { class: "g-cta" });
  document.body.append(hero, status, tabs, list, cta);

  const unit = (c) => D.item(c.itemId).price + c.mods.reduce((a, m) => a + m.price, 0);
  const cartCount = () => cart.reduce((a, c) => a + c.qty, 0);
  const cartTotal = () => cart.reduce((a, c) => a + unit(c) * c.qty, 0);

  function add(item, mods) {
    const key = item.id + "|" + mods.map((m) => m.id).join(",");
    const same = cart.find((c) => c.key === key);
    if (same) same.qty += 1; else cart.push({ key, itemId: item.id, qty: 1, mods });
    render(STORE.get());
  }
  function pick(item) {
    if (!item.mods.length) return add(item, []);
    const chosen = {};
    item.mods.forEach((m) => { chosen[m] = D.MODS[m].one ? [D.MODS[m].options[0].id] : []; });
    const body = item.mods.map((m) => {
      const mod = D.MODS[m];
      const wrap = h("div", { class: "opts" });
      const paint = () => wrap.replaceChildren(...mod.options.map((o) => h("button", { class: "opt", type: "button", "aria-pressed": String(chosen[m].includes(o.id)),
        onclick: () => { chosen[m] = mod.one ? [o.id] : chosen[m].includes(o.id) ? chosen[m].filter((x) => x !== o.id) : [...chosen[m], o.id]; paint(); } }, L(o.name), o.price ? h("small", {}, "+" + o.price) : null)));
      paint();
      return h("div", { class: "field" }, h("span", {}, L(mod.name)), wrap);
    });
    UI.modal(`${item.emoji} ${L(item.name)}`, body, [[t("cancel"), null], [t("add"), () => {
      const mods = [];
      Object.entries(chosen).forEach(([m, ids]) => ids.forEach((id) => { const o = D.MODS[m].options.find((x) => x.id === id); mods.push({ mod: m, id, price: o.price }); }));
      add(item, mods);
    }, "primary"]]);
  }

  function openSheet() {
    closeSheet();
    const scrim = h("div", { class: "scrim", onclick: closeSheet });
    const el = h("div", { class: "sheet", role: "dialog", "aria-modal": "true" },
      h("header", {}, h("h3", {}, t("yourOrder")), h("button", { class: "btn ghost", type: "button", onclick: closeSheet }, "✕")),
      h("div", { class: "body" }, h("div", { class: "lines" }, cart.map((c, i) => h("div", { class: "ln" },
        h("span", { class: "q" }, c.qty + "×"),
        h("div", {}, h("div", { class: "nm" }, L(D.item(c.itemId).name)), c.mods.length ? h("div", { class: "md" }, modsText(c.mods)) : null),
        h("div", { style: "display:flex;gap:6px;align-items:center" }, h("bdi", { class: "pr" }, money(unit(c) * c.qty)),
          h("button", { class: "x", type: "button", "aria-label": t("cancel"), onclick: () => { c.qty -= 1; if (!c.qty) cart.splice(i, 1); cart.length ? openSheet() : closeSheet(); render(STORE.get()); } }, "−")))))),
      h("footer", {}, h("div", { class: "totals" }, h("div", { class: "grand" }, h("span", {}, t("total")), h("bdi", { class: "num" }, money(cartTotal())))),
        h("button", { class: "btn primary big block", type: "button", onclick: place }, t("placeOrder"))));
    document.body.append(scrim, el);
    sheet = [scrim, el];
  }
  function closeSheet() { if (sheet) sheet.forEach((x) => x.remove()); sheet = null; }

  function place() {
    STORE.update((s) => STORE.sendLines(s, table, cart.map((c) => STORE.line(c.itemId, c.qty, c.mods, "")), "guest"));
    cart = []; closeSheet(); toast(t("orderPlaced")); render(STORE.get()); scrollTo({ top: 0, behavior: "smooth" });
  }
  function call(type) {
    STORE.update((s) => { if (!s.calls.some((c) => c.tableId === table && c.type === type && !c.done)) s.calls.push({ id: STORE.uid(), tableId: table, type, at: Date.now(), done: false }); });
    toast(t(type === "bill" ? "billCalled" : "called"));
  }

  function renderHero() {
    hero.replaceChildren(
      h("div", { class: "row" }, h("span", { class: "logo", style: "width:34px;height:34px;border-radius:10px;display:grid;place-items:center;background:rgba(255,255,255,.16);font-size:18px" }, "☕"), h("div", { class: "grow" }), I18N.switcher()),
      h("h1", {}, L(D.VENUE.name)), h("p", {}, L(D.VENUE.address)),
      table ? h("span", { class: "tbl-chip" }, `${t("yourTable")} · ${UI.tableLabel(table)}`) : null);
  }

  function renderStatus(s) {
    if (!table) { status.replaceChildren(); return; }
    const o = STORE.openOrder(s, table);
    const lines = o ? o.lines.filter((l) => !l.paid) : [];
    if (!lines.length) { status.replaceChildren(); return; }
    const step = { new: 1, cooking: 2, ready: 3, served: 4 };
    status.replaceChildren(h("div", { class: "card" }, h("b", {}, t("tracking")),
      ...lines.map((l) => h("div", { style: "margin-top:8px" },
        h("div", { style: "display:flex;justify-content:space-between;gap:8px;font-size:14px" }, h("span", {}, `${l.qty}× ${L(D.item(l.itemId).name)}`), h("span", { class: "chip " + ({ ready: "pine", served: "", cooking: "teal", new: "amber" }[l.status]) }, t("status_" + l.status))),
        h("div", { class: "steps-mini" }, [1, 2, 3, 4].map((n) => h("i", { class: n <= step[l.status] ? "on" : "" })))))));
  }

  function render(s) {
    renderHero();
    if (!table) {
      tabs.replaceChildren(); cta.replaceChildren();
      list.replaceChildren(h("h2", {}, t("chooseTable")), h("div", { class: "tables" }, D.TABLES.filter((x) => x.id !== "C").map((x) => h("button", { class: "tbl free", type: "button", onclick: () => { table = x.id; history.replaceState(null, "", "?table=" + x.id); render(STORE.get()); } }, h("span", { class: "n" }, x.id), h("span", { class: "s" }, `${x.seats} ${t("seats")}`)))));
      return;
    }
    renderStatus(s);
    tabs.replaceChildren(h("div", { class: "menu-tabs", style: "padding:0" }, D.CATEGORIES.map((c) => h("button", { type: "button", onclick: () => document.getElementById("c-" + c.id).scrollIntoView({ behavior: "smooth", block: "start" }) }, L(c.name)))));
    list.replaceChildren(...D.CATEGORIES.map((c) => [h("h2", { id: "c-" + c.id, style: "scroll-margin-top:60px" }, L(c.name)),
      ...D.ITEMS.filter((i) => i.cat === c.id).map((i) => {
        const n = cart.filter((x) => x.itemId === i.id).reduce((a, x) => a + x.qty, 0);
        return h("div", { class: "g-item" }, h("span", { class: "e", "aria-hidden": "true" }, i.emoji),
          h("div", {}, h("div", { class: "nm" }, L(i.name)), h("bdi", { class: "pr" }, money(i.price)), n ? h("div", { class: "count" }, `× ${n}`) : null),
          h("button", { class: "plus", type: "button", "aria-label": `${t("add")} ${L(i.name)}`, onclick: () => pick(i) }, "+"));
      })]).flat(), h("p", { class: "small muted", style: "text-align:center" }, t("allergens")));
    cta.replaceChildren(...[
      cart.length ? h("button", { class: "btn primary big block", type: "button", onclick: openSheet }, `${t("viewOrder")} · ${cartCount()} ${t("items")} · `, h("bdi", {}, money(cartTotal()))) : null,
      h("div", { class: "g-actions" }, h("button", { class: "btn", type: "button", onclick: () => call("waiter") }, "🙋 " + t("callWaiter")), h("button", { class: "btn", type: "button", onclick: () => call("bill") }, "🧾 " + t("askBill")))].filter(Boolean));
  }
  UI.live(render);
})();
