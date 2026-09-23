/* Store Helep — app.js (frontend wiring + API client) */

/* ---------------- API client + local state ---------------- */
const API_BASE = "/api";

let analyticsProductId = "";
let loadedProducts = [];

function getLang() {
  return localStorage.getItem("sh_lang") || "en";
}
function locale() {
  return getLang() === "fr" ? "fr-CM" : "en-CM";
}

const I18N = {
  en: {
    "nav.home": "Home", "nav.records": "Records", "nav.scan": "Scan",
    "nav.products": "Products", "nav.analytics": "Analytics",
    "menu.language": "Language", "menu.business": "Business Info",
    "menu.darkmode": "Dark mode", "menu.terms": "Terms & policies", "menu.logout": "Log out",

    "common.cancel": "Cancel", "common.save": "Save", "common.add": "Add",
    "common.apply": "Apply", "common.all": "All",
    "common.fillRequired": "Please fill all required fields",
    "common.loading": "Loading...",
    "common.units": "units", "common.items": "items", "common.products": "products",
    "common.records": "records",
    "common.saved": "Saved", "common.needsReview": "Needs review",
    "common.verified": "verified", "common.needsReviewLower": "needs review",
    "common.unknownItem": "Unknown item",
    "common.loginFailed": "Login failed", "common.saveFailed": "Save failed",

    "dash.todaySales": "Today's sales", "dash.quickActions": "Quick actions",
    "dash.attentionHeader": "Needs your attention", "dash.scanRecords": "Scan records",
    "dash.viewExcel": "View as excel", "dash.estProfit": "Estimated profit",
    "dash.productsSold": "Products sold", "dash.lowStock": "Low stock",
    "dash.vsYesterday": "vs yesterday",
    "dash.transactionsToday": "transactions today",
    "dash.allGood": "All good",
    "dash.noAlerts": "No stock alerts right now",
    "dash.restockSoon": "Restock soon to avoid missed sales",
    "dash.attentionLow": "{n} products are low in stock",
    "dash.attentionOut": "{n} products are out of stock",

    "prod.title": "Products", "prod.statTotal": "Total products", "prod.statValue": "Stock value",
    "prod.statLow": "Low stock", "prod.statOut": "Out of stock",
    "prod.noProducts": "No products found.",
    "prod.search": "Search products", "prod.noMatch": "No products match your search.",
    "prod.sku": "SKU", "prod.inStock": "In stock", "prod.lowStock": "Low stock",
    "prod.outOfStock": "Out of stock", "prod.addTitle": "Add product",
    "prod.productName": "Product name", "prod.skuLabel": "SKU (e.g. CC-99)",
    "prod.category": "Category", "prod.unitPrice": "Unit price (FCFA)",
    "prod.stockQty": "Stock quantity", "prod.added": "Product added",
    "prod.restock": "Restock", "prod.edit": "Edit",
    "prod.restockTitle": "Restock", "prod.editTitle": "Edit product",
    "prod.currentStock": "Current stock", "prod.currentValue": "Current value",
    "prod.addQty": "Quantity to add", "prod.afterRestock": "After restock",
    "prod.newStock": "New stock", "prod.newValue": "New value",
    "prod.restocked": "Restocked", "prod.updated": "Product updated",
    "prod.cat.drinks": "Drinks", "prod.cat.groceries": "Groceries",
    "prod.cat.bakery": "Bakery", "prod.cat.household": "Household",
    "prod.cat.snacks": "Snacks", "prod.cat.personal": "Personal Care",
    "prod.cat.other": "Other",

    "rec.title": "Records", "rec.today": "Today", "rec.week": "This week",
    "rec.month": "This month", "rec.custom": "Custom",
    "common.custom": "Custom",
    "rec.noRecords": "No records found.", "rec.addTitle": "Add manual record",
    "rec.productName": "Product name", "rec.quantity": "Quantity",
    "rec.unitPrice": "Unit price (FCFA)", "rec.added": "Record added",
    "rec.manual": "Manual", "rec.scanned": "Scanned",

    "ana.totalSales": "Total sales", "ana.numberOfSales": "Number of sales",
    "ana.avgTransaction": "Avg. transaction", "ana.estProfit": "Est. profit",
    "ana.allProducts": "All products",
    "ana.mon": "Mon", "ana.tue": "Tue", "ana.wed": "Wed", "ana.thu": "Thu",
    "ana.fri": "Fri", "ana.sat": "Sat", "ana.sun": "Sun",
    "ana.title": "Analytics", "ana.7days": "7 days", "ana.30days": "30 days",
    "ana.best": "Best-selling products", "ana.slow": "Slow-moving products",
    "ana.noData": "No data", "ana.noSales": "No sales in this period.", "ana.up": "up", "ana.down": "down", "ana.steady": "steady",
    "ana.unitsSold": "units sold",
    "ana.customRange": "Custom date range", "ana.from": "From", "ana.to": "To",

    "scan.title": "Scan your records", "scan.lede": "Take a clear photo of a page from your sales book.",
    "scan.scanPage": "Scan a page", "scan.gallery": "Choose from gallery",
    "scan.previous": "View previous scans",
    "scan.info": "Place the page on a flat surface and make sure the writing is visible.",
    "scan.demoPage1": "Page — 15 Aug 2026", "scan.demoPage2": "Page — 14 Aug 2026",
    "scan.demoD1": "8 records · needs review", "scan.demoD2": "11 records · verified",
    "scan.previousScans": "Previous scans", "scan.recentScans": "Recent scans",
    "scan.noScans": "No scans yet.",
    "history.title": "Previous scans", "history.empty": "You haven't scanned anything yet.",
    "scan.reviewTitle": "Review extracted records",
    "scan.reviewHint": "Confirm each row before it becomes an official record.",
    "scan.confirm": "Confirm & save", "scan.failed": "Scan failed",
    "scan.saved": "Scan saved as records", "scan.confirmFailed": "Confirm failed",
    "scan.page": "Page 1", "scan.fitFrame": "Fit the whole page inside the frame",
    "scan.scanning": "Scanning…", "scan.scanDone": "Scan done",

    "setup.selected": "Selected", "setup.failed": "Setup failed",
    "setup.title": "Set up your shop", "setup.bizName": "Business name",
    "setup.bizPhone": "Business phone", "setup.bizType": "Business type",
    "setup.currency": "Currency", "setup.location": "Location", "setup.continue": "Continue",
    "type.grocery": "Grocery / Mini-market", "type.provision": "Provision store",
    "type.bakery": "Bread & Bakery", "type.butchery": "Butchery / Meat shop",
    "type.fishveg": "Fish & Vegetable stall", "type.drinks": "Drinks depot / Beer parlour",
    "type.restaurant": "Restaurant / Food joint (Chop bar)", "type.phone": "Phone & Accessories",
    "type.electronics": "Electronics & Repairs", "type.cyber": "Cybercafé / Printing",
    "type.salon": "Salon / Barbing", "type.tailor": "Tailor / Fashion / Okrika",
    "type.cosmetics": "Cosmetics & Perfume", "type.pharmacy": "Pharmacy / Chemist",
    "type.hardware": "Hardware / Building materials", "type.stationery": "Stationery & Books",
    "type.coldroom": "Cold room / Frozen foods", "type.farm": "Farm produce / Agro",
    "type.other": "Other",
    "landing.subtitle": "Turn your paper records into a digital business.",
    "landing.desc": "Keep recording the way you always have. Simply scan your record book and we'll help turn it into organised digital records.",
    "landing.getStarted": "Get started", "landing.returning": "Returning user?",
    "login.header": "Sign in to continue", "login.welcome": "Welcome Back",
    "record.title": "How do you record your business today?",
    "record.lede": "This helps us set things up the way you already work.",
    "method.notebook": "Notebook", "method.receipts": "Receipts", "method.spreadsheet": "Spreadsheet",
    "method.recNote": "Recommended.",
    "scanw.title": "How scanning works",
    "scanw.s1": "Take a photo of your page", "scanw.s1d": "Just like a normal photo — lay the notebook flat and snap it.",
    "scanw.s2": "We read the records", "scanw.s2d": "Our AI reads dates, products, quantities and prices from the page.",
    "scanw.s3": "You review and confirm", "scanw.s3d": "Nothing is saved as a business record until you say it's correct.",
    "scanw.gotit": "Got it",
    "perm.title": "Store Helep needs your camera",
    "perm.desc": "We only use your camera when you choose to scan a page. Photos of your records stay on your phone until they're backed up.",
    "perm.allow": "Allow camera", "perm.later": "Not now",
    "camera.gateTitle": "Camera access",
    "camera.gateMsg": "Allow Store Helep to use your camera to scan your record pages.",
    "camera.enable": "Enable camera",
    "camera.unsupported": "Camera isn't supported on this device.",
    "camera.denied": "Camera access is blocked. Enable it in your browser settings.",
    "camera.none": "No camera was found on this device.",
    "camera.error": "We couldn't start the camera. Check permissions or try another browser.",
    "camera.flashUnsupported": "Flash is not supported on this device.",
    "camera.captured": "Page captured",
    "camera.title": "Scanner",
    "camera.reviewTitle": "Review pages",
    "camera.scan": "SCAN",
    "camera.scanNow": "SCAN NOW",
    "camera.retake": "Retake",
    "camera.noPhotos": "No pages captured yet.",
    "biz.title": "Business info", "biz.name": "Business name",     "biz.phone": "Business phone",
    "biz.type": "Business type", "biz.currency": "Currency", "biz.location": "Location",
    "biz.fCFA": "FCFA — Central African Franc", "biz.xaf": "XAF — Central African CFA",
    "biz.saved": "Business info saved", "biz.saveChanges": "Save changes",
    "biz.cannotChange": "Cannot be changed",     "biz.optional": "(optional)",
  },
  fr: {
    "nav.home": "Accueil", "nav.records": "Registres", "nav.scan": "Scanner",
    "nav.products": "Produits", "nav.analytics": "Analytique",
    "menu.language": "Langue", "menu.business": "Infos entreprise",
    "menu.darkmode": "Mode sombre", "menu.terms": "Conditions et politiques", "menu.logout": "Déconnexion",

    "common.cancel": "Annuler", "common.save": "Enregistrer", "common.add": "Ajouter",
    "common.apply": "Appliquer", "common.all": "Tout",
    "common.fillRequired": "Veuillez remplir tous les champs obligatoires",
    "common.loading": "Chargement...",
    "common.units": "unités", "common.items": "articles", "common.products": "produits",
    "common.records": "registres",
    "common.saved": "Enregistré", "common.needsReview": "À vérifier",
    "common.verified": "vérifié", "common.needsReviewLower": "à vérifier",
    "common.unknownItem": "Article inconnu",
    "common.loginFailed": "Échec de la connexion", "common.saveFailed": "Échec de l'enregistrement",

    "dash.todaySales": "Ventes du jour", "dash.quickActions": "Actions rapides",
    "dash.attentionHeader": "Nécessite votre attention", "dash.scanRecords": "Scanner les registres",
    "dash.viewExcel": "Voir en excel", "dash.estProfit": "Profit estimé",
    "dash.productsSold": "Produits vendus", "dash.lowStock": "Stock faible",
    "dash.vsYesterday": "par rapport à hier",
    "dash.transactionsToday": "transactions aujourd'hui",
    "dash.allGood": "Tout va bien",
    "dash.noAlerts": "Aucune alerte de stock pour l'instant",
    "dash.restockSoon": "Réapprovisionnez bientôt pour ne pas perdre de ventes",
    "dash.attentionLow": "{n} produits sont en stock faible",
    "dash.attentionOut": "{n} produits sont en rupture de stock",

    "prod.title": "Produits", "prod.statTotal": "Total produits", "prod.statValue": "Valeur stock",
    "prod.statLow": "Stock faible", "prod.statOut": "Rupture de stock",
    "prod.noProducts": "Aucun produit trouvé.",
    "prod.search": "Rechercher des produits", "prod.noMatch": "Aucun produit ne correspond à votre recherche.",
    "prod.sku": "RÉF", "prod.inStock": "En stock", "prod.lowStock": "Stock faible",
    "prod.outOfStock": "Rupture de stock", "prod.addTitle": "Ajouter un produit",
    "prod.productName": "Nom du produit", "prod.skuLabel": "RÉF (ex. CC-99)",
    "prod.category": "Catégorie", "prod.unitPrice": "Prix unitaire (FCFA)",
    "prod.stockQty": "Quantité en stock", "prod.added": "Produit ajouté",
    "prod.restock": "Réapprovisionner", "prod.edit": "Modifier",
    "prod.restockTitle": "Réapprovisionner", "prod.editTitle": "Modifier le produit",
    "prod.currentStock": "Stock actuel", "prod.currentValue": "Valeur actuelle",
    "prod.addQty": "Quantité à ajouter", "prod.afterRestock": "Après réappro.",
    "prod.newStock": "Nouveau stock", "prod.newValue": "Nouvelle valeur",
    "prod.restocked": "Réapprovisionné", "prod.updated": "Produit modifié",
    "prod.cat.drinks": "Boissons", "prod.cat.groceries": "Épicerie",
    "prod.cat.bakery": "Boulangerie", "prod.cat.household": "Ménage",
    "prod.cat.snacks": "Snacks", "prod.cat.personal": "Soins personnels",
    "prod.cat.other": "Autre",

    "rec.title": "Registres", "rec.today": "Aujourd'hui", "rec.week": "Cette semaine",
    "rec.month": "Ce mois-ci", "rec.custom": "Personnalisé",
    "common.custom": "Personnalisé",
    "rec.noRecords": "Aucun registre trouvé.", "rec.addTitle": "Ajouter un registre manuel",
    "rec.productName": "Nom du produit", "rec.quantity": "Quantité",
    "rec.unitPrice": "Prix unitaire (FCFA)", "rec.added": "Registre ajouté",
    "rec.manual": "Manuel", "rec.scanned": "Scanné",

    "ana.totalSales": "Ventes totales", "ana.numberOfSales": "Nombre de ventes",
    "ana.avgTransaction": "Transaction moyenne", "ana.estProfit": "Profit est.",
    "ana.allProducts": "Tous les produits",
    "ana.mon": "Lun", "ana.tue": "Mar", "ana.wed": "Mer", "ana.thu": "Jeu",
    "ana.fri": "Ven", "ana.sat": "Sam", "ana.sun": "Dim",
    "ana.title": "Analytique", "ana.7days": "7 jours", "ana.30days": "30 jours",
    "ana.best": "Produits les plus vendus", "ana.slow": "Produits les moins vendus",
    "ana.noData": "Aucune donnée", "ana.noSales": "Aucune vente sur cette période.", "ana.up": "en hausse", "ana.down": "en baisse", "ana.steady": "stable",
    "ana.unitsSold": "unités vendues",
    "ana.customRange": "Plage de dates personnalisée", "ana.from": "Du", "ana.to": "Au",

    "scan.title": "Scanner vos registres", "scan.lede": "Prenez une photo nette d'une page de votre livre de ventes.",
    "scan.scanPage": "Scanner une page", "scan.gallery": "Choisir dans la galerie",
    "scan.previous": "Voir les scans précédents",
    "scan.info": "Posez la page sur une surface plate et assurez-vous que l'écriture est visible.",
    "scan.demoPage1": "Page — 15 août 2026", "scan.demoPage2": "Page — 14 août 2026",
    "scan.demoD1": "8 enregistrements · à vérifier", "scan.demoD2": "11 enregistrements · vérifié",
    "scan.previousScans": "Scans précédents", "scan.recentScans": "Scans récents",
    "scan.noScans": "Aucun scan pour l'instant.",
    "history.title": "Scans précédents", "history.empty": "Vous n'avez encore rien scanné.",
    "scan.reviewTitle": "Vérifier les registres extraits",
    "scan.reviewHint": "Confirmez chaque ligne avant qu'elle devienne un registre officiel.",
    "scan.confirm": "Confirmer & enregistrer", "scan.failed": "Échec du scan",
    "scan.saved": "Scan enregistré comme registres", "scan.confirmFailed": "Échec de la confirmation",
    "scan.page": "Page 1", "scan.fitFrame": "Placez toute la page dans le cadre",
    "scan.scanning": "Numérisation…", "scan.scanDone": "Scan terminé",

    "setup.selected": "Sélectionné", "setup.failed": "Échec de la configuration",
    "setup.title": "Configurez votre boutique", "setup.bizName": "Nom de l'entreprise",
    "setup.bizPhone": "Téléphone de l'entreprise", "setup.bizType": "Type d'entreprise",
    "setup.currency": "Devise", "setup.location": "Emplacement", "setup.continue": "Continuer",
    "type.grocery": "Épicerie / Mini-marché", "type.provision": "Magasin de provisions",
    "type.bakery": "Boulangerie", "type.butchery": "Boucherie / Boucherie",
    "type.fishveg": "Poisson & légumes", "type.drinks": "Dépôt de boissons / Buvette",
    "type.restaurant": "Restaurant / Snack (Chop bar)", "type.phone": "Téléphones & accessoires",
    "type.electronics": "Électronique & réparations", "type.cyber": "Cybercafé / Impression",
    "type.salon": "Salon / Coiffure", "type.tailor": "Couturier / Mode / Okrika",
    "type.cosmetics": "Cosmétiques & parfums", "type.pharmacy": "Pharmacie",
    "type.hardware": "Quincaillerie / Matériaux", "type.stationery": "Papeterie & livres",
    "type.coldroom": "Chambre froide / Surgelés", "type.farm": "Produits agricoles / Agro",
    "type.other": "Autre",
    "landing.subtitle": "Transformez vos registres papier en une activité numérique.",
    "landing.desc": "Continuez à enregistrer comme vous l'avez toujours fait. Scannez simplement votre livre de registres et nous l'organiserons en registres numériques.",
    "landing.getStarted": "Commencer", "landing.returning": "Déjà inscrit ?",
    "login.header": "Connectez-vous pour continuer", "login.welcome": "Bon retour",
    "record.title": "Comment enregistrez-vous votre activité aujourd'hui ?",
    "record.lede": "Cela nous aide à configurer les choses comme vous travaillez déjà.",
    "method.notebook": "Carnet", "method.receipts": "Reçus", "method.spreadsheet": "Tableur",
    "method.recNote": "Recommandé — nous vous aiderons à le scanner.",
    "scanw.title": "Comment fonctionne le scan",
    "scanw.s1": "Prenez une photo de votre page", "scanw.s1d": "Comme une photo normale — posez le carnet à plat et cliquez.",
    "scanw.s2": "Nous lisons les registres", "scanw.s2d": "Notre IA lit les dates, produits, quantités et prix de la page.",
    "scanw.s3": "Vous vérifiez et confirmez", "scanw.s3d": "Rien n'est enregistré tant que vous ne confirmez pas.",
    "scanw.gotit": "Compris",
    "perm.title": "Store Helep a besoin de votre caméra",
    "perm.desc": "Nous n'utilisons votre caméra que lorsque vous scannez une page. Les photos de vos registres restent sur votre téléphone jusqu'à la sauvegarde.",
    "perm.allow": "Autoriser la caméra", "perm.later": "Plus tard",
    "camera.gateTitle": "Accès caméra",
    "camera.gateMsg": "Autorisez Store Helep à utiliser votre caméra pour scanner vos pages.",
    "camera.enable": "Activer la caméra",
    "camera.unsupported": "La caméra n'est pas prise en charge sur cet appareil.",
    "camera.denied": "L'accès à la caméra est bloqué. Activez-le dans les paramètres du navigateur.",
    "camera.none": "Aucune caméra trouvée sur cet appareil.",
    "camera.error": "Impossible de démarrer la caméra. Vérifiez les autorisations ou essayez un autre navigateur.",
    "camera.flashUnsupported": "Le flash n'est pas pris en charge sur cet appareil.",
    "camera.captured": "Page capturée",
    "camera.title": "Scanner",
    "camera.reviewTitle": "Vérifier les pages",
    "camera.scan": "SCANNER",
    "camera.scanNow": "SCAN MAINTENANT",
    "camera.retake": "Refaire",
    "camera.noPhotos": "Aucune page capturée pour l'instant.",
    "biz.title": "Infos entreprise", "biz.name": "Nom de l'entreprise",     "biz.phone": "Téléphone de l'entreprise",
    "biz.type": "Type d'entreprise", "biz.currency": "Devise", "biz.location": "Emplacement",
    "biz.fCFA": "FCFA — Franc CFA d'Afrique centrale", "biz.xaf": "XAF — CFA d'Afrique centrale",
    "biz.saved": "Infos entreprise enregistrées", "biz.saveChanges": "Enregistrer les modifications",
    "biz.cannotChange": "Ne peut pas être modifié",     "biz.optional": "(facultatif)",
  },
};

function t(key, vars) {
  const lang = getLang();
  let s = (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
  return s;
}

function applyI18n(lang) {
  const dict = I18N[lang] || I18N.en;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    const text = dict[key];
    if (!text) return;
    const direct = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (direct.length) {
      direct[direct.length - 1].textContent = text;
    } else {
      const kids = [...el.children];
      if (kids.length) kids[kids.length - 1].textContent = text;
      else el.textContent = text;
    }
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    const text = dict[key];
    if (text) el.setAttribute("placeholder", text);
  });
}

function setLanguage(lang) {
  localStorage.setItem("sh_lang", lang);
  document.documentElement.lang = lang === "fr" ? "fr" : "en";
  if (state.token) api("/business", { method: "PATCH", body: { language: lang } }).catch(() => {});
  window.location.reload();
}

const state = {
  get token() {
    return localStorage.getItem("sh_token");
  },
  set token(v) {
    v ? localStorage.setItem("sh_token", v) : localStorage.removeItem("sh_token");
  },
  get business() {
    try {
      return JSON.parse(localStorage.getItem("sh_business") || "null");
    } catch {
      return null;
    }
  },
  set business(b) {
    b ? localStorage.setItem("sh_business", JSON.stringify(b)) : localStorage.removeItem("sh_business");
  },
  get recordMethod() {
    return localStorage.getItem("sh_method") || "Notebook";
  },
  set recordMethod(m) {
    localStorage.setItem("sh_method", m);
  },
};

function getSavedAccounts() {
  try {
    return JSON.parse(localStorage.getItem("sh_accounts") || "[]");
  } catch {
    return [];
  }
}
function saveAccount(account) {
  const accounts = getSavedAccounts();
  const existing = accounts.find((a) => a.phone === account.phone && a.name === account.name);
  if (!existing) accounts.push(account);
  localStorage.setItem("sh_accounts", JSON.stringify(accounts));
}

async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (auth && state.token) headers["Authorization"] = "Bearer " + state.token;
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  const ct = res.headers.get("content-type") || "";
  if (!res.ok) {
    let msg = res.statusText;
    if (ct.includes("application/json")) {
      try {
        msg = (await res.json()).error || msg;
      } catch {}
    }
    throw new Error(msg);
  }
  return ct.includes("application/json") ? res.json() : res;
}

/* ---------------- formatting helpers ---------------- */
const fmt = (n) => Number(n || 0).toLocaleString(locale());
const fcfan = (n) => `FCFA ${fmt(n)}`;
function compactFCFA(n) {
  n = Number(n || 0);
  if (n >= 1e6) return `FCFA ${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `FCFA ${Math.round(n / 1e3)}K`;
  return `FCFA ${n}`;
}
function initials(name) {
  return (name || "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || "")
    .join("")
    .toUpperCase();
}
const stockClass = (s) =>
  ({ in_stock: "green", low_stock: "amber", out_of_stock: "red" }[s] || "gray");
const sourceClass = (s) => (s === "manual" ? "gray" : "blue");
const sourceLabel = (s) => (s === "manual" ? t("rec.manual") : t("rec.scanned"));

function toast(msg, type = "info") {
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.cssText = `position:fixed;left:50%;bottom:90px;transform:translateX(-50%);
    background:${type === "error" ? "#b23b3b" : "#1f3d2b"};color:#fff;padding:10px 16px;
    border-radius:10px;font:500 13px Poppins,sans-serif;z-index:9999;max-width:80%;text-align:center;`;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

document.addEventListener("DOMContentLoaded", () => {
  /* ---- Apply persisted dark mode + language before anything else ---- */
  applyDarkMode(localStorage.getItem("sh_dark") === "1");
  applyI18n(getLang());
  document.documentElement.lang = getLang() === "fr" ? "fr" : "en";

  /* ---- Navigation (data-nav / data-loading) ---- */
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", () => {
      const target = el.getAttribute("data-nav");
      if (el.hasAttribute("data-loading")) {
        goToWithLoading(target);
      } else {
        window.location.href = target;
      }
    });
  });

  /* ---- Forms: submit -> next page (with loading unless data-instant) ---- */
  document.querySelectorAll("form[data-next]").forEach((form) => {
    // Skip forms handled by dedicated API flows below.
    const isApiForm = form.matches(
      'form.login-form[data-next^="dashboard"], form.login-form[data-next^="how-scanning"]'
    );
    if (isApiForm) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (form.hasAttribute("data-instant")) {
        window.location.href = form.getAttribute("data-next");
      } else {
        goToWithLoading(form.getAttribute("data-next"));
      }
    });
  });

  function goToWithLoading(target) {
    const overlay = document.createElement("div");
    overlay.className = "loading-overlay";
    overlay.innerHTML = `<span>${t("common.loading")}</span>`;
    document.body.appendChild(overlay);
    setTimeout(() => {
      window.location.href = target;
    }, 0);
  }

  /* ---- Dashboard loading overlay (only after login / camera permission) ---- */
  const params = new URLSearchParams(window.location.search);
  if (params.has("welcome")) {
    const overlay = document.createElement("div");
    overlay.className = "loading-overlay";
    overlay.innerHTML = `<span>${t("common.loading")}</span>`;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add("hidden"), 1600);
    setTimeout(() => overlay.remove(), 2100);
  }

  /* ---- Log out ---- */
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      state.token = null;
      state.business = null;
      window.location.href = "landing.html";
    });
  }

  /* ---- Hamburger dropdown ---- */
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  if (hamburgerBtn && dropdownMenu) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", (e) => {
      if (!dropdownMenu.contains(e.target)) {
        dropdownMenu.classList.add("hidden");
      }
    });
  }

  /* ---- Dark mode toggle (persisted + synced to backend) ---- */
  const darkModeBtn = document.getElementById("darkModeBtn");
  if (darkModeBtn) {
    darkModeBtn.addEventListener("click", () => {
      applyDarkMode(!document.documentElement.classList.contains("dark"), true);
      dropdownMenu.classList.add("hidden");
    });
  }

  /* ---- Language selection (EN / FR) ---- */
  const languageBtn = document.getElementById("languageBtn");
  if (languageBtn) {
    languageBtn.addEventListener("click", () => {
      openChoiceModal({
        title: "Language / Langue",
        options: [
          { value: "en", label: "English" },
          { value: "fr", label: "Français" },
        ],
        selected: getLang(),
        onSelect: (v) => setLanguage(v),
      });
      dropdownMenu.classList.add("hidden");
    });
  }

  /* ---- Business Info -> settings page ---- */
  const businessInfoBtn = document.getElementById("businessInfoBtn");
  if (businessInfoBtn) {
    businessInfoBtn.addEventListener("click", () => {
      window.location.href = "business-info.html";
    });
  }

  /* ---- Filter chips (visual selection) ---- */
  document.querySelectorAll("[data-chips]").forEach((group) => {
    group.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        group.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
      });
    });
  });

  /* ---- Record method selection ---- */
  const methodList = document.getElementById("methodList");
  if (methodList) {
    methodList.querySelectorAll(".method-card").forEach((card) => {
      card.addEventListener("click", () => {
        methodList.querySelectorAll(".method-card").forEach((c) => {
          c.classList.remove("selected");
          const tag = c.querySelector(".selected-tag");
          if (tag) tag.remove();
        });
        card.classList.add("selected");
        const tag = document.createElement("span");
        tag.className = "selected-tag";
        tag.textContent = t("setup.selected");
        card.appendChild(tag);
        state.recordMethod = card.getAttribute("data-method");
      });
    });
  }

  /* ---- Camera page: flash + shutter counter ---- */
  const flashBtn = document.getElementById("flashBtn");
  if (flashBtn) flashBtn.addEventListener("click", () => flashBtn.classList.toggle("on"));
  const shutterBtn = document.getElementById("shutterBtn");
  const pageCount = document.getElementById("pageCount");
  if (shutterBtn && pageCount) {
    shutterBtn.addEventListener("click", () => {
      let count = parseInt(pageCount.textContent, 10) || 0;
      pageCount.textContent = ++count;
    });
  }

  /* =========================================================
     PAGE-SPECIFIC WIRING
     ========================================================= */
  initPage();
});

/* ---------------- page dispatcher ---------------- */
function initPage() {
  if (document.querySelector('form.login-form[data-next^="dashboard"]')) return initLogin();
  if (document.querySelector('form.login-form[data-next^="how-scanning"]')) return initSetup();
  if (document.querySelector("#methodList")) return; // method handled in listener
  if (document.querySelector(".dash-top")) return initDashboard();
  if (document.getElementById("businessInfoForm")) return initBusinessInfo();
  if (document.querySelector(".products-page")) return initProducts();
  if (document.querySelector(".records-page")) return initRecords();
  if (document.querySelector(".analytics-page")) return initAnalytics();
  if (document.querySelector(".scan-page")) return initScan();
  if (document.querySelector(".history-page")) return loadHistory();
  if (document.querySelector(".cam-view")) return initCamera();
}

/* ---------------- Camera ---------------- */
function initCamera() {
  const viewfinder = document.querySelector(".viewfinder");
  const video = document.getElementById("camVideo");
  const gate = document.getElementById("camGate");
  const enableBtn = document.getElementById("enableCamBtn");
  const shutterBtn = document.getElementById("shutterBtn");
  const flashBtn = document.getElementById("flashBtn");
  const reviewBtn = document.getElementById("reviewBtn");
  const reviewClose = document.getElementById("reviewClose");
  const camReview = document.getElementById("camReview");
  const camView = document.querySelector(".cam-view");
  const thumbGrid = document.getElementById("thumbGrid");
  const scanNowBtn = document.getElementById("scanNowBtn");
  let stream = null;
  let pages = [];
  let retakeIndex = null;
  let torchOn = false;

  function updateReviewBtn() {
    if (!reviewBtn) return;
    reviewBtn.disabled = pages.length === 0;
    reviewBtn.style.opacity = pages.length === 0 ? "0.4" : "1";
  }

  updateReviewBtn();

  function showGateMessage(msg) {
    if (gate) gate.classList.remove("hidden");
    if (viewfinder) viewfinder.classList.remove("live");
    if (video) video.classList.remove("live");
    const p = gate && gate.querySelector("p");
    if (p) p.textContent = msg;
    const b = document.getElementById("enableCamBtn");
    if (b) b.textContent = t("camera.enable");
    const h = gate && gate.querySelector("h2");
    if (h) h.textContent = t("camera.gateTitle");
  }

  async function startCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showGateMessage(t("camera.unsupported"));
      return;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (gate) gate.classList.add("hidden");
      if (viewfinder) viewfinder.classList.add("live");
      if (video) video.classList.add("live");
    } catch (err) {
      const name = err && err.name;
      if (name === "NotAllowedError" || name === "SecurityError") showGateMessage(t("camera.denied"));
      else if (name === "NotFoundError" || name === "OverconstrainedError") showGateMessage(t("camera.none"));
      else showGateMessage(t("camera.error"));
    }
  }

  async function toggleTorch() {
    if (!stream) { startCamera(); return; }
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    const capabilities = track.getCapabilities ? track.getCapabilities() : {};
    if (!capabilities.torch) {
      toast(t("camera.flashUnsupported"), "error");
      return;
    }
    torchOn = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: torchOn }] });
      if (flashBtn) flashBtn.classList.toggle("active", torchOn);
    } catch (e) {
      try {
        await track.applyConstraints({ torch: torchOn });
        if (flashBtn) flashBtn.classList.toggle("active", torchOn);
      } catch (e2) {
        torchOn = !torchOn;
        toast(t("camera.flashUnsupported"), "error");
      }
    }
  }

  if (enableBtn) enableBtn.addEventListener("click", startCamera);
  if (flashBtn) flashBtn.addEventListener("click", toggleTorch);

  if (shutterBtn) {
    shutterBtn.addEventListener("click", () => {
      if (!stream) { startCamera(); return; }
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 720;
      canvas.height = video.videoHeight || 960;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.85);
      const wasRetake = retakeIndex !== null;
      if (retakeIndex !== null) {
        pages[retakeIndex] = data;
        retakeIndex = null;
      } else {
        pages.push(data);
      }
      const pageCount = document.getElementById("pageCount");
      if (pageCount) pageCount.textContent = String(pages.length);
      updateReviewBtn();
      toast(wasRetake ? "Picture retaken" : t("camera.captured"));
      if (wasRetake) {
        showReview(true);
        renderThumbGrid();
      }
    });
  }

  function showReview(on) {
    if (camReview) camReview.hidden = !on;
    if (camView) camView.hidden = on;
    const spacer = document.querySelector(".cam-spacer");
    if (spacer) spacer.style.display = on ? "block" : "none";
    if (on) {
      renderThumbGrid();
      setTimeout(() => camReview.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }
  }

  function renderThumbGrid() {
    if (!thumbGrid) return;
    if (!pages.length) {
      thumbGrid.innerHTML = `<p class="lede">${t("camera.noPhotos")}</p>`;
      return;
    }
    thumbGrid.innerHTML = pages
      .map(
        (src, i) => `<div class="thumb-item">
          <button class="thumb-x" data-i="${i}" aria-label="Remove">✕</button>
          <img src="${src}" alt="page ${i + 1}" />
          <button class="thumb-retake" data-i="${i}">${t("camera.retake")}</button>
        </div>`
      )
      .join("");
  }

  if (reviewBtn) reviewBtn.addEventListener("click", () => showReview(true));
  if (reviewClose) reviewClose.addEventListener("click", () => showReview(false));

  if (thumbGrid) {
    thumbGrid.addEventListener("click", (e) => {
      const img = e.target.closest(".thumb-item img");
      if (img) {
        const overlay = document.getElementById("enlargeOverlay");
        const enlargeImg = document.getElementById("enlargeImg");
        if (overlay && enlargeImg) {
          enlargeImg.src = img.src;
          overlay.style.display = "flex";
        }
        return;
      }
      const x = e.target.closest(".thumb-x");
      const rt = e.target.closest(".thumb-retake");
      if (x) {
        const i = Number(x.dataset.i);
        pages.splice(i, 1);
        renderThumbGrid();
        const pageCount = document.getElementById("pageCount");
        if (pageCount) pageCount.textContent = String(pages.length);
        updateReviewBtn();
      } else if (rt) {
        const i = Number(rt.dataset.i);
        retakeIndex = i;
        showReview(false);
        // Show camera view for retake
        if (camView) camView.hidden = false;
        if (camReview) camReview.hidden = true;
        // Restart camera stream if not active
        if (!stream) startCamera();
      }
    });
  }

  if (scanNowBtn) {
    scanNowBtn.addEventListener("click", async () => {
      if (!pages.length) {
        toast(t("camera.noPhotos"), "error");
        return;
      }
      scanNowBtn.disabled = true;
      const prevText = scanNowBtn.textContent;
      scanNowBtn.textContent = t("scan.scanning");
      try {
        let firstId = null;
        for (const src of pages) {
          const blob = await (await fetch(src)).blob();
          const fd = new FormData();
          fd.append("image", blob, "page.jpg");
          const scan = await api("/scans", { method: "POST", body: fd, auth: false });
          if (!firstId) firstId = scan.id;
        }
        window.location.href = "scan.html?scan=" + encodeURIComponent(firstId);
      } catch (err) {
        scanNowBtn.disabled = false;
        scanNowBtn.textContent = prevText;
        toast(err.message || t("scan.failed"), "error");
      }
    });
  }

  // Check saved camera permission from registration/setup
  const savedCamPerm = localStorage.getItem("sh_camera_permission");

  // Auto-open camera if previously granted; otherwise show gate
  (async () => {
    if (savedCamPerm === "granted" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startCamera();
    } else {
      let state = "prompt";
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const ps = await navigator.permissions.query({ name: "camera" });
          state = ps.state;
        }
      } catch (_) { /* ignore */ }
      if (state === "granted") {
        localStorage.setItem("sh_camera_permission", "granted");
        startCamera();
      } else {
        // Gate remains visible; user must click enable
      }
    }
  })();
}

/* ---------------- Onboarding ---------------- */
function initLogin() {
  // Populate saved accounts dropdown
  const savedSelect = document.getElementById("savedAccount");
  if (savedSelect) {
    const accounts = getSavedAccounts();
    accounts.forEach((a) => {
      const opt = document.createElement("option");
      opt.value = JSON.stringify({ name: a.name, phone: a.phone });
      opt.textContent = `${a.name} (${a.phone})`;
      savedSelect.appendChild(opt);
    });
    savedSelect.addEventListener("change", () => {
      try {
        const val = JSON.parse(savedSelect.value);
        if (val && val.name) document.getElementById("loginName").value = val.name;
        if (val && val.phone) document.getElementById("loginPhone").value = val.phone;
      } catch {}
    });
  }

  const nameInput = document.getElementById("loginName");
  const phoneInput = document.getElementById("loginPhone");

  function showAccountDropdown(anchor) {
    // Remove existing dropdown
    const existing = document.getElementById("savedAccountPopup");
    if (existing) existing.remove();
    const accounts = getSavedAccounts();
    if (!accounts.length) return;
    const popup = document.createElement("div");
    popup.id = "savedAccountPopup";
    popup.style.cssText = "position:absolute;z-index:9999;background:#fff;border:1px solid #ccc;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);max-width:280px;width:100%;margin-top:4px;padding:4px 0;";
    accounts.forEach((a) => {
      const item = document.createElement("button");
      item.type = "button";
      item.style.cssText = "width:100%;text-align:left;padding:8px 12px;background:none;border:none;cursor:pointer;font:inherit;color:#1f3d2b;";
      item.textContent = `${a.name} (${a.phone})`;
      item.addEventListener("click", () => {
        const loginName = document.getElementById("loginName");
        const loginPhone = document.getElementById("loginPhone");
        const bizName = document.getElementById("bizName");
        const bizPhone = document.getElementById("bizPhone");
        if (loginName) loginName.value = a.name;
        if (loginPhone) loginPhone.value = a.phone;
        if (bizName) bizName.value = a.name;
        if (bizPhone) bizPhone.value = a.phone;
        popup.remove();
      });
      item.addEventListener("mouseenter", () => item.style.background = "#f0f4f2");
      item.addEventListener("mouseleave", () => item.style.background = "none");
      popup.appendChild(item);
    });
    // Position near anchor
    const rect = anchor.getBoundingClientRect();
    popup.style.left = rect.left + "px";
    popup.style.top = (rect.bottom + window.scrollY + 4) + "px";
    document.body.appendChild(popup);
    // Close on outside click
    setTimeout(() => {
      document.addEventListener("click", (e) => {
        const loginName = document.getElementById("loginName");
        const loginPhone = document.getElementById("loginPhone");
        const bizName = document.getElementById("bizName");
        const bizPhone = document.getElementById("bizPhone");
        const targets = [loginName, loginPhone, bizName, bizPhone, anchor].filter(Boolean);
        if (!popup.contains(e.target) && !targets.includes(e.target)) popup.remove();
      }, { once: true });
    }, 10);
  }

  [nameInput, phoneInput].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showAccountDropdown(el);
    });
  });

  const form = document.querySelector('form.login-form[data-next^="dashboard"]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("loginName").value.trim();
    const phone = document.getElementById("loginPhone").value.trim();
    try {
      const data = await api("/auth/login", { method: "POST", body: { businessName: name, businessPhone: phone } });
      state.token = data.token;
      state.business = data.business;
      saveAccount({ name, phone, type: data.business?.type || "Grocery / Mini-market" });
      window.location.href = "dashboard.html?welcome=1";
    } catch (err) {
      toast(err.message || t("common.loginFailed"), "error");
    }
  });
}

function initSetup() {
  wireSelectField("bizType", "bizTypeOptions");

  // Populate saved accounts dropdown
  const nameInputSetup = document.getElementById("bizName");
  const phoneInputSetup = document.getElementById("bizPhone");

  [nameInputSetup, phoneInputSetup].forEach((el) => {
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      showAccountDropdown(el);
    });
  });

  const form = document.querySelector('form.login-form[data-next^="how-scanning"]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("bizName").value.trim();
    const phone = document.getElementById("bizPhone").value.trim();
    const type = (document.querySelector("#bizType") || {}).dataset?.value || "Grocery / Mini-market";
    const currency = "FCFA";
    const location = document.getElementById("bizLocation").value.trim();
    try {
      const data = await api("/auth/setup", {
        method: "POST",
        body: { name, phone, type, currency, location, recordMethod: state.recordMethod },
      });
      state.business = data.business;
      saveAccount({ name, phone, type: type || data.business?.type || "Grocery / Mini-market" });
      // Request camera permission during registration if supported
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const ps = await navigator.permissions.query({ name: "camera" });
          localStorage.setItem("sh_camera_permission", ps.state);
        } catch (e) {
          // Ignore permission errors (e.g. not supported by browser)
        }
      }
      window.location.href = "how-scanning-works.html";
    } catch (err) {
      toast(err.message || t("setup.failed"), "error");
    }
  });
}

/* ---------------- Business Info (view/edit) ---------------- */
async function initBusinessInfo() {
  wireSelectField("bizType", "bizTypeOptions");
  // wireSelectField("bizCurrency", "bizCurrencyOptions"); // hardcoded to FCFA

  let biz = state.business;
  if (!biz) {
    try {
      const d = await api("/business");
      biz = d.business;
      state.business = biz;
    } catch {}
  }
  if (biz) {
    const nameEl = document.getElementById("bizName");
    const phoneEl = document.getElementById("bizPhone");
    const locEl = document.getElementById("bizLocation");
    if (nameEl) nameEl.value = biz.name || "";
    if (phoneEl) phoneEl.value = biz.email || "";
    if (locEl) locEl.value = biz.location || "";

    const typeBtn = document.getElementById("bizType");
    if (typeBtn) {
      const span = typeBtn.querySelector("span");
      const match = [...document.querySelectorAll("#bizTypeOptions li")].find(
        (li) => li.getAttribute("data-value") === biz.type
      );
      if (match) {
        span.textContent = match.textContent;
        typeBtn.dataset.value = match.getAttribute("data-value");
        document.querySelectorAll("#bizTypeOptions li").forEach((x) => x.classList.remove("selected"));
        match.classList.add("selected");
      } else if (span) span.textContent = biz.type || t("type.grocery");
    }

    const curBtn = document.getElementById("bizCurrency");
    if (curBtn) {
      const span = curBtn.querySelector("span");
      const match = [...document.querySelectorAll("#bizCurrencyOptions li")].find(
        (li) => li.getAttribute("data-value") === biz.currency
      );
      if (match) {
        span.textContent = match.textContent;
        curBtn.dataset.value = match.getAttribute("data-value");
        document.querySelectorAll("#bizCurrencyOptions li").forEach((x) => x.classList.remove("selected"));
        match.classList.add("selected");
      } else if (span) span.textContent = biz.currency || "FCFA";
    }
  }

  const form = document.getElementById("businessInfoForm");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = document.getElementById("bizName").value.trim();
      const location = document.getElementById("bizLocation").value.trim();
      const type = document.getElementById("bizType").dataset.value || "Grocery / Mini-market";
      const currency = "FCFA";
      try {
        const d = await api("/business", {
          method: "PATCH",
          body: { name, location, type, currency },
        });
        state.business = d.business;
        toast(t("biz.saved"));
        setTimeout(() => (window.location.href = "dashboard.html"), 900);
      } catch (err) {
        toast(err.message || t("common.saveFailed"), "error");
      }
    });
  }
}

/* ---------------- Dashboard ---------------- */
async function initDashboard() {
  try {
    if (!state.business) {
      try {
        const bRes = await api("/business");
        if (bRes && bRes.business) {
          state.business = bRes.business;
        }
      } catch {}
    }

    const biz = document.querySelector(".dash-top .biz");
    if (biz) biz.textContent = state.business ? state.business.name : "My Store";

    const data = await api(`/dashboard?lang=${getLang()}`);
    const set = (sel, val) => {
      const el = document.querySelector(sel);
      if (el) el.textContent = val;
    };
    set(".sales-card .amount", data.salesTodayLabel);
    set(".sales-card .delta", `${data.salesDeltaPct >= 0 ? "+" : ""}${data.salesDeltaPct}% ${t("dash.vsYesterday")}`);
    set(".sales-card .sub", `${data.transactionsToday} ${t("dash.transactionsToday")}`);

    const cards = document.querySelectorAll(".stat-grid .stat-card .value");
    if (cards[0]) cards[0].textContent = data.estimatedProfitLabel;
    if (cards[1]) cards[1].textContent = `${fmt(data.unitsSold)} ${t("common.units")}`;
    if (cards[2]) cards[2].textContent = `${data.lowStockCount} ${t("common.items")}`;

    const dateEl = document.querySelector(".dash-top .date");
    if (dateEl) {
      dateEl.textContent = new Date()
        .toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" })
        .toLowerCase();
    }

    // Attention alerts
    const section = document.querySelector(".dash-section:last-of-type");
    if (section) {
      section.querySelectorAll(".attention-card").forEach((c) => c.remove());
      if (data.attention.length === 0) {
        const ok = document.createElement("div");
        ok.className = "card attention-card";
        ok.innerHTML = `<span class="txt"><b>${t("dash.allGood")}</b><span>${t("dash.noAlerts")}</span></span>`;
        section.appendChild(ok);
      }
      data.attention.forEach((a) => {
        const card = document.createElement("a");
        card.className = "card attention-card";
        card.href = `products.html?filter=${a.type}`;
        const red = a.type === "out_of_stock" ? "red" : "amber";
        const am = (a.message || "").match(/^(\d+)/);
        const an = am ? am[1] : "";
        const msg = a.type === "out_of_stock" ? t("dash.attentionOut", { n: an }) : t("dash.attentionLow", { n: an });
        card.innerHTML = `<span class="icon-box"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg></span>
          <span class="txt"><b>${msg}</b><span>${t("dash.restockSoon")}</span></span>
          <svg class="chev" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>`;
        card.querySelector(".icon-box").classList.add(red);
        section.appendChild(card);
      });
    }

    // Quick action: View as Excel
    const excelBtn = document.querySelector(".quick-btn.excel");
    if (excelBtn) {
      excelBtn.addEventListener("click", () => {
        window.location.href = "/api/export/records/excel";
      });
    }
  } catch (err) {
    console.error("Dashboard load failed", err);
  }
}

/* ---------------- Products ---------------- */
let productSearch = "";

function productCardHtml(p) {
  return `<div class="card product-card" data-id="${p.id}">
    <span class="avatar ${stockClass(p.stockStatus)}">${initials(p.name)}</span>
    <span class="mid"><b>${escapeHtml(p.name)}</b><span>${t("prod.sku")} ${escapeHtml(p.sku)} · ${fcfan(p.unitPrice)}</span></span>
    <span class="right"><b>${fmt(p.stockQty)}</b>
      <span class="badge ${stockClass(p.stockStatus)}">${labelFor(p.stockStatus)}</span>
      <span class="prod-actions">
        <button class="mini-btn" data-action="restock" data-id="${p.id}">${t("prod.restock")}</button>
        <button class="mini-btn ghost" data-action="edit" data-id="${p.id}">${t("prod.edit")}</button>
      </span>
    </span>
  </div>`;
}

function renderProducts() {
  const list = document.querySelector(".products-page .record-list");
  if (!list) return;
  const q = (productSearch || "").trim().toLowerCase();
  const filtered = q
    ? loadedProducts.filter((p) => (p.name || "").toLowerCase().includes(q))
    : loadedProducts;
  list.innerHTML = filtered.length
    ? filtered.map(productCardHtml).join("")
    : `<div class="card"><span class="txt">${
        q ? t("prod.noMatch") : t("prod.noProducts")
      }</span></div>`;
}

async function loadProducts(stockStatus = "all", category = "") {
  const list = document.querySelector(".products-page .record-list");
  if (!list) return;
  const qs = new URLSearchParams();
  if (stockStatus && stockStatus !== "all") qs.set("stockStatus", stockStatus);
  if (category) qs.set("category", category);
  const { products } = await api(`/products?${qs.toString()}`);
  loadedProducts = products;
  renderProducts();
}

async function loadProductStats() {
  const stats = await api("/products/stats");
  const boxes = document.querySelectorAll(".products-page .stat-box .value");
  if (boxes[0]) boxes[0].textContent = fmt(stats.totalProducts);
  if (boxes[1]) boxes[1].textContent = compactFCFA(stats.totalStockValue);
  if (boxes[2]) boxes[2].textContent = fmt(stats.lowStockCount);
  if (boxes[3]) boxes[3].textContent = fmt(stats.outOfStockCount);
}

async function initProducts() {
  try {
    await Promise.all([loadProductStats(), loadProducts()]);
  } catch (err) {
    console.error(err);
  }

  // Deep-link from dashboard "Needs your attention" (e.g. ?filter=low_stock)
  const urlFilter = new URLSearchParams(window.location.search).get("filter");
  if (urlFilter === "low_stock" || urlFilter === "out_of_stock") {
    const chip = [...document.querySelectorAll(".products-page [data-chips] .chip")].find(
      (c) => (c.dataset.value || "") === urlFilter
    );
    if (chip) {
      document
        .querySelectorAll(".products-page [data-chips] .chip")
        .forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      loadProducts(urlFilter).catch(console.error);
    }
  }

  // Chip filtering
  const chips = document.querySelector(".products-page [data-chips]");
  if (chips) {
    chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const val = chip.dataset.value || "all";
      let stockStatus = "all";
      let category = "";
      if (val === "low_stock") stockStatus = "low_stock";
      else if (val === "out_of_stock") stockStatus = "out_of_stock";
      else if (val !== "all") category = val; // Drinks, Groceries, ...
      loadProducts(stockStatus, category).catch(console.error);
    });
  }

  // Live search by name
  const searchInput = document.getElementById("productSearch");
  if (searchInput) {
    searchInput.value = productSearch;
    searchInput.addEventListener("input", () => {
      productSearch = searchInput.value;
      renderProducts();
    });
  }

  // Add product
  const addBtn = document.querySelector(".products-page .add-btn");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      openFormModal({
        title: t("prod.addTitle"),
        submitLabel: t("common.add"),
        fields: [
          { name: "name", label: t("prod.productName"), required: true },
          { name: "sku", label: t("prod.skuLabel"), required: true },
          {
            name: "category",
            label: t("prod.category"),
            type: "select",
            required: true,
            options: [
              { value: "Drinks", label: t("prod.cat.drinks") },
              { value: "Groceries", label: t("prod.cat.groceries") },
              { value: "Bakery", label: t("prod.cat.bakery") },
              { value: "Household", label: t("prod.cat.household") },
              { value: "Snacks", label: t("prod.cat.snacks") },
              { value: "Personal Care", label: t("prod.cat.personal") },
              { value: "Other", label: t("prod.cat.other") },
            ],
          },
          { name: "unitPrice", label: t("prod.unitPrice"), type: "number", required: true },
          { name: "stockQty", label: t("prod.stockQty"), type: "number", value: 0 },
        ],
        onSubmit: async (v) => {
          try {
            await api("/products", {
              method: "POST",
              body: {
                name: v.name,
                sku: v.sku,
                category: v.category,
                unitPrice: v.unitPrice,
                stockQty: v.stockQty,
              },
            });
            toast(t("prod.added"));
            const f = currentProductFilter();
            await Promise.all([loadProductStats(), loadProducts(f.stockStatus, f.category)]);
          } catch (err) {
            toast(err.message || "Add failed", "error");
          }
        },
      });
    });
  }

  // Restock / Edit actions per product
  const plist = document.querySelector(".products-page .record-list");
  if (plist) {
    plist.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.dataset.id;
      const product = loadedProducts.find((p) => String(p.id) === String(id));
      if (!product) return;
      if (btn.dataset.action === "restock") openRestockModal(product);
      else if (btn.dataset.action === "edit") openEditProductModal(product);
    });
  }
}

/* ---------------- Records ---------------- */
async function loadRecords(filter = "today", from = "", to = "") {
  const page = document.querySelector(".records-page");
  if (!page) return;
  const chips = page.querySelector(".chips");
  const qs = new URLSearchParams({ filter });
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const { groups } = await api(`/records?${qs.toString()}`);
  // Replace everything after the chips row.
  let n = chips.nextSibling;
  while (n) {
    const next = n.nextSibling;
    n.remove();
    n = next;
  }
  if (!groups.length) {
    chips.insertAdjacentHTML("afterend", `<p class="lede">${t("rec.noRecords")}</p>`);
    return;
  }
  groups.forEach((g) => {
    // Group items by scan session (batch)
    const batches = {};
    g.items.forEach((r) => {
      const key = r.scanId || "manual_" + r.productName + "_" + r.time;
      if (!batches[key]) batches[key] = { items: [], label: r.scanId ? "Scan batch" : "Manual", total: 0, count: 0 };
      batches[key].items.push(r);
      batches[key].total += Number(r.amount || 0);
      batches[key].count += 1;
    });
    const batchCards = Object.values(batches).map((b) => {
      const label = b.items[0].scanId ? (b.items[0].scanId ? "Scan session" : "Manual") : (b.items[0].source === "scanned" ? "Scanned batch" : "Manual batch");
      return `<div class="card record-batch" onclick="this.nextElementSibling?.classList.toggle('hidden')" style="cursor:pointer">
        <span class="avatar green">${initials(b.items[0].productName)}</span>
        <span class="mid"><b>${label}</b><span>${b.count} items · ${fcfan(b.total)}</span></span>
        <span class="right"><span class="chev">›</span></span>
      </div>
      <div class="batch-detail hidden" style="padding-left:16px;padding-bottom:8px">${b.items.map(
        (r) => `<div class="card record-card" style="margin-top:4px;margin-bottom:4px">
          <span class="avatar ${r.source === "manual" ? "gray" : "green"}">${initials(r.productName)}</span>
          <span class="mid"><b>${escapeHtml(r.productName)} × ${r.quantity}</b><span>${r.time}</span></span>
          <span class="right"><b>${fcfan(r.amount)}</b>
            <span class="badge ${sourceClass(r.source)}">${sourceLabel(r.source)}</span></span>
        </div>`
      ).join("")}</div>`;
    }).join("");
    const html = `<h2 class="day-label">${g.label}</h2>` + batchCards;
    chips.insertAdjacentHTML("afterend", html);
  });
}

async function initRecords() {
  try {
    await loadRecords("today");
  } catch (err) {
    console.error(err);
  }

  // Add manual record button
  const title = document.querySelector(".records-page .page-title");
  if (title && !document.getElementById("addRecordBtn")) {
    const btn = document.createElement("button");
    btn.id = "addRecordBtn";
    btn.className = "add-btn";
    btn.setAttribute("aria-label", "Add record");
    btn.style.cssText = "position:absolute;right:16px;top:18px;";
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;
    title.parentElement.style.position = "relative";
    title.parentElement.appendChild(btn);
    btn.addEventListener("click", () => {
      openFormModal({
        title: t("rec.addTitle"),
        submitLabel: t("common.add"),
        fields: [
          { name: "productName", label: t("rec.productName"), required: true },
          { name: "quantity", label: t("rec.quantity"), type: "number", value: 1, required: true },
          { name: "unitPrice", label: t("rec.unitPrice"), type: "number", required: true },
        ],
        onSubmit: async (v) => {
          try {
            await api("/records", {
              method: "POST",
              body: {
                productName: v.productName,
                quantity: v.quantity,
                unitPrice: v.unitPrice,
              },
            });
            toast(t("rec.added"));
            await loadRecords(currentRecordFilter());
          } catch (err) {
            toast(err.message || "Add failed", "error");
          }
        },
      });
    });
  }

  // Chip filtering
  const chips = document.querySelector(".records-page [data-chips]");
  if (chips) {
    chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const val = chip.dataset.value || "today";
      let filter = "today";
      let from = "";
      let to = "";
      if (val === "this_week") filter = "this_week";
      else if (val === "this_month") filter = "this_month";
      else if (val === "custom") {
        return openDateRangeModal((f, tt) => loadRecords("custom", f, tt).catch(console.error));
      }
      loadRecords(filter, from, to).catch(console.error);
    });
  }
}

function currentRecordFilter() {
  const active = document.querySelector(".records-page [data-chips] .chip.active");
  const val = active ? active.dataset.value : "today";
  if (val === "this_week") return "this_week";
  if (val === "this_month") return "this_month";
  return "today";
}

function currentProductFilter() {
  const active = document.querySelector(".products-page [data-chips] .chip.active");
  const val = active ? active.dataset.value : "all";
  if (val === "low_stock") return { stockStatus: "low_stock", category: "" };
  if (val === "out_of_stock") return { stockStatus: "out_of_stock", category: "" };
  if (val === "all") return { stockStatus: "all", category: "" };
  return { stockStatus: "all", category: val }; // Drinks, Groceries, ...
}

/* ---------------- Analytics ---------------- */
async function loadAnalytics(range = "today", productId = "", from = "", to = "") {
  analyticsProductId = productId || "";
  const page = document.querySelector(".analytics-page");
  if (!page) return;
  const chips = page.querySelector(".chips");
  const qs = new URLSearchParams({ range });
  if (productId) qs.set("productId", productId);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  qs.set("lang", getLang());
  const [d, productsRes] = await Promise.all([
    api(`/analytics?${qs.toString()}`),
    api("/products?stockStatus=all").catch(() => ({ products: [] })),
  ]);

  const maxChart = Math.max(...d.weeklyChart.map((c) => c.value), 1);
  const productName = productId
    ? (productsRes.products.find((p) => String(p.id) === String(productId)) || {}).name
    : "";
  const chartTitle = productName ? escapeHtml(productName) : t("ana.allProducts");
  const chartSVG = buildLineChart(d.weeklyChart, maxChart);

  const best = d.bestSelling
    .map(
      (p) => rankCard(p, "green", p.trendLabel + " " + trendWord(p.trend))
    )
    .join("");
  const slow = d.slowMoving
    .map(
      (p) => rankCard(p, "amber", p.trendLabel + " " + trendWord(p.trend))
    )
    .join("");

  let n = chips.nextSibling;
  while (n) {
    const next = n.nextSibling;
    n.remove();
    n = next;
  }

  chips.insertAdjacentHTML(
    "afterend",
    `<div class="stat-grid-2" style="margin-top:14px;">
      <div class="card stat-box"><div class="label">${t("ana.totalSales")}</div><div class="value">${d.metrics.totalSalesLabel}</div></div>
      <div class="card stat-box"><div class="label">${t("ana.numberOfSales")}</div><div class="value">${fmt(d.metrics.numberOfSales)}</div></div>
      <div class="card stat-box"><div class="label">${t("ana.avgTransaction")}</div><div class="value">${d.metrics.avgTransactionLabel}</div></div>
      <div class="card stat-box"><div class="label">${t("ana.estProfit")}</div><div class="value" style="color:var(--emerald);">${d.metrics.estimatedProfitLabel}</div></div>
    </div>
    <div class="select-product-row">
      <select class="select-product-btn" id="analyticsProduct" aria-label="${t("ana.allProducts")}">
        <option value="">${t("ana.allProducts")}</option>
        ${productsRes.products
          .map((p) => `<option value="${p.id}" ${String(p.id) === String(productId) ? "selected" : ""}>${escapeHtml(p.name)}</option>`)
          .join("")}
      </select>
    </div>
    <div class="card chart-card">
      <div class="chart-head"><b>${chartTitle}</b></div>
      <div class="chart-area">${chartSVG}</div>
      <div class="chart-labels">${d.weeklyChart
        .map((c) => `<span class="${c.day === "Sun" ? "sun" : ""}">${t("ana." + c.day.toLowerCase())}</span>`)
        .join("")}</div>
    </div>
    <h2 class="day-label">${t("ana.best")}</h2>
    ${best || emptyRank()}
    <h2 class="day-label">${t("ana.slow")}</h2>
    ${slow || emptyRank()}`
  );

  const sel = document.getElementById("analyticsProduct");
  if (sel) sel.value = productId || "";
}

function openDateRangeModal(onApply) {
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
  openFormModal({
    title: t("ana.customRange"),
    submitLabel: t("common.apply"),
    fields: [
      { name: "from", label: t("ana.from"), type: "date", value: monthAgo, required: true },
      { name: "to", label: t("ana.to"), type: "date", value: today, required: true },
    ],
    onSubmit: (v) => onApply(v.from, v.to),
  });
}

function rankCard(p, cls, trend) {
  return `<div class="card rank-card">
    <span class="avatar ${cls}">${initials(p.productName)}</span>
    <span class="mid"><b>${escapeHtml(p.productName)}</b><span>${fmt(p.units)} ${t("ana.unitsSold")}</span></span>
    <span class="right"><b>${fcfan(p.revenue)}</b><span class="badge ${cls}">${trend}</span></span>
  </div>`;
}
function emptyRank() {
  return `<div class="card rank-card"><span class="mid"><b>${t("ana.noData")}</b></span></div>`;
}
function trendWord(tr) {
  return { up: t("ana.up"), down: t("ana.down"), steady: t("ana.steady") }[tr] || "";
}

// Build a responsive SVG line+area chart from weekly data (no text -> labels are HTML).
function buildLineChart(weekly, max) {
  const W = 320, H = 150, padX = 12, padTop = 14, padBottom = 10;
  const n = weekly.length;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  if (!n) return "";
  const stepX = n > 1 ? innerW / (n - 1) : 0;
  const hasData = weekly.some((c) => c.value > 0);
  const pts = weekly.map((c, i) => {
    const x = padX + (n > 1 ? i * stepX : innerW / 2);
    const y = padTop + innerH - (c.value / max) * innerH;
    return [x, y];
  });
  const line = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const baseY = (padTop + innerH).toFixed(1);
  const area = `${line} L ${pts[n - 1][0].toFixed(1)} ${baseY} L ${pts[0][0].toFixed(1)} ${baseY} Z`;
  const grid = [0.25, 0.5, 0.75, 1]
    .map((f) => {
      const y = (padTop + innerH - f * innerH).toFixed(1);
      return `<line x1="${padX}" y1="${y}" x2="${W - padX}" y2="${y}" class="grid"/>`;
    })
    .join("");
  if (!hasData) {
    return `<div class="chart-empty">${t("ana.noSales")}</div>`;
  }
  const dots = pts.map((p) => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" class="dot"/>`).join("");
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" class="line-chart">
    <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="var(--emerald)" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="var(--emerald)" stop-opacity="0"/>
    </linearGradient></defs>
    ${grid}
    <path d="${area}" fill="url(#cg)"/>
    <path d="${line}" fill="none" stroke="var(--emerald)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
  </svg>`;
}

async function initAnalytics() {
  const page = document.querySelector(".analytics-page");
  if (page) {
    // Delegated once: survives the chart/select re-render in loadAnalytics.
    page.addEventListener("change", (e) => {
      if (e.target && e.target.id === "analyticsProduct") {
        loadAnalytics(currentAnalyticsRange(), e.target.value).catch(console.error);
      }
    });
  }
  try {
    await loadAnalytics("today");
  } catch (err) {
    console.error(err);
  }
  const chips = document.querySelector(".analytics-page [data-chips]");
  if (chips) {
    chips.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      const val = chip.dataset.value || "today";
      let range = "today";
      if (val === "7d") range = "7d";
      else if (val === "30d") range = "30d";
      else if (val === "custom") {
        return openDateRangeModal((f, tt) =>
          loadAnalytics("custom", analyticsProductId, f, tt).catch(console.error)
        );
      }
      loadAnalytics(range, analyticsProductId).catch(console.error);
    });
  }
}

function currentAnalyticsRange() {
  const active = document.querySelector(".analytics-page [data-chips] .chip.active");
  const val = active ? active.dataset.value : "today";
  if (val === "7d") return "7d";
  if (val === "30d") return "30d";
  return "today";
}

/* ---------------- Scanning ---------------- */
async function loadScans() {
  const page = document.querySelector(".scan-page");
  if (!page) return;
  const heading = page.querySelector("#prevScans");
  if (!heading) return;
  const { scans } = await api("/scans");
  const recent = scans.slice(0, 3);
  let n = heading.nextSibling;
  while (n) {
    const next = n.nextSibling;
    n.remove();
    n = next;
  }
  if (!scans.length) {
    heading.insertAdjacentHTML("afterend", `<p class="lede">${t("scan.noScans")}</p>`);
    return;
  }
  recent.forEach((s) => {
    const date = new Date(s.createdAt).toLocaleDateString(locale(), { day: "numeric", month: "short", year: "numeric" });
    const badge = s.status === "saved" ? "green" : "amber";
    const label = s.status === "saved" ? t("common.saved") : t("common.needsReview");
    heading.insertAdjacentHTML(
      "afterend",
      `<div class="card prev-scan-card">
        <span class="thumb"></span>
        <span class="mid"><b>Page — ${date}</b><span>${s.recordCount} ${t("common.records")} · ${
        s.status === "saved" ? t("common.verified") : t("common.needsReviewLower")
      }</span></span>
        <span class="badge ${badge}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${label}</span>
      </div>`
    );
  });
}

async function loadHistory() {
  const list = document.getElementById("historyList");
  if (!list) return;
  try {
    const { scans } = await api("/scans");
    if (!scans.length) {
      list.innerHTML = `<p class="lede">${t("history.empty")}</p>`;
      return;
    }
    list.innerHTML = scans
      .map((s) => {
        const d = new Date(s.createdAt);
        const day = d.toLocaleDateString(locale(), { day: "numeric" });
        const my = d.toLocaleDateString(locale(), { month: "short", year: "numeric" });
        const badge = s.status === "saved" ? "green" : "amber";
        const label = s.status === "saved" ? t("common.saved") : t("common.needsReview");
        return `<div class="card hist-row">
          <span class="hist-date"><b>${day}</b><span>${my}</span></span>
          <span class="thumb"></span>
          <span class="mid"><b>${s.recordCount} ${t("common.records")}</b><span>${
          s.status === "saved" ? t("common.verified") : t("common.needsReviewLower")
        }</span></span>
          <span class="badge ${badge}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>${label}</span>
        </div>`;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<p class="lede">${t("common.error")}</p>`;
  }
}

function initScan() {
  // Gallery upload + review
  let fileInput = document.getElementById("galleryInput");
  if (!fileInput) {
    fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.id = "galleryInput";
    fileInput.accept = "image/*";
    fileInput.style.display = "none";
    document.body.appendChild(fileInput);
  }

  const galleryBtn = document.querySelector(".scan-actions .scan-action");
  if (galleryBtn) {
    galleryBtn.addEventListener("click", () => fileInput.click());
  }

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("image", file);
    setScanStatus("scanning");
    try {
      const scan = await api("/scans", { method: "POST", body: fd, auth: false });
      setScanStatus("done");
      renderReview(scan);
    } catch (err) {
      setScanStatus("error", err.message || t("scan.failed"));
      toast(err.message || t("scan.failed"), "error");
    }
    fileInput.value = "";
  });

  loadScans().catch(console.error);
}

function setScanStatus(state, msg = "") {
  const el = document.getElementById("scanStatus");
  if (!el) return;
  if (!state) {
    el.hidden = true;
    el.className = "scan-status";
    return;
  }
  el.hidden = false;
  el.className = "scan-status " + state;
  if (state === "scanning") {
    el.innerHTML = `<span class="spinner"></span><span>${t("scan.scanning")}</span>`;
  } else if (state === "done") {
    el.innerHTML = `<span class="check">✓</span><span>${t("scan.scanDone")}</span>`;
  } else if (state === "error") {
    el.innerHTML = `<span class="x">!</span><span>${escapeHtml(msg || t("scan.failed"))}</span>`;
  }
}

function renderReview(scan) {
  let panel = document.getElementById("scanReview");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "scanReview";
    panel.className = "card";
    panel.style.cssText = "margin-top:18px;padding:16px;";
    document.querySelector(".scan-page").appendChild(panel);
  }
  panel.scrollIntoView({ behavior: "smooth" });

  panel.innerHTML = `<h2 class="section-title">${t("scan.reviewTitle")}</h2>
    <p class="lede">${t("scan.reviewHint")}</p>
    <div id="reviewRows"></div>
    <button class="btn btn-primary" id="confirmScanBtn" style="margin-top:12px;">${t("scan.confirm")}</button>`;

  const rowsWrap = panel.querySelector("#reviewRows");
  scan.extracted.forEach((r) => {
    const row = document.createElement("div");
    row.className = "card";
    row.dataset.id = r.id;
    row.style.cssText = "display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px;";
    row.innerHTML = `
      <span class="avatar ${r.productName === "Unknown item" || r.unitPrice === 0 ? "amber" : "green"}">${initials(
      r.productName
    )}</span>
      <input class="input" data-field="productName" value="${escapeHtml(r.productName)}" style="flex:2;" />
      <input class="input" data-field="quantity" type="number" value="${r.quantity}" style="width:60px;" />
      <input class="input" data-field="unitPrice" type="number" value="${r.unitPrice}" style="width:90px;" />`;
    rowsWrap.appendChild(row);
  });

  const confirmBtn = panel.querySelector("#confirmScanBtn");
  confirmBtn.addEventListener("click", async () => {
    if (confirmBtn.disabled) return;
    confirmBtn.disabled = true;
    // Patch each edited row (matched by id) then confirm.
    try {
      for (const r of scan.extracted) {
        const rowEl = rowsWrap.querySelector(`[data-id="${r.id}"]`);
        const get = (f) => rowEl.querySelector(`[data-field="${f}"]`).value;
        const productName = get("productName");
        const quantity = Number(get("quantity"));
        const unitPrice = Number(get("unitPrice"));
        if (productName !== r.productName || quantity !== r.quantity || unitPrice !== r.unitPrice) {
          await api(`/scans/${scan.id}/records/${r.id}`, {
            method: "PATCH",
            body: { productName, quantity, unitPrice },
          });
        }
      }
      await api(`/scans/${scan.id}/confirm`, { method: "POST" });
      toast(t("scan.saved"));
      panel.remove();
      setScanStatus("hidden");
      loadScans().catch(console.error);
    } catch (err) {
      confirmBtn.disabled = false;
      toast(err.message || t("scan.confirmFailed"), "error");
    }
  });
}

/* ---------------- utils ---------------- */
function applyDarkMode(on, sync = false) {
  document.documentElement.classList.toggle("dark", on);
  try {
    localStorage.setItem("sh_dark", on ? "1" : "0");
  } catch {}
  if (sync && state.token) {
    api("/business", { method: "PATCH", body: { darkMode: on } }).catch(() => {});
  }
}

/* Reusable in-page form modal (replaces browser prompt()) */
function fieldHtml(f, i) {
  if (f.type === "select") {
    const opts = (f.options || [])
      .map(
        (o) =>
          `<option value="${escapeHtml(o.value)}" ${
            o.value === f.value ? "selected" : ""
          }>${escapeHtml(o.label)}</option>`
      )
      .join("");
    return `<div class="modal-field"><label>${escapeHtml(f.label)}</label><select class="input" data-field="${i}">${opts}</select></div>`;
  }
  return `<div class="modal-field"><label>${escapeHtml(f.label)}</label><input class="input" data-field="${i}" type="${
    f.type || "text"
  }" value="${escapeHtml(f.value != null ? f.value : "")}" placeholder="${escapeHtml(f.placeholder || "")}" /></div>`;
}

function openFormModal({ title, fields, submitLabel = "Save", onSubmit }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal">
    <h3 class="modal-title">${escapeHtml(title)}</h3>
    <div class="modal-body">${fields.map((f, i) => fieldHtml(f, i)).join("")}</div>
    <div class="modal-actions">
      <button type="button" class="btn link-btn" data-cancel>${t("common.cancel")}</button>
      <button type="button" class="btn btn-primary" data-confirm>${escapeHtml(submitLabel)}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const first = overlay.querySelector("input, select");
  if (first) first.focus();

  const close = () => overlay.remove();
  overlay.querySelector("[data-cancel]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("[data-confirm]").addEventListener("click", () => {
    const values = {};
    let ok = true;
    fields.forEach((f, i) => {
      const el = overlay.querySelector(`[data-field="${i}"]`);
      let val = el.value;
      if (f.type === "number") val = Number(val);
      if (f.required && !String(val).trim()) ok = false;
      values[f.name] = val;
    });
    if (!ok) {
      toast(t("common.fillRequired"), "error");
      return;
    }
    close();
    if (onSubmit) onSubmit(values);
  });
}

function openRestockModal(product) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const currentQty = product.stockQty || 0;
  const unit = product.unitPrice || 0;
  overlay.innerHTML = `<div class="modal">
    <h3 class="modal-title">${escapeHtml(product.name)}</h3>
    <div class="modal-body">
      <div class="restock-info">
        <div><span>${t("prod.currentStock")}</span><b>${fmt(currentQty)}</b></div>
        <div><span>${t("prod.currentValue")}</span><b>${fcfan(currentQty * unit)}</b></div>
      </div>
      <div class="modal-field"><label>${t("prod.addQty")}</label><input class="input" id="restockQty" type="number" min="1" value="1" /></div>
      <div class="restock-info preview">
        <div><span>${t("prod.newStock")}</span><b id="restockNewQty">${fmt(currentQty + 1)}</b></div>
        <div><span>${t("prod.newValue")}</span><b id="restockNewVal">${fcfan(unit * (currentQty + 1))}</b></div>
      </div>
    </div>
    <div class="modal-actions">
      <button type="button" class="btn link-btn" data-cancel>${t("common.cancel")}</button>
      <button type="button" class="btn btn-primary" data-confirm>${t("prod.restock")}</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const qtyInput = overlay.querySelector("#restockQty");
  const newQty = overlay.querySelector("#restockNewQty");
  const newVal = overlay.querySelector("#restockNewVal");
  const recalc = () => {
    const add = Math.max(0, Number(qtyInput.value) || 0);
    newQty.textContent = fmt(currentQty + add);
    newVal.textContent = fcfan(unit * (currentQty + add));
  };
  qtyInput.addEventListener("input", recalc);
  const close = () => overlay.remove();
  overlay.querySelector("[data-cancel]").addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  overlay.querySelector("[data-confirm]").addEventListener("click", async () => {
    const add = Math.max(0, Number(qtyInput.value) || 0);
    if (add <= 0) {
      toast(t("common.fillRequired"), "error");
      return;
    }
    close();
    try {
      await api(`/products/${product.id}/restock`, { method: "POST", body: { addQty: add } });
      toast(t("prod.restocked"));
      const f = currentProductFilter();
      await Promise.all([loadProductStats(), loadProducts(f.stockStatus, f.category)]);
    } catch (err) {
      toast(err.message || "Restock failed", "error");
    }
  });
}

function openEditProductModal(product) {
  openFormModal({
    title: t("prod.editTitle"),
    submitLabel: t("common.save"),
    fields: [
      { name: "name", label: t("prod.productName"), required: true, value: product.name },
      {
        name: "category",
        label: t("prod.category"),
        type: "select",
        required: true,
        value: product.category,
        options: [
          { value: "Drinks", label: t("prod.cat.drinks") },
          { value: "Groceries", label: t("prod.cat.groceries") },
          { value: "Bakery", label: t("prod.cat.bakery") },
          { value: "Household", label: t("prod.cat.household") },
          { value: "Snacks", label: t("prod.cat.snacks") },
          { value: "Personal Care", label: t("prod.cat.personal") },
          { value: "Other", label: t("prod.cat.other") },
        ],
      },
      { name: "unitPrice", label: t("prod.unitPrice"), type: "number", required: true, value: product.unitPrice },
      { name: "stockQty", label: t("prod.stockQty"), type: "number", value: product.stockQty },
    ],
    onSubmit: async (v) => {
      try {
        await api(`/products/${product.id}`, {
          method: "PATCH",
          body: { name: v.name, category: v.category, unitPrice: v.unitPrice, stockQty: v.stockQty },
        });
        toast(t("prod.updated"));
        const f = currentProductFilter();
        await Promise.all([loadProductStats(), loadProducts(f.stockStatus, f.category)]);
      } catch (err) {
        toast(err.message || "Update failed", "error");
      }
    },
  });
}

function openChoiceModal({ title, options, selected, onSelect }) {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.innerHTML = `<div class="modal">
    <h3 class="modal-title">${escapeHtml(title)}</h3>
    <div class="modal-body">
      ${options
        .map(
          (o) =>
            `<button type="button" class="select-field" data-value="${o.value}" style="${
              o.value === selected ? "border-color:var(--emerald);color:var(--emerald);" : ""
            }">${escapeHtml(o.label)}</button>`
        )
        .join("")}
    </div>
    <div class="modal-actions"><button type="button" class="btn link-btn" data-cancel>${t("common.cancel")}</button></div>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-cancel]").addEventListener("click", () => overlay.remove());
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  overlay.querySelectorAll("[data-value]").forEach((b) => {
    b.addEventListener("click", () => {
      const val = b.getAttribute("data-value");
      overlay.remove();
      if (onSelect) onSelect(val);
    });
  });
}

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function labelFor(status) {
  return (
    {
      in_stock: t("prod.inStock"),
      low_stock: t("prod.lowStock"),
      out_of_stock: t("prod.outOfStock"),
    }[status] || status
  );
}

/* Dropdown select-field (used for business type on setup) */
function wireSelectField(buttonId, optionsId) {
  const btn = document.getElementById(buttonId);
  const list = document.getElementById(optionsId);
  if (!btn || !list) return;
  const span = btn.querySelector("span");
  const pre = list.querySelector("li.selected");
  if (pre) {
    btn.dataset.value = pre.getAttribute("data-value");
    span.textContent = pre.textContent;
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const willOpen = list.hasAttribute("hidden");
    document.querySelectorAll(".option-list").forEach((l) => l.setAttribute("hidden", ""));
    document.querySelectorAll(".select-field").forEach((b) => b.setAttribute("aria-expanded", "false"));
    if (willOpen) {
      list.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
    }
  });

  list.querySelectorAll("li").forEach((li) => {
    li.addEventListener("click", (e) => {
      e.stopPropagation();
      span.textContent = li.textContent;
      btn.dataset.value = li.getAttribute("data-value");
      list.querySelectorAll("li").forEach((x) => x.classList.remove("selected"));
      li.classList.add("selected");
      list.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
    });
  });

  document.addEventListener("click", () => {
    list.setAttribute("hidden", "");
    btn.setAttribute("aria-expanded", "false");
  });
}
