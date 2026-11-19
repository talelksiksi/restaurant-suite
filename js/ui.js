/* Small helpers shared by every screen. */
(function () {
  const D = window.RS_DATA;
  const { t, L } = window.I18N;

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(Infinity).forEach((c) => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
    return el;
  }

  /** The top bar every screen shares: icon, title, venue, clock and the language switch. */
  function bar(icon, title, extra) {
    const clock = h("span", { class: "clock num" });
    const tick = () => { clock.textContent = I18N.clock(Date.now()); };
    tick(); setInterval(tick, 15000);
    const titleEl = h("span", {});
    const venueEl = h("small", {});
    const paint = () => { titleEl.textContent = typeof title === "function" ? title() : t(title); venueEl.textContent = L(D.VENUE.name); };
    paint(); I18N.onChange(paint);
    return h("header", { class: "bar" },
      h("div", { class: "brand" }, h("span", { class: "logo", "aria-hidden": "true" }, icon), h("div", {}, titleEl, venueEl)),
      h("div", { class: "grow" }), extra || null, clock, I18N.switcher());
  }

  function modsText(mods) {
    return (mods || []).map((m) => { const mod = D.MODS[m.mod]; const o = mod && mod.options.find((x) => x.id === m.id); return o ? L(o.name) : ""; }).filter(Boolean).join(" · ");
  }
  const tableLabel = (id) => (id === "C" ? t("counter") : t("table") + " " + id);

  function toast(msg) {
    const el = h("div", { class: "toast", role: "status" }, msg);
    document.body.append(el);
    setTimeout(() => el.remove(), 2600);
  }

  function modal(title, body, buttons) {
    const close = () => wrap.remove();
    const foot = h("footer", {}, (buttons || [[t("close"), null]]).map(([label, fn, cls]) => h("button", { class: "btn " + (cls || ""), type: "button", onclick: async () => { if (!fn || (await fn()) !== false) close(); } }, label)));
    const wrap = h("div", { class: "modal", onclick: (e) => { if (e.target === wrap) close(); } },
      h("div", { class: "box", role: "dialog", "aria-modal": "true" }, h("header", {}, h("h3", {}, title)), h("div", { class: "body" }, body), foot));
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape") { close(); document.removeEventListener("keydown", esc); } });
    document.body.append(wrap);
    return { close, el: wrap };
  }

  /** QR code as an inline SVG (byte mode, error level M). */
  function qrSvg(text) {
    const qr = qrcode(0, "M");
    qr.addData(unescape(encodeURIComponent(text)), "Byte");
    qr.make();
    const n = qr.getModuleCount(), q = 2;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q},${r + q}h1v1h-1z`;
    const span = document.createElement("span");
    span.innerHTML = `<svg viewBox="0 0 ${n + 2 * q} ${n + 2 * q}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" role="img" aria-label="QR"><rect width="100%" height="100%" fill="#fff"/><path d="${d}" fill="#000"/></svg>`;
    return span.firstChild;
  }

  const ageMin = (ts) => Math.max(0, Math.floor((Date.now() - ts) / 60000));

  /** Re-render on any change from this or another screen, and on language change. */
  function live(render) {
    let queued = false;
    const go = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; render(STORE.get()); }); };
    STORE.subscribe(go); I18N.onChange(go); setInterval(go, 20000); go();
    return go;
  }

  window.UI = { h, bar, modsText, tableLabel, toast, modal, qrSvg, ageMin, live };
})();
