/*
 * Closing a bill. The invoice is built the same way in every mode (sequence
 * number, VAT per line, UBL 2.1 structure); only the last step differs:
 *
 *   register  the venue's existing compliant POS prints the tax receipt,
 *             the suite keeps the bill for its day report
 *   provider  the invoice goes to an e-invoicing provider's API, which signs
 *             and reports it to ZATCA
 *   zatca     the suite is the onboarded device: counter (ICV), previous hash
 *             (PIH), stamp, QR, then reporting to Fatoora within 24 hours
 *
 * In the real system these are three implementations of one IInvoiceIssuer
 * interface on the server. In the demo, the key is made in this browser,
 * P-256 stands in for ZATCA's secp256k1, and nothing leaves the page.
 */
(function () {
  const D = window.RS_DATA;
  const enc = new TextEncoder();
  const r2 = (n) => Math.round(n * 100) / 100;
  const pad = (n, w) => String(n).padStart(w, "0");
  // ZATCA's first "previous invoice hash": the base64 SHA-256 of "0".
  const FIRST_PIH = "NWZlY2ViNjZmZmM4NmYzOGQ5NTI3ODZjNmQ2OTZjNzljMmRiYzIzOWRkNGU5MWI0NjcyOWQ3M2EyN2ZiNTdlOQ==";

  const b64 = (bytes) => { let s = ""; new Uint8Array(bytes).forEach((b) => { s += String.fromCharCode(b); }); return btoa(s); };
  async function sha256b64(text) { return b64(await crypto.subtle.digest("SHA-256", enc.encode(text))); }

  /** Amounts from VAT-inclusive prices, line by line, as a Saudi receipt shows them. */
  function amounts(lines) {
    const rows = lines.map((l) => {
      const it = D.item(l.itemId);
      const gross = r2(l.unit * l.qty);
      const net = r2(gross / (1 + D.VENUE.vatRate));
      return { itemId: l.itemId, name: it.name.en, nameAr: it.name.ar, qty: l.qty, unit: l.unit, gross, net, vat: r2(gross - net), mods: l.mods };
    });
    const total = r2(rows.reduce((a, x) => a + x.gross, 0));
    const net = r2(rows.reduce((a, x) => a + x.net, 0));
    return { rows, total, net, vat: r2(total - net) };
  }
  /** One share of a bill split equally: VAT recomputed on the share. */
  function shareAmounts(total) {
    const net = r2(total / (1 + D.VENUE.vatRate));
    return { rows: [], total: r2(total), net, vat: r2(total - net) };
  }

  // ------------------------------------------------------------------ device key (demo)
  async function deviceKey() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem("rs-device-key")); } catch {}
    if (saved) {
      const priv = await crypto.subtle.importKey("jwk", saved.priv, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
      return { priv, spki: Uint8Array.from(atob(saved.spki), (c) => c.charCodeAt(0)) };
    }
    const k = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", k.publicKey));
    const priv = await crypto.subtle.exportKey("jwk", k.privateKey);
    try { localStorage.setItem("rs-device-key", JSON.stringify({ priv, spki: b64(spki) })); } catch {}
    return { priv: k.privateKey, spki };
  }

  // ------------------------------------------------------------------ QR (TLV, base64)
  function tlv(fields) {
    const parts = [];
    fields.forEach(([tag, value]) => {
      const bytes = value instanceof Uint8Array ? value : enc.encode(String(value));
      parts.push(tag, bytes.length, ...bytes);
    });
    return b64(Uint8Array.from(parts));
  }

  // ------------------------------------------------------------------ UBL 2.1
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function ubl(inv) {
    const V = D.VENUE;
    const d = new Date(inv.issuedAt);
    const date = d.toISOString().slice(0, 10);
    const time = d.toISOString().slice(11, 19);
    const lines = inv.rows.length ? inv.rows : [{ name: "Share of bill " + inv.billNo, nameAr: "حصة من الفاتورة", qty: 1, gross: inv.total, net: inv.net, vat: inv.vat }];
    return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>reporting:1.0</cbc:ProfileID>
  <cbc:ID>${esc(inv.no)}</cbc:ID>
  <cbc:UUID>${inv.id}</cbc:UUID>
  <cbc:IssueDate>${date}</cbc:IssueDate>
  <cbc:IssueTime>${time}</cbc:IssueTime>
  <cbc:InvoiceTypeCode name="0200000">388</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>SAR</cbc:DocumentCurrencyCode>
  <cbc:TaxCurrencyCode>SAR</cbc:TaxCurrencyCode>
  <cac:AdditionalDocumentReference><cbc:ID>ICV</cbc:ID><cbc:UUID>${inv.icv}</cbc:UUID></cac:AdditionalDocumentReference>
  <cac:AdditionalDocumentReference><cbc:ID>PIH</cbc:ID><cac:Attachment><cbc:EmbeddedDocumentBinaryObject mimeCode="text/plain">${inv.pih}</cbc:EmbeddedDocumentBinaryObject></cac:Attachment></cac:AdditionalDocumentReference>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyIdentification><cbc:ID schemeID="CRN">${V.crNumber}</cbc:ID></cac:PartyIdentification>
    <cac:PostalAddress><cbc:StreetName>King Fahd Road</cbc:StreetName><cbc:CitySubdivisionName>Al Olaya</cbc:CitySubdivisionName><cbc:CityName>Riyadh</cbc:CityName><cac:Country><cbc:IdentificationCode>SA</cbc:IdentificationCode></cac:Country></cac:PostalAddress>
    <cac:PartyTaxScheme><cbc:CompanyID>${V.vatNumber}</cbc:CompanyID><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:PartyTaxScheme>
    <cac:PartyLegalEntity><cbc:RegistrationName>${esc(V.legalNameAr)}</cbc:RegistrationName></cac:PartyLegalEntity>
  </cac:Party></cac:AccountingSupplierParty>
  <cac:PaymentMeans><cbc:PaymentMeansCode>${inv.payment === "card" ? "48" : "10"}</cbc:PaymentMeansCode></cac:PaymentMeans>
  <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${inv.vat.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="SAR">${inv.net.toFixed(2)}</cbc:TaxableAmount><cbc:TaxAmount currencyID="SAR">${inv.vat.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>15.00</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="SAR">${inv.net.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="SAR">${inv.net.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="SAR">${inv.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="SAR">${inv.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lines.map((x, i) => `  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="PCE">${x.qty}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="SAR">${x.net.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:TaxTotal><cbc:TaxAmount currencyID="SAR">${x.vat.toFixed(2)}</cbc:TaxAmount><cbc:RoundingAmount currencyID="SAR">${x.gross.toFixed(2)}</cbc:RoundingAmount></cac:TaxTotal>
    <cac:Item><cbc:Name>${esc(x.nameAr)} | ${esc(x.name)}</cbc:Name><cac:ClassifiedTaxCategory><cbc:ID>S</cbc:ID><cbc:Percent>15.00</cbc:Percent><cac:TaxScheme><cbc:ID>VAT</cbc:ID></cac:TaxScheme></cac:ClassifiedTaxCategory></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="SAR">${r2(x.net / x.qty).toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`).join("\n")}
</Invoice>`;
  }

  /**
   * Close a bill. `lines` are the order lines being paid (empty for an equal share),
   * `share` the amount of an equal share. Resolves with the stored invoice.
   */
  // Bills are closed one at a time, so the counter and the chain never interleave.
  let queue = Promise.resolve();
  function issue(args) { const run = queue.then(() => issueNow(args)); queue = run.catch(() => {}); return run; }

  async function issueNow({ tableId, orderNo, lines, share, payment, mode }) {
    const a = share ? shareAmounts(share) : amounts(lines);
    const s0 = STORE.get();
    const billNo = (s0.seq.bill || 0) + 1;
    const inv = {
      id: STORE.uid(), mode, tableId, orderNo, billNo, payment, issuedAt: Date.now(),
      rows: a.rows, total: a.total, net: a.net, vat: a.vat,
      no: mode === "register" ? "B-" + pad(billNo, 5) : "INV-" + new Date().getFullYear() + "-" + pad(billNo, 6),
      icv: null, pih: null, hash: null, qr: null, xml: null, status: mode === "register" ? "handed-off" : "pending", providerRef: null,
    };
    if (mode !== "register") {
      // The counter and the chain belong to the device; claim them in one update so two tills never share a number.
      let icv, pih;
      STORE.update((s) => { s.device.icv += 1; icv = s.device.icv; pih = s.device.pih || FIRST_PIH; });
      inv.icv = icv; inv.pih = pih;
      inv.xml = ubl(inv);
      inv.hash = await sha256b64(inv.xml);
      const V = D.VENUE;
      const ts = new Date(inv.issuedAt).toISOString().slice(0, 19) + "Z";
      const fields = [[1, V.legalNameAr], [2, V.vatNumber], [3, ts], [4, inv.total.toFixed(2)], [5, inv.vat.toFixed(2)]];
      if (mode === "zatca") {
        const key = await deviceKey();
        const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.priv, enc.encode(inv.hash)));
        fields.push([6, inv.hash], [7, b64(sig)], [8, key.spki]);
      }
      inv.qr = tlv(fields);
    }
    STORE.update((s) => {
      s.seq.bill = billNo;
      if (inv.hash) s.device.pih = inv.hash;
      s.invoices.push(inv);
      const paidIds = new Set(lines.map((l) => l.id));
      const o = s.orders.find((x) => x.no === orderNo && x.tableId === tableId);
      if (o) {
        o.lines.forEach((l) => { if (paidIds.has(l.id)) l.paid = true; });
        if (share) o.paidShares = r2((o.paidShares || 0) + share);
        const left = r2(o.lines.filter((l) => !l.paid).reduce((x, l) => x + l.unit * l.qty, 0) - (o.paidShares || 0));
        if (left <= 0.01) {
          o.status = "closed"; o.closedAt = Date.now();
          s.calls.forEach((c) => { if (c.tableId === tableId) c.done = true; });
        }
      }
    });
    return inv;
  }

  /** Simulated reporting: the provider or Fatoora answers a moment later. */
  function processQueue() {
    const s = STORE.get();
    const due = s.invoices.filter((i) => i.status === "pending" && Date.now() - i.issuedAt > (i.mode === "provider" ? 900 : 1600));
    if (!due.length) return;
    STORE.update((st) => {
      st.invoices.forEach((i) => {
        if (i.status === "pending" && Date.now() - i.issuedAt > (i.mode === "provider" ? 900 : 1600)) {
          i.status = "reported"; i.reportedAt = Date.now();
          if (i.mode === "provider") i.providerRef = "EIP-" + Math.random().toString(36).slice(2, 10).toUpperCase();
        }
      });
    });
  }

  /** Re-hash every stored invoice and check each one points at the one before. */
  async function verifyChain() {
    const list = STORE.get().invoices.filter((i) => i.icv).sort((a, b) => a.icv - b.icv);
    let prev = FIRST_PIH;
    for (const i of list) {
      if (i.pih !== prev) return { ok: false, at: i.icv };
      if ((await sha256b64(i.xml)) !== i.hash) return { ok: false, at: i.icv };
      prev = i.hash;
    }
    return { ok: true, count: list.length };
  }

  /** Read the QR payload back, field by field (used by the receipt view and the tests). */
  function decodeQr(b) {
    const bytes = Uint8Array.from(atob(b), (c) => c.charCodeAt(0));
    const out = {}; let i = 0;
    while (i < bytes.length) { const tag = bytes[i], len = bytes[i + 1]; const v = bytes.slice(i + 2, i + 2 + len); out[tag] = tag <= 7 ? new TextDecoder().decode(v) : v; i += 2 + len; }
    return out;
  }

  window.INVOICE = { amounts, issue, processQueue, verifyChain, decodeQr, r2 };
})();
