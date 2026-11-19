/* Sample venue: a café-restaurant in Riyadh. Prices include 15% VAT, as menus in Saudi Arabia do. */
(function () {
  const L = (en, fr, ar) => ({ en, fr, ar });

  const VENUE = {
    name: L("Qamra Café & Kitchen", "Qamra Café & Cuisine", "قمرة كافيه آند كيتشن"),
    legalName: "Qamra Hospitality Co. (sample)",
    legalNameAr: "شركة قمرة للضيافة",
    vatNumber: "399999999900003",
    crNumber: "1010010000",
    address: L("King Fahd Road, Al Olaya, Riyadh", "Route du Roi Fahd, Al Olaya, Riyad", "طريق الملك فهد، العليا، الرياض"),
    currency: "SAR",
    vatRate: 0.15,
  };

  // Each station has its own screen and only sees its own items.
  const STATIONS = {
    kitchen: { icon: "🍳", name: L("Kitchen", "Cuisine", "المطبخ") },
    coffee: { icon: "☕", name: L("Coffee bar", "Bar à café", "ركن القهوة") },
    bar: { icon: "🥤", name: L("Juice & cold bar", "Bar à jus et boissons fraîches", "ركن العصائر والمشروبات الباردة") },
  };

  const CATEGORIES = [
    { id: "coffee", name: L("Coffee", "Cafés", "القهوة") },
    { id: "cold", name: L("Cold drinks", "Boissons fraîches", "مشروبات باردة") },
    { id: "breakfast", name: L("Breakfast", "Petit-déjeuner", "الفطور") },
    { id: "mains", name: L("Mains", "Plats", "الأطباق الرئيسية") },
    { id: "sweets", name: L("Sweets", "Desserts", "الحلويات") },
  ];

  const MODS = {
    size: { name: L("Size", "Taille", "الحجم"), one: true, options: [
      { id: "s", name: L("Small", "Petit", "صغير"), price: 0 },
      { id: "m", name: L("Medium", "Moyen", "وسط"), price: 3 },
      { id: "l", name: L("Large", "Grand", "كبير"), price: 6 },
    ] },
    milk: { name: L("Milk", "Lait", "الحليب"), one: true, options: [
      { id: "full", name: L("Full cream", "Entier", "كامل الدسم"), price: 0 },
      { id: "oat", name: L("Oat", "Avoine", "شوفان"), price: 4 },
      { id: "almond", name: L("Almond", "Amande", "لوز"), price: 4 },
    ] },
    sugar: { name: L("Sugar", "Sucre", "السكر"), one: true, options: [
      { id: "none", name: L("No sugar", "Sans sucre", "بدون سكر"), price: 0 },
      { id: "less", name: L("Less sugar", "Peu sucré", "سكر خفيف"), price: 0 },
      { id: "normal", name: L("Normal", "Normal", "عادي"), price: 0 },
    ] },
    extras: { name: L("Extras", "Suppléments", "إضافات"), one: false, options: [
      { id: "shot", name: L("Extra shot", "Shot supplémentaire", "شوت إضافي"), price: 5 },
      { id: "cheese", name: L("Extra cheese", "Fromage en plus", "جبن إضافي"), price: 4 },
      { id: "egg", name: L("Add an egg", "Œuf en plus", "بيضة إضافية"), price: 4 },
    ] },
    cook: { name: L("Cooking", "Cuisson", "درجة الطهي"), one: true, options: [
      { id: "medium", name: L("Medium", "À point", "متوسط"), price: 0 },
      { id: "well", name: L("Well done", "Bien cuit", "مستوٍ جيداً"), price: 0 },
    ] },
  };

  const ITEMS = [
    { id: "saudi", cat: "coffee", station: "coffee", price: 14, emoji: "🫖", mods: ["sugar"], name: L("Saudi coffee & dates", "Café saoudien et dattes", "قهوة سعودية مع تمر") },
    { id: "latte", cat: "coffee", station: "coffee", price: 18, emoji: "☕", mods: ["size", "milk", "extras"], name: L("Spanish latte", "Latte espagnol", "سبانش لاتيه") },
    { id: "flat", cat: "coffee", station: "coffee", price: 17, emoji: "☕", mods: ["milk", "extras"], name: L("Flat white", "Flat white", "فلات وايت") },
    { id: "v60", cat: "coffee", station: "coffee", price: 22, emoji: "⚗️", mods: [], name: L("V60 single origin", "V60 origine unique", "V60 محصول واحد") },
    { id: "karak", cat: "coffee", station: "coffee", price: 9, emoji: "🍵", mods: ["sugar"], name: L("Karak tea", "Thé karak", "شاي كرك") },
    { id: "lemonmint", cat: "cold", station: "bar", price: 16, emoji: "🍋", mods: ["sugar"], name: L("Lemon & mint", "Citron et menthe", "ليمون بالنعناع") },
    { id: "mango", cat: "cold", station: "bar", price: 19, emoji: "🥭", mods: ["size"], name: L("Fresh mango juice", "Jus de mangue frais", "عصير مانجو طازج") },
    { id: "icedlatte", cat: "cold", station: "coffee", price: 19, emoji: "🧊", mods: ["milk", "extras"], name: L("Iced latte", "Latte glacé", "آيس لاتيه") },
    { id: "water", cat: "cold", station: "bar", price: 5, emoji: "💧", mods: [], name: L("Still water", "Eau plate", "مياه") },
    { id: "shakshuka", cat: "breakfast", station: "kitchen", price: 32, emoji: "🍳", mods: ["extras"], name: L("Shakshuka", "Chakchouka", "شكشوكة") },
    { id: "foul", cat: "breakfast", station: "kitchen", price: 24, emoji: "🫘", mods: [], name: L("Foul with tahini", "Foul au tahini", "فول بالطحينة") },
    { id: "croissant", cat: "breakfast", station: "kitchen", price: 15, emoji: "🥐", mods: ["extras"], name: L("Zaatar croissant", "Croissant au zaatar", "كرواسون زعتر") },
    { id: "kabsa", cat: "mains", station: "kitchen", price: 58, emoji: "🍛", mods: [], name: L("Chicken kabsa", "Kabsa au poulet", "كبسة دجاج") },
    { id: "burger", cat: "mains", station: "kitchen", price: 46, emoji: "🍔", mods: ["cook", "extras"], name: L("Wagyu burger", "Burger wagyu", "برجر واغيو") },
    { id: "salad", cat: "mains", station: "kitchen", price: 34, emoji: "🥗", mods: [], name: L("Halloumi salad", "Salade halloumi", "سلطة حلومي") },
    { id: "pasta", cat: "mains", station: "kitchen", price: 42, emoji: "🍝", mods: [], name: L("Truffle pasta", "Pâtes à la truffe", "باستا بالكمأة") },
    { id: "kunafa", cat: "sweets", station: "kitchen", price: 28, emoji: "🧁", mods: [], name: L("Kunafa", "Knafeh", "كنافة") },
    { id: "lotus", cat: "sweets", station: "kitchen", price: 26, emoji: "🍰", mods: [], name: L("Lotus cheesecake", "Cheesecake Lotus", "تشيز كيك لوتس") },
    { id: "dates", cat: "sweets", station: "coffee", price: 12, emoji: "🌴", mods: [], name: L("Stuffed dates", "Dattes fourrées", "تمر محشي") },
  ];

  const TABLES = [
    { id: "1", zone: "in", seats: 2 }, { id: "2", zone: "in", seats: 2 }, { id: "3", zone: "in", seats: 4 },
    { id: "4", zone: "in", seats: 4 }, { id: "5", zone: "in", seats: 6 }, { id: "6", zone: "in", seats: 4 },
    { id: "7", zone: "out", seats: 2 }, { id: "8", zone: "out", seats: 4 }, { id: "9", zone: "out", seats: 4 },
    { id: "10", zone: "out", seats: 6 }, { id: "C", zone: "counter", seats: 0 },
  ];
  const ZONES = { in: L("Inside", "Salle", "الصالة"), out: L("Terrace", "Terrasse", "التراس"), counter: L("Counter & takeaway", "Comptoir et à emporter", "الكاونتر والسفري") };

  window.RS_DATA = { VENUE, STATIONS, CATEGORIES, MODS, ITEMS, TABLES, ZONES, item: (id) => ITEMS.find((i) => i.id === id) };
})();
