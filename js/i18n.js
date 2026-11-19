/* Interface language. Shares the "lang" key with the rest of cictnardc.net; ?lang= wins. */
(function () {
  const LANGS = ["en", "fr", "ar"];
  const read = () => { try { return localStorage.getItem("lang"); } catch { return null; } };
  const write = (v) => { try { localStorage.setItem("lang", v); } catch {} };
  const q = new URLSearchParams(location.search).get("lang");
  let lang = LANGS.includes(q) ? q : read();
  if (!LANGS.includes(lang)) lang = (navigator.language || "en").slice(0, 2);
  if (!LANGS.includes(lang)) lang = "en";
  if (LANGS.includes(q)) write(q);

  const S = {
    suite: ["Restaurant & Café Suite", "Suite Restaurant & Café", "منظومة المطاعم والمقاهي"],
    demoTag: ["Demo with sample data", "Démo avec données d'exemple", "نسخة تجريبية ببيانات نموذجية"],
    waiter: ["Waiter tablet", "Tablette serveur", "جهاز النادل"],
    station: ["Station screen", "Écran de poste", "شاشة القسم"],
    cashier: ["Cashier", "Caisse", "الكاشير"],
    guest: ["Guest menu (QR)", "Menu client (QR)", "منيو الزبون (QR)"],
    hubTitle: ["Every screen of a café or restaurant, on one live order stream", "Tous les écrans d'un café ou d'un restaurant, sur un seul flux de commandes en direct", "كل شاشات المقهى أو المطعم على مسار طلبات واحد مباشر"],
    hubLede: ["Waiters take orders on a tablet, guests order from their table by scanning a QR code, and each order lands at once on the right station: kitchen, coffee bar or juice bar. The cashier closes the bill the way the venue needs, beside its existing register, through a compliance provider, or with ZATCA e-invoicing built in.", "Les serveurs prennent les commandes sur tablette, les clients commandent depuis leur table en scannant un QR code, et chaque commande arrive aussitôt au bon poste : cuisine, bar à café ou bar à jus. La caisse clôture l'addition comme le lieu le souhaite : à côté de sa caisse existante, via un prestataire de conformité, ou avec la facturation électronique ZATCA intégrée.", "يسجّل النادل الطلبات على جهاز لوحي، ويطلب الزبون من طاولته بمسح رمز QR، فيصل كل طلب فوراً إلى القسم المعني: المطبخ أو ركن القهوة أو ركن العصائر. ويغلق الكاشير الفاتورة بالطريقة التي تناسب المنشأة: بجانب نقطة البيع الحالية، أو عبر مزوّد امتثال، أو بالفوترة الإلكترونية لهيئة الزكاة والضريبة والجمارك مدمجة في النظام."],
    hubHow: ["Everything here runs in your browser and stays in sync between tabs. Open a screen in a new tab, place an order, and watch it move.", "Tout tourne dans votre navigateur et reste synchronisé entre les onglets. Ouvrez un écran dans un nouvel onglet, passez une commande et suivez-la.", "كل شيء هنا يعمل داخل متصفحك ويبقى متزامناً بين علامات التبويب. افتح أي شاشة في علامة تبويب جديدة، وسجّل طلباً، وتابع مساره."],
    openTab: ["Open in a new tab", "Ouvrir dans un nouvel onglet", "افتح في علامة تبويب جديدة"],
    autopilot: ["Busy service", "Service animé", "خدمة مزدحمة"],
    autopilotTip: ["Simulates guests and staff so the screens keep moving", "Simule clients et personnel pour que les écrans s'animent", "يحاكي الزبائن والموظفين لتبقى الشاشات في حركة"],
    reset: ["Reset demo", "Réinitialiser", "إعادة ضبط النسخة التجريبية"],
    resetQ: ["Clear every order and invoice and start again with the sample service?", "Effacer toutes les commandes et factures et repartir du service d'exemple ?", "حذف كل الطلبات والفواتير والبدء من جديد بالبيانات النموذجية؟"],
    scanTry: ["Scan to see the guest menu on your phone", "Scannez pour voir le menu client sur votre téléphone", "امسح الرمز لترى منيو الزبون على هاتفك"],
    scanNote: ["On your phone the menu runs on its own: in the demo, devices do not share orders. In the real system, every device syncs through the venue's server.", "Sur votre téléphone, le menu fonctionne seul : dans la démo, les appareils ne partagent pas les commandes. Dans le vrai système, tous les appareils se synchronisent via le serveur du lieu.", "على هاتفك يعمل المنيو منفصلاً، فالأجهزة في النسخة التجريبية لا تتشارك الطلبات. أما في النظام الفعلي فتتزامن كل الأجهزة عبر خادم المنشأة."],
    modeNow: ["Billing mode", "Mode de facturation", "طريقة الفوترة"],
    builtWith: ["Built by Talel Ksiksi, CICTNA RDC", "Réalisé par Talel Ksiksi, CICTNA RDC", "من تطوير طلال كسيكسي، CICTNA RDC"],
    backPortfolio: ["Portfolio", "Portfolio", "معرض الأعمال"],
    features: ["What the real system adds", "Ce qu'ajoute le vrai système", "ما يضيفه النظام الفعلي"],
    feat1: ["Every tablet, screen and phone synced live through the venue's server (ASP.NET Core, SignalR, PostgreSQL)", "Tablettes, écrans et téléphones synchronisés en direct via le serveur du lieu (ASP.NET Core, SignalR, PostgreSQL)", "مزامنة مباشرة لكل الأجهزة اللوحية والشاشات والهواتف عبر خادم المنشأة (ASP.NET Core وSignalR وPostgreSQL)"],
    feat2: ["Keeps working when the internet drops, and catches up after", "Continue de fonctionner sans internet, puis rattrape", "يواصل العمل عند انقطاع الإنترنت ثم يستدرك بعد عودته"],
    feat3: ["Kitchen printers, cash drawer, card terminal and delivery apps", "Imprimantes cuisine, tiroir-caisse, terminal de paiement et applications de livraison", "طابعات المطبخ ودرج النقود وجهاز الدفع وتطبيقات التوصيل"],
    feat4: ["Menu, prices and staff managed from one back office, in Arabic and English", "Menu, prix et personnel gérés depuis un back-office, en arabe et en anglais", "إدارة المنيو والأسعار والموظفين من لوحة تحكم واحدة بالعربية والإنجليزية"],

    // floor & tables
    table: ["Table", "Table", "طاولة"],
    counter: ["Counter", "Comptoir", "الكاونتر"],
    free: ["Free", "Libre", "شاغرة"],
    seated: ["Ordering", "En commande", "قيد الطلب"],
    inKitchen: ["In preparation", "En préparation", "قيد التحضير"],
    readyToServe: ["Ready to serve", "Prêt à servir", "جاهز للتقديم"],
    served: ["Served", "Servi", "تم التقديم"],
    billAsked: ["Asked for the bill", "Demande l'addition", "طلب الحساب"],
    callAsked: ["Calling a waiter", "Appelle un serveur", "ينادي النادل"],
    fromQr: ["QR order", "Commande QR", "طلب عبر QR"],
    seats: ["seats", "places", "مقاعد"],
    pickTable: ["Pick a table to take or follow its order.", "Choisissez une table pour prendre ou suivre sa commande.", "اختر طاولة لتسجيل طلبها أو متابعته."],
    alerts: ["Alerts", "Alertes", "تنبيهات"],
    noAlerts: ["Nothing waiting. Ready dishes and guest calls appear here.", "Rien en attente. Les plats prêts et les appels des clients s'affichent ici.", "لا شيء بالانتظار. تظهر هنا الأطباق الجاهزة ونداءات الزبائن."],
    acknowledge: ["Done", "Fait", "تم"],
    serve: ["Serve", "Servir", "قدّم"],
    serveAll: ["Mark all served", "Tout marquer servi", "تم تقديم الكل"],
    current: ["On the table", "Sur la table", "على الطاولة"],
    newItems: ["New items", "Nouveaux articles", "أصناف جديدة"],
    emptyDraft: ["Tap the menu to add items.", "Touchez le menu pour ajouter des articles.", "اضغط على المنيو لإضافة أصناف."],
    send: ["Send to stations", "Envoyer aux postes", "أرسل إلى الأقسام"],
    sent: ["Sent", "Envoyé", "تم الإرسال"],
    note: ["Note for the station", "Note pour le poste", "ملاحظة للقسم"],
    notePh: ["e.g. no onion, allergy…", "ex. sans oignon, allergie…", "مثلاً: بدون بصل، حساسية…"],
    add: ["Add", "Ajouter", "أضف"],
    qty: ["Qty", "Qté", "الكمية"],
    cancel: ["Cancel", "Annuler", "إلغاء"],
    close: ["Close", "Fermer", "إغلاق"],
    total: ["Total", "Total", "الإجمالي"],
    back: ["Back", "Retour", "رجوع"],
    status_new: ["Waiting", "En attente", "بالانتظار"],
    status_cooking: ["Preparing", "En préparation", "قيد التحضير"],
    status_ready: ["Ready", "Prêt", "جاهز"],
    status_served: ["Served", "Servi", "تم التقديم"],
    guests: ["guests", "clients", "زبائن"],

    // stations
    allStations: ["All stations", "Tous les postes", "كل الأقسام"],
    colNew: ["New", "Nouveau", "جديد"],
    colCooking: ["Preparing", "En préparation", "قيد التحضير"],
    colReady: ["Ready for pickup", "Prêt à emporter en salle", "جاهز للاستلام"],
    start: ["Start", "Commencer", "ابدأ"],
    bumpReady: ["Ready", "Prêt", "جاهز"],
    recall: ["Recall", "Rappeler", "استرجاع"],
    noTickets: ["No tickets", "Aucun ticket", "لا توجد طلبات"],
    minAgo: ["min", "min", "د"],
    avgTime: ["Average prep time", "Temps moyen de préparation", "متوسط وقت التحضير"],
    openTickets: ["Open tickets", "Tickets ouverts", "طلبات مفتوحة"],
    waiterName: ["Waiter", "Serveur", "النادل"],

    // cashier
    openTables: ["Open tables", "Tables ouvertes", "الطاولات المفتوحة"],
    journal: ["Invoice journal", "Journal des factures", "سجل الفواتير"],
    report: ["Day report", "Rapport du jour", "تقرير اليوم"],
    settings: ["Settings", "Réglages", "الإعدادات"],
    noOpen: ["No open table. New orders appear here.", "Aucune table ouverte. Les nouvelles commandes apparaissent ici.", "لا توجد طاولات مفتوحة. تظهر الطلبات الجديدة هنا."],
    pickBill: ["Pick a table to see its bill.", "Choisissez une table pour voir son addition.", "اختر طاولة لعرض فاتورتها."],
    bill: ["Bill", "Addition", "الفاتورة"],
    splitItems: ["Pay selected items", "Payer les articles choisis", "دفع الأصناف المحددة"],
    splitEqual: ["Split equally", "Partager à parts égales", "تقسيم بالتساوي"],
    parts: ["parts", "parts", "أجزاء"],
    part: ["Part", "Part", "الجزء"],
    payWhole: ["Whole bill", "Toute l'addition", "الفاتورة كاملة"],
    subtotal: ["Total excl. VAT", "Total HT", "الإجمالي غير شامل الضريبة"],
    vat: ["VAT 15%", "TVA 15 %", "ضريبة القيمة المضافة 15%"],
    totalInc: ["Total incl. VAT", "Total TTC", "الإجمالي شامل الضريبة"],
    cash: ["Cash", "Espèces", "نقداً"],
    card: ["Card", "Carte", "بطاقة"],
    payIssue: ["Take payment", "Encaisser", "تحصيل المبلغ"],
    paying: ["Paying", "À payer", "المبلغ المطلوب"],
    selectHint: ["Tick the items this guest pays for.", "Cochez les articles que ce client paie.", "حدّد الأصناف التي يدفعها هذا الزبون."],
    unpaid: ["Left to pay", "Reste à payer", "المتبقي"],
    receipt: ["Receipt", "Reçu", "الإيصال"],
    print: ["Print", "Imprimer", "طباعة"],
    viewXml: ["View XML", "Voir le XML", "عرض XML"],
    handoffTitle: ["Ring this up on the venue's register", "À saisir sur la caisse du lieu", "سجّل هذا المبلغ على نقطة البيع الخاصة بالمنشأة"],
    handoffText: ["The tax receipt comes from the existing register. This suite only keeps the bill number for the day report.", "Le reçu fiscal sort de la caisse existante. La suite ne garde que le numéro d'addition pour le rapport du jour.", "الإيصال الضريبي يصدر من نقطة البيع الحالية، وتكتفي المنظومة بحفظ رقم الفاتورة لتقرير اليوم."],
    providerSent: ["Sent to the compliance provider", "Envoyée au prestataire de conformité", "أُرسلت إلى مزوّد الامتثال"],
    zatcaPending: ["Signed. Reporting to ZATCA…", "Signée. Déclaration à ZATCA…", "تم التوقيع. جارٍ الإبلاغ إلى الهيئة…"],
    reported: ["Reported", "Déclarée", "تم الإبلاغ"],
    pending: ["Pending", "En attente", "بالانتظار"],
    handedOff: ["Rung up on register", "Saisie en caisse", "سُجّلت في نقطة البيع"],
    simplified: ["Simplified tax invoice", "Facture fiscale simplifiée", "فاتورة ضريبية مبسطة"],
    demoStamp: ["DEMO: not reported to ZATCA", "DÉMO : non déclarée à ZATCA", "نسخة تجريبية: لم تُبلَّغ إلى الهيئة"],
    icv: ["Counter", "Compteur", "العدّاد"],
    hash: ["Invoice hash", "Empreinte", "بصمة الفاتورة"],
    prevHash: ["Previous hash", "Empreinte précédente", "البصمة السابقة"],
    verifyChain: ["Verify the chain", "Vérifier la chaîne", "تحقق من السلسلة"],
    chainOk: ["Chain intact: every invoice points to the one before it.", "Chaîne intacte : chaque facture renvoie à la précédente.", "السلسلة سليمة: كل فاتورة مرتبطة بالتي قبلها."],
    chainBad: ["Chain broken at counter", "Chaîne rompue au compteur", "انقطعت السلسلة عند العدّاد"],
    noInvoices: ["No invoice yet today.", "Aucune facture aujourd'hui.", "لا توجد فواتير اليوم."],
    invoiceNo: ["No.", "N°", "رقم"],
    time: ["Time", "Heure", "الوقت"],
    amount: ["Amount", "Montant", "المبلغ"],
    mode: ["Mode", "Mode", "الطريقة"],
    statusCol: ["Status", "Statut", "الحالة"],
    sales: ["Sales", "Ventes", "المبيعات"],
    bills: ["Bills", "Additions", "الفواتير"],
    avgBill: ["Average bill", "Addition moyenne", "متوسط الفاتورة"],
    byPayment: ["By payment", "Par paiement", "حسب طريقة الدفع"],
    byStation: ["Items by station", "Articles par poste", "الأصناف حسب القسم"],
    topItems: ["Best sellers", "Meilleures ventes", "الأكثر مبيعاً"],
    vatCollected: ["VAT collected", "TVA collectée", "الضريبة المحصّلة"],
    mode_register: ["Beside the venue's register", "À côté de la caisse du lieu", "بجانب نقطة البيع الحالية"],
    mode_registerText: ["Orders, stations and bills run here; the venue's existing compliant POS prints the tax receipt. Fastest to adopt: nothing to replace.", "Commandes, postes et additions tournent ici ; la caisse conforme existante imprime le reçu fiscal. Le plus rapide à adopter : rien à remplacer.", "الطلبات والأقسام والفواتير تُدار هنا، ونقطة البيع المعتمدة الحالية تطبع الإيصال الضريبي. الأسرع تبنّياً لأنه لا يتطلب استبدال أي شيء."],
    mode_provider: ["Through a compliance provider", "Via un prestataire de conformité", "عبر مزوّد امتثال"],
    mode_providerText: ["The suite issues the invoice and hands it to an e-invoicing provider's API, which signs and reports it to ZATCA. A full POS without owning the compliance layer.", "La suite émet la facture et la confie à l'API d'un prestataire de facturation électronique, qui la signe et la déclare à ZATCA. Une caisse complète sans porter la couche de conformité.", "تُصدر المنظومة الفاتورة وتسلّمها إلى واجهة مزوّد فوترة إلكترونية يتولى توقيعها وإبلاغ الهيئة بها. نقطة بيع كاملة دون تحمّل طبقة الامتثال."],
    mode_zatca: ["ZATCA e-invoicing built in", "Facturation ZATCA intégrée", "الفوترة الإلكترونية مدمجة"],
    mode_zatcaText: ["Each till is an onboarded device: the suite builds the UBL invoice, chains it to the previous one, stamps it, prints the QR code and reports it to Fatoora within 24 hours.", "Chaque caisse est un appareil enregistré : la suite construit la facture UBL, la chaîne à la précédente, la scelle, imprime le QR code et la déclare à Fatoora sous 24 heures.", "كل نقطة بيع جهاز مسجّل لدى الهيئة: تُنشئ المنظومة فاتورة UBL وتربطها بالسابقة وتختمها وتطبع رمز QR وتبلّغ منصة فاتورة خلال 24 ساعة."],
    modeNoteDemo: ["In the demo, signing uses a key made in your browser and nothing is sent to ZATCA. The data model is the same in all three modes, so a venue can switch later without losing history.", "Dans la démo, la signature utilise une clé créée dans votre navigateur et rien n'est envoyé à ZATCA. Le modèle de données est le même dans les trois modes : un lieu peut changer plus tard sans perdre son historique.", "في النسخة التجريبية يتم التوقيع بمفتاح يُنشأ في متصفحك ولا يُرسل شيء إلى الهيئة. نموذج البيانات واحد في الطرق الثلاث، فتستطيع المنشأة التبديل لاحقاً دون أن تفقد سجلها."],
    venue: ["Venue", "Établissement", "المنشأة"],
    vatNo: ["VAT number", "N° de TVA", "الرقم الضريبي"],
    crNo: ["CR number", "N° RC", "السجل التجاري"],

    // guest
    welcome: ["Welcome", "Bienvenue", "أهلاً وسهلاً"],
    yourTable: ["Your table", "Votre table", "طاولتك"],
    yourOrder: ["Your order", "Votre commande", "طلبك"],
    viewOrder: ["View order", "Voir la commande", "عرض الطلب"],
    placeOrder: ["Place order", "Commander", "أرسل الطلب"],
    orderPlaced: ["Order sent to the kitchen and bar. We'll bring it to your table.", "Commande envoyée en cuisine et au bar. Nous l'apportons à votre table.", "وصل طلبك إلى المطبخ والركن المختص، وسنحضره إلى طاولتك."],
    callWaiter: ["Call a waiter", "Appeler un serveur", "نادِ النادل"],
    askBill: ["Ask for the bill", "Demander l'addition", "اطلب الحساب"],
    called: ["A waiter is on the way.", "Un serveur arrive.", "النادل في الطريق إليك."],
    billCalled: ["Your bill is on its way.", "Votre addition arrive.", "الحساب في الطريق إليك."],
    tracking: ["Order status", "Suivi de commande", "حالة الطلب"],
    nothingYet: ["Nothing ordered yet.", "Rien de commandé pour l'instant.", "لم تطلب شيئاً بعد."],
    allergens: ["Ask us about allergens. Prices include VAT.", "Demandez-nous les allergènes. Prix TTC.", "اسألنا عن مسببات الحساسية. الأسعار شاملة الضريبة."],
    chooseTable: ["Which table are you at?", "À quelle table êtes-vous ?", "على أي طاولة أنت؟"],
    items: ["items", "articles", "أصناف"],
  };

  const idx = () => LANGS.indexOf(lang);
  const t = (k) => (S[k] ? S[k][idx()] ?? S[k][0] : k);
  const L = (v) => (v && typeof v === "object" ? v[lang] ?? v.en : v);
  const listeners = [];

  function apply() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll("[data-t-title]").forEach((el) => { el.title = t(el.dataset.tTitle); });
    document.querySelectorAll(".lang-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));
  }
  function set(next) {
    if (!LANGS.includes(next) || next === lang) return;
    lang = next; write(lang); apply(); listeners.forEach((f) => f(lang));
  }
  function switcher() {
    const box = document.createElement("div");
    box.className = "lang-switch"; box.setAttribute("role", "group"); box.setAttribute("aria-label", "Language");
    [["en", "EN"], ["fr", "FR"], ["ar", "عربي"]].forEach(([code, label]) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.lang = code; b.textContent = label; b.lang = code;
      b.addEventListener("click", () => set(code));
      box.appendChild(b);
    });
    return box;
  }
  // Keep frames on the same page in step with each other.
  window.addEventListener("storage", (e) => { if (e.key === "lang" && LANGS.includes(e.newValue) && e.newValue !== lang) { lang = e.newValue; apply(); listeners.forEach((f) => f(lang)); } });

  const money = (n) => {
    const v = (Math.round(n * 100) / 100).toFixed(2);
    return lang === "ar" ? `${v} ر.س` : `SAR ${v}`;
  };
  const locale = () => (lang === "ar" ? "ar-SA-u-nu-latn" : lang === "fr" ? "fr-FR" : "en-GB");
  const clock = (ts) => new Date(ts).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });

  window.I18N = { t, L, apply, set, switcher, onChange: (f) => listeners.push(f), get lang() { return lang; }, money, clock, locale };
  document.addEventListener("DOMContentLoaded", apply);
})();
