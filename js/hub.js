/* The demo's front page: every screen side by side, the billing mode, and the simulated service. */
(function () {
  const { h, qrSvg, modal } = window.UI;
  const { t } = window.I18N;
  const T = (key, tag = "span", attrs = {}) => h(tag, Object.assign({ "data-t": key }, attrs), t(key));

  const back = h("a", { class: "btn ghost", href: "../", style: "min-height:34px;padding:6px 10px" }, h("span", { class: "flip", "aria-hidden": "true" }, "←"), " ", T("backPortfolio"));
  document.body.append(UI.bar("🍽️", "suite", back));

  // ---------------------------------------------------------------- intro + controls
  const modeBox = h("div", { class: "mode-pick" });
  const pilot = h("input", { type: "checkbox", id: "pilot", onchange: (e) => STORE.update((s) => { s.autopilot = e.target.checked; }) });
  const menuUrl = new URL("menu.html?table=4", location.href).href;
  document.body.append(h("section", { class: "hub-head" },
    h("div", {}, T("demoTag", "div", { class: "eyebrow" }), T("hubTitle", "h1"), T("hubLede", "p"), T("hubHow", "p"),
      h("div", { style: "display:flex;gap:8px;flex-wrap:wrap;margin-top:14px" },
        h("a", { class: "btn primary", href: "waiter.html", target: "_blank", rel: "noopener" }, "🧾 ", T("waiter")),
        h("a", { class: "btn", href: "station.html?station=kitchen", target: "_blank", rel: "noopener" }, "🍳 ", T("station")),
        h("a", { class: "btn", href: "cashier.html", target: "_blank", rel: "noopener" }, "💳 ", T("cashier")),
        h("a", { class: "btn", href: "menu.html?table=4", target: "_blank", rel: "noopener" }, "📱 ", T("guest")))),
    h("aside", { class: "card hub-panel" },
      h("div", { class: "switch" }, h("label", { for: "pilot" }, h("b", { "data-t": "autopilot" }, t("autopilot")), h("br"), h("span", { class: "small muted", "data-t": "autopilotTip" }, t("autopilotTip"))), pilot),
      h("div", {}, h("b", { class: "small", "data-t": "modeNow" }, t("modeNow")), modeBox),
      h("div", { class: "qr-try" }, qrSvg(menuUrl), h("div", {}, h("b", { class: "small", "data-t": "scanTry" }, t("scanTry")), h("p", { class: "small muted", style: "margin:4px 0 0", "data-t": "scanNote" }, t("scanNote")))),
      h("button", { class: "btn", type: "button", onclick: () => modal(t("reset"), h("p", {}, t("resetQ")), [[t("cancel"), null], [t("reset"), () => STORE.reset(), "primary"]]) }, T("reset")))));

  // ---------------------------------------------------------------- screens
  const frame = (cls, title, src, extra) => h("section", { class: "card screen " + cls },
    h("header", {}, h("h2", {}, typeof title === "string" ? T(title) : title), h("span", { class: "grow" }), h("a", { href: src, target: "_blank", rel: "noopener" }, T("openTab"), " ↗")),
    extra || h("iframe", { src, title: src, loading: "lazy" }));
  document.body.append(h("main", { class: "screens" },
    frame("waiter", "waiter", "waiter.html"),
    frame("phone", "guest", "menu.html?table=4", h("div", { class: "phone-frame" }, h("iframe", { src: "menu.html?table=4", title: "menu", loading: "lazy" }))),
    frame("kds", h("span", {}, "🍳 ", T("station")), "station.html?station=kitchen"),
    frame("kds", h("span", {}, "☕ ", T("station")), "station.html?station=coffee"),
    frame("cash", "cashier", "cashier.html")));

  document.body.append(h("section", { class: "hub-foot" },
    h("div", { class: "card", style: "padding:14px 16px;flex:1;min-width:280px" }, h("b", { "data-t": "features" }, t("features")),
      h("ul", { class: "feat", style: "margin-top:8px" }, ["feat1", "feat2", "feat3", "feat4"].map((k) => T(k, "li")))),
    h("p", { style: "margin:0" }, h("span", { "data-t": "builtWith" }, t("builtWith")), " · ", h("a", { href: "https://cictnardc.net" }, "cictnardc.net"))));

  function render(s) {
    pilot.checked = !!s.autopilot;
    modeBox.replaceChildren(...["register", "provider", "zatca"].map((m) => h("label", {},
      h("input", { type: "radio", name: "hubmode", checked: s.mode === m, onchange: () => STORE.update((st) => { st.mode = m; }) }),
      h("b", {}, t("mode_" + m)), h("span", {}, t("mode_" + m + "Text")))));
  }
  UI.live(render);
  I18N.onChange(() => I18N.apply());
})();
