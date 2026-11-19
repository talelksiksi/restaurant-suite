/* Cashier: open bills, splitting, payment, invoices in three modes, journal and day report. */
(function () {
  const D = window.RS_DATA;
  const { h, modsText, tableLabel, toast, modal, qrSvg } = window.UI;
  const { t, L, money } = window.I18N;
  const r2 = INVOICE.r2;

  let tab = new URLSearchParams(location.search).get("tab") || "open";
  let selected = null;
  let split = "whole";      // whole | items | equal
  let parts = 2;
  let pay = "card";
  let picked = new Set();
  let busy = false;

  const app = h("div", { class: "cash-app" });
  const nav = h("nav", { class: "cash-nav" });
  const main = h("main", { class: "cash-main" });
  app.append(nav, main);
  const modeChip = h("span", { class: "chip teal" });
  document.body.append(UI.bar("💳", "cashier", modeChip), app);

  const MODE_CHIP = { register: "amber", provider: "teal", zatca: "pine" };
  const STATUS_CHIP = { reported: "pine", pending: "amber", "handed-off": "" };
  const statusText = (i) => t(i.status === "handed-off" ? "handedOff" : i.status);
  const openOrders = (s) => s.orders.filter((o) => o.status === "open" && o.lines.length);
  const unpaid = (o) => o.lines.filter((l) => !l.paid);
  const remaining = (o) => r2(unpaid(o).reduce((a, l) => a + l.unit * l.qty, 0) - (o.paidShares || 0));

  // ---------------------------------------------------------------- left column
  function renderNav(s) {
    const tabsEl = h("div", { class: "cash-tabs", role: "tablist" }, [["open", "openTables"], ["journal", "journal"], ["report", "report"], ["settings", "settings"]].map(([id, key]) =>
      h("button", { type: "button", role: "tab", "aria-selected": String(tab === id), onclick: () => { tab = id; render(STORE.get()); } }, t(key))));
    const list = openOrders(s);
    const listEl = h("div", { class: "open-list" }, list.length ? list.map((o) => {
      const calls = s.calls.filter((c) => c.tableId === o.tableId && !c.done && c.type === "bill");
      const cooking = o.lines.some((l) => l.status === "new" || l.status === "cooking");
      return h("button", { class: "open-item", type: "button", "aria-current": String(tab === "open" && selected === o.tableId), onclick: () => { tab = "open"; selected = o.tableId; picked = new Set(); split = o.paidShares ? "equal" : "whole"; render(STORE.get()); } },
        h("b", {}, tableLabel(o.tableId)), h("bdi", { class: "amt" }, money(remaining(o))),
        h("small", {}, h("span", {}, "#" + o.no), calls.length ? h("span", { class: "chip dawn" }, t("billAsked")) : null, cooking ? h("span", { class: "chip teal" }, t("inKitchen")) : null, o.sources.includes("guest") ? h("span", { class: "chip" }, "QR") : null));
    }) : h("p", { class: "muted small", style: "padding:8px" }, t("noOpen")));
    nav.replaceChildren(tabsEl, listEl);
  }

  // ---------------------------------------------------------------- bill
  function payment(o) {
    const left = remaining(o);
    if (split === "items") {
      const lines = unpaid(o).filter((l) => picked.has(l.id));
      return { lines, share: 0, total: r2(lines.reduce((a, l) => a + l.unit * l.qty, 0)) };
    }
    if (split === "equal") {
      const done = o.sharesPaid || 0;
      const leftParts = Math.max(1, parts - done);
      const share = leftParts === 1 ? left : r2(left / leftParts);
      return { lines: [], share, total: share, part: done + 1 };
    }
    if (o.paidShares) return { lines: [], share: left, total: left };
    return { lines: unpaid(o), share: 0, total: left };
  }

  function renderBill(s) {
    const o = selected && STORE.openOrder(s, selected);
    if (!o) { selected = null; main.replaceChildren(h("p", { class: "muted" }, t("pickBill"))); return; }
    const p = payment(o);
    const a = p.share ? { total: p.total, net: r2(p.total / 1.15) } : INVOICE.amounts(p.lines);
    const vat = r2(a.total - a.net);
    const itemLines = h("div", { class: "lines bill-lines" }, o.lines.map((l) => {
      const it = D.item(l.itemId);
      const box = split === "items" && !l.paid ? h("input", { type: "checkbox", checked: picked.has(l.id), "aria-label": L(it.name), onchange: (e) => { e.target.checked ? picked.add(l.id) : picked.delete(l.id); render(STORE.get()); } }) : h("span", {});
      return h("div", { class: "ln" + (l.paid ? " paid" : "") }, box, h("span", { class: "q" }, l.qty + "×"),
        h("div", {}, h("div", { class: "nm" }, L(it.name)), l.mods.length ? h("div", { class: "md" }, modsText(l.mods)) : null),
        h("bdi", { class: "pr" }, money(l.unit * l.qty)));
    }));
    const partsEl = h("span", {}, String(parts));
    main.replaceChildren(h("div", { class: "bill" },
      h("section", { class: "card" },
        h("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:6px" }, h("h2", { style: "font-size:20px;flex:1" }, tableLabel(o.tableId)), h("span", { class: "chip" }, "#" + o.no)),
        split === "items" ? h("p", { class: "muted small", style: "margin:0 0 6px" }, t("selectHint")) : null,
        itemLines,
        o.paidShares ? h("div", { class: "totals" }, h("div", { class: "muted" }, h("span", {}, t("splitEqual")), h("bdi", { class: "num" }, "− " + money(o.paidShares)))) : null,
        h("div", { class: "totals" }, h("div", { class: "grand" }, h("span", {}, t("unpaid")), h("bdi", { class: "num" }, money(remaining(o)))))),
      h("section", { class: "card", style: "display:grid;gap:12px" },
        h("div", { class: "seg" }, [["whole", "payWhole"], ["items", "splitItems"], ["equal", "splitEqual"]].map(([id, key]) =>
          h("button", { type: "button", "aria-pressed": String(split === id), disabled: (id !== "equal" && o.paidShares > 0) || null, onclick: () => { split = id; picked = new Set(); render(STORE.get()); } }, t(key)))),
        split === "equal" ? h("div", { style: "display:flex;align-items:center;justify-content:space-between;gap:10px" },
          h("span", { class: "small muted" }, `${t("part")} ${p.part} / ${parts}`),
          h("div", { class: "stepper" }, h("button", { type: "button", onclick: () => { parts = Math.max((o.sharesPaid || 0) + 1, 2, parts - 1); render(STORE.get()); } }, "−"), partsEl, h("button", { type: "button", onclick: () => { parts = Math.min(12, parts + 1); render(STORE.get()); } }, "+"))) : null,
        h("div", { class: "seg two" }, [["card", "card"], ["cash", "cash"]].map(([id, key]) => h("button", { type: "button", "aria-pressed": String(pay === id), onclick: () => { pay = id; render(STORE.get()); } }, t(key)))),
        h("div", { class: "totals" },
          h("div", { class: "muted" }, h("span", {}, t("subtotal")), h("bdi", { class: "num" }, money(a.net))),
          h("div", { class: "muted" }, h("span", {}, t("vat")), h("bdi", { class: "num" }, money(vat))),
          h("div", { class: "grand" }, h("span", {}, t("paying")), h("bdi", { class: "num" }, money(a.total)))),
        h("button", { class: "btn primary big block", type: "button", disabled: busy || a.total <= 0 || null, onclick: () => take(o, p) }, t("payIssue")),
        h("p", { class: "small muted", style: "margin:0" }, t("modeNow") + ": ", h("b", {}, t("mode_" + s.mode))))));
  }

  async function take(o, p) {
    if (busy) return;
    busy = true; render(STORE.get());
    try {
      const mode = STORE.get().mode;
      const inv = await INVOICE.issue({ tableId: o.tableId, orderNo: o.no, lines: p.lines, share: p.share, payment: pay, mode });
      if (p.share) STORE.update((s) => { const x = s.orders.find((y) => y.id === o.id); if (x) x.sharesPaid = (x.sharesPaid || 0) + 1; });
      picked = new Set();
      const still = STORE.openOrder(STORE.get(), o.tableId);
      if (!still) { selected = null; split = "whole"; parts = 2; }
      showInvoice(inv.id);
    } finally { busy = false; render(STORE.get()); }
  }

  // ---------------------------------------------------------------- receipt
  function receipt(inv) {
    const V = D.VENUE;
    const rows = inv.rows.length ? inv.rows : [{ name: `Share of bill ${inv.billNo}`, nameAr: "حصة من الفاتورة", qty: 1, gross: inv.total }];
    return h("div", { class: "receipt" },
      h("div", { class: "c" }, h("h4", { class: "ar" }, V.legalNameAr), h("div", {}, L(V.name)), h("div", {}, "VAT " + V.vatNumber), h("div", { class: "ar" }, "الرقم الضريبي " + V.vatNumber)),
      h("hr"),
      h("div", { class: "c" }, h("b", {}, "Simplified Tax Invoice"), h("div", { class: "ar" }, "فاتورة ضريبية مبسطة")),
      h("div", { class: "row" }, h("span", {}, inv.no), h("span", {}, new Date(inv.issuedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" }))),
      h("div", { class: "row" }, h("span", {}, inv.tableId === "C" ? "Counter / الكاونتر" : `Table ${inv.tableId} / طاولة ${inv.tableId}`), h("span", {}, inv.payment === "card" ? "Card / بطاقة" : "Cash / نقداً")),
      h("hr"),
      rows.map((r) => h("div", {}, h("div", { class: "row" }, h("span", {}, `${r.qty} x ${r.name}`), h("span", {}, r.gross.toFixed(2))), h("div", { class: "row" }, h("span", { class: "ar" }, r.nameAr), h("span", {})))),
      h("hr"),
      h("div", { class: "row" }, h("span", {}, "Total excl. VAT  الإجمالي قبل الضريبة"), h("span", {}, inv.net.toFixed(2))),
      h("div", { class: "row" }, h("span", {}, "VAT 15%  الضريبة"), h("span", {}, inv.vat.toFixed(2))),
      h("div", { class: "row", style: "font-weight:700;font-size:14px" }, h("span", {}, "TOTAL SAR  الإجمالي"), h("span", {}, inv.total.toFixed(2))),
      inv.qr ? h("div", { class: "qr" }, qrSvg(inv.qr)) : null,
      inv.icv ? h("div", { class: "c", style: "font-size:10px;color:#666;word-break:break-all" }, `ICV ${inv.icv} · ${inv.hash.slice(0, 16)}…`) : null,
      h("div", { class: "stamp" }, t("demoStamp")));
  }

  function showInvoice(id) {
    const inv = STORE.get().invoices.find((i) => i.id === id);
    if (!inv) return;
    if (inv.mode === "register") {
      modal(t("handoffTitle"), h("div", { class: "handoff" }, h("bdi", { class: "amt" }, money(inv.total)),
        h("div", {}, h("span", { class: "chip" }, inv.no), " ", h("span", { class: "chip" }, t(inv.payment)), " ", h("span", { class: "chip" }, tableLabel(inv.tableId))),
        h("p", { class: "muted small", style: "margin:0" }, t("handoffText"))));
      return;
    }
    const status = h("span", { class: "chip " + STATUS_CHIP[inv.status] }, statusText(inv));
    const info = h("p", { class: "small muted", style: "margin:0;text-align:center" }, inv.mode === "provider" ? t("providerSent") : t("mode_zatca"), inv.providerRef ? " · " + inv.providerRef : "");
    const m = modal(`${t("receipt")} ${inv.no}`, [h("div", { style: "display:flex;justify-content:center;gap:8px" }, h("span", { class: "chip " + MODE_CHIP[inv.mode] }, t("mode_" + inv.mode)), status), info, receipt(inv)],
      [[t("viewXml"), () => { modal("UBL 2.1 XML", h("pre", { class: "xml" }, inv.xml)); return false; }], [t("print"), () => { window.print(); return false; }], [t("close"), null, "primary"]]);
    // Follow the reporting status while the receipt is open.
    const iv = setInterval(() => {
      if (!document.body.contains(m.el)) return clearInterval(iv);
      const now = STORE.get().invoices.find((i) => i.id === id);
      if (now && now.status !== "pending") { status.className = "chip " + STATUS_CHIP[now.status]; status.textContent = statusText(now); if (now.providerRef) info.textContent = t("providerSent") + " · " + now.providerRef; clearInterval(iv); }
    }, 300);
  }

  // ---------------------------------------------------------------- journal
  function renderJournal(s) {
    const list = [...s.invoices].sort((a, b) => b.issuedAt - a.issuedAt);
    const result = h("p", { class: "small", style: "margin:0" });
    main.replaceChildren(
      h("div", { style: "display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap" }, h("h2", { style: "font-size:20px;flex:1" }, t("journal")),
        h("button", { class: "btn", type: "button", onclick: async () => { const r = await INVOICE.verifyChain(); result.replaceChildren(h("span", { class: "chip " + (r.ok ? "pine" : "red") }, r.ok ? "✓ " + t("chainOk") : `✗ ${t("chainBad")} ${r.at}`)); } }, t("verifyChain"))),
      result,
      list.length ? h("div", { class: "card", style: "overflow:auto;margin-top:10px" }, h("table", { class: "tbl-j" },
        h("thead", {}, h("tr", {}, [t("invoiceNo"), t("time"), t("table"), t("amount"), t("mode"), t("statusCol"), t("icv"), t("hash")].map((x) => h("th", {}, x)))),
        h("tbody", {}, list.map((i) => h("tr", { onclick: () => showInvoice(i.id) },
          h("td", { class: "mono" }, h("bdi", {}, i.no)), h("td", { class: "mono" }, I18N.clock(i.issuedAt)), h("td", {}, i.tableId === "C" ? "☕" : i.tableId),
          h("td", { class: "mono" }, h("bdi", {}, money(i.total))), h("td", {}, h("span", { class: "chip " + MODE_CHIP[i.mode] }, t("mode_" + i.mode))),
          h("td", {}, h("span", { class: "chip " + (STATUS_CHIP[i.status] || "") }, statusText(i))), h("td", { class: "mono" }, i.icv || "–"),
          h("td", { class: "hashcell" }, i.hash ? i.hash.slice(0, 12) + "…" : "–")))))) : h("p", { class: "muted" }, t("noInvoices")));
  }

  // ---------------------------------------------------------------- report
  function renderReport(s) {
    const inv = s.invoices;
    const sales = r2(inv.reduce((a, i) => a + i.total, 0));
    const vat = r2(inv.reduce((a, i) => a + i.vat, 0));
    const byPay = { card: 0, cash: 0 }; inv.forEach((i) => { byPay[i.payment] = r2(byPay[i.payment] + i.total); });
    const byStation = {}; const byItem = {};
    s.orders.forEach((o) => o.lines.forEach((l) => { byStation[l.station] = (byStation[l.station] || 0) + l.qty; byItem[l.itemId] = (byItem[l.itemId] || 0) + l.qty; }));
    const bars = (obj, label, fmt) => { const max = Math.max(1, ...Object.values(obj)); return h("div", { class: "bars" }, Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, v]) => h("div", {}, h("span", {}, label(k)), h("i", { style: `width:${Math.max(4, (v / max) * 100)}%` }), h("bdi", { class: "v" }, fmt(v))))); };
    const top = Object.fromEntries(Object.entries(byItem).sort((a, b) => b[1] - a[1]).slice(0, 6));
    main.replaceChildren(h("h2", { style: "font-size:20px;margin-bottom:12px" }, t("report")),
      h("div", { class: "kpis" }, [[t("sales"), money(sales)], [t("vatCollected"), money(vat)], [t("bills"), String(inv.length)], [t("avgBill"), money(inv.length ? sales / inv.length : 0)]].map(([k, v]) => h("div", { class: "card kpi" }, h("span", {}, k), h("bdi", {}, h("b", {}, v))))),
      h("div", { class: "two-col" },
        h("section", { class: "card", style: "padding:14px 16px;display:grid;gap:10px" }, h("h3", { style: "font-size:15px" }, t("byPayment")), bars(byPay, (k) => t(k), money),
          h("h3", { style: "font-size:15px;margin-top:6px" }, t("byStation")), bars(byStation, (k) => L(D.STATIONS[k].name), String)),
        h("section", { class: "card", style: "padding:14px 16px;display:grid;gap:10px" }, h("h3", { style: "font-size:15px" }, t("topItems")), bars(top, (k) => L(D.item(k).name), String))));
  }

  // ---------------------------------------------------------------- settings
  function renderSettings(s) {
    const V = D.VENUE;
    main.replaceChildren(h("div", { style: "max-width:720px;display:grid;gap:14px" },
      h("h2", { style: "font-size:20px" }, t("settings")),
      h("section", { class: "card", style: "padding:14px 16px;display:grid;gap:10px" }, h("h3", { style: "font-size:15px" }, t("modeNow")),
        h("div", { class: "mode-pick" }, ["register", "provider", "zatca"].map((m) => h("label", {},
          h("input", { type: "radio", name: "mode", checked: s.mode === m, onchange: () => { STORE.update((st) => { st.mode = m; }); toast(t("mode_" + m)); } }),
          h("b", {}, t("mode_" + m)), h("span", {}, t("mode_" + m + "Text"))))),
        h("p", { class: "small muted", style: "margin:0" }, t("modeNoteDemo"))),
      h("section", { class: "card", style: "padding:14px 16px;display:grid;gap:6px;font-size:14px" }, h("h3", { style: "font-size:15px" }, t("venue")),
        h("div", {}, h("b", {}, L(V.name)), " · ", h("span", { class: "muted" }, L(V.address))),
        h("div", {}, t("vatNo") + ": ", h("bdi", { class: "mono" }, V.vatNumber)), h("div", {}, t("crNo") + ": ", h("bdi", { class: "mono" }, V.crNumber)),
        h("div", {}, t("icv") + ": ", h("bdi", { class: "mono" }, String(s.device.icv))), h("div", { class: "hashcell" }, t("prevHash") + ": " + (s.device.pih || "–"))),
      h("div", {}, h("button", { class: "btn", type: "button", onclick: () => modal(t("reset"), h("p", {}, t("resetQ")), [[t("cancel"), null], [t("reset"), () => { STORE.reset(); selected = null; }, "primary"]]) }, t("reset")))));
  }

  function render(s) {
    modeChip.textContent = t("mode_" + s.mode);
    modeChip.className = "chip " + MODE_CHIP[s.mode];
    renderNav(s);
    if (tab === "journal") renderJournal(s);
    else if (tab === "report") renderReport(s);
    else if (tab === "settings") renderSettings(s);
    else renderBill(s);
  }

  UI.live(render);
  setInterval(INVOICE.processQueue, 700);
})();
