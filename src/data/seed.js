import { db, nextId } from "./store.js";
import { config } from "../config/index.js";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n, hour = 9, minute = 0) {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, minute, 0, 0);
  return d;
}

const CATEGORIES = [
  "Drinks",
  "Groceries",
  "Bakery",
  "Household",
  "Snacks",
  "Personal Care",
];

function categoryFor(i) {
  return CATEGORIES[i % CATEGORIES.length];
}

const NAMED_PRODUCTS = [
  { sku: "CC-50", name: "Coca-Cola 50Cl", category: "Drinks", unitPrice: 500, stockQty: 34 },
  { sku: "PM-01", name: "Peak Milk Tin", category: "Groceries", unitPrice: 900, stockQty: 4 },
  { sku: "MG-12", name: "Maggi Cube Pack", category: "Groceries", unitPrice: 1200, stockQty: 0 },
  { sku: "RB-25", name: "Rice bag 25kg", category: "Groceries", unitPrice: 16000, stockQty: 18 },
  { sku: "BS-10", name: "Blue Band Sachet", category: "Bakery", unitPrice: 300, stockQty: 22 },
  { sku: "CB-05", name: "Candle Box", category: "Household", unitPrice: 750, stockQty: 3 },
];

const GENERIC = [
  "Pure Water 1.5L", "Fanta Orange", "Sprite 50Cl", "Bread Toast", "Sugar 1kg",
  "Salt 500g", "Tomato Paste", "Oil 1L", "Soap Daia", "Toothpaste",
  "Biscuit Civet", "Chocolate Bar", "Juice Vitalo", "Tea Lipton", "Coffee Nescafe",
  "Millet Flour", "Cassava Flour", "Beans 1kg", "Onions 1kg", "Pepper 500g",
  "Indomie Pack", "Golden Morn", "Cornflakes", "Milo Sachet", "Bournvita",
  "Detergent", "Disposable Cup", "Plastic Plate", "Sponge", "Broom",
];

function seedBusiness() {
  db.business = {
    id: nextId("biz"),
    name: "Mama General Store",
    email: "mamageneral@store.com",
    type: "Grocery / Mini-market",
    currency: config.currency.code,
    location: "Molyko, Buea",
    recordMethod: "Notebook",
    createdAt: daysAgo(40),
  };
  db.settings.language = "en";
  db.settings.darkMode = false;
}

function seedProducts() {
  for (const p of NAMED_PRODUCTS) {
    db.products.push({
      id: nextId("prod"),
      sku: p.sku,
      name: p.name,
      category: p.category,
      unitPrice: p.unitPrice,
      stockQty: p.stockQty,
    });
  }

  // Generator to reach ~150 products (demonstrates 150+ catalog scalability).
  let idx = 1;
  while (db.products.length < 150) {
    const base = GENERIC[idx % GENERIC.length];
    const cat = categoryFor(db.products.length);
    const price = 150 + ((db.products.length * 37) % 18) * 100;
    const stock = db.products.length % 11; // spread across in/low/out
    db.products.push({
      id: nextId("prod"),
      sku: `GN-${String(db.products.length).padStart(3, "0")}`,
      name: `${base} ${idx}`,
      category: cat,
      unitPrice: price,
      stockQty: stock,
    });
    idx++;
  }
}

function addRecord({ productId, productName, quantity, unitPrice, timestamp, source, status }) {
  const amount = quantity * unitPrice;
  db.records.push({
    id: nextId("rec"),
    productId: productId || null,
    productName,
    quantity,
    unitPrice,
    amount,
    timestamp,
    source, // 'scanned' | 'manual'
    status, // 'saved' | 'needs_review'
    scanId: null,
  });
}

function seedRecords() {
  const coca = db.products.find((p) => p.sku === "CC-50");
  const rice = db.products.find((p) => p.sku === "RB-25");
  const blue = db.products.find((p) => p.sku === "BS-10");

  // Today
  for (let i = 0; i < 5; i++) {
    addRecord({
      productId: coca.id, productName: coca.name, quantity: 5,
      unitPrice: coca.unitPrice, timestamp: daysAgo(0, 9 + i, 14),
      source: "scanned", status: "saved",
    });
  }
  addRecord({
    productId: rice.id, productName: rice.name, quantity: 1,
    unitPrice: rice.unitPrice, timestamp: daysAgo(0, 8, 52),
    source: "manual", status: "saved",
  });

  // Yesterday
  addRecord({
    productId: blue.id, productName: blue.name, quantity: 12,
    unitPrice: blue.unitPrice, timestamp: daysAgo(1, 16, 20),
    source: "scanned", status: "saved",
  });
  for (let i = 0; i < 3; i++) {
    addRecord({
      productId: coca.id, productName: coca.name, quantity: 3,
      unitPrice: coca.unitPrice, timestamp: daysAgo(1, 11 + i, 5),
      source: "scanned", status: "saved",
    });
  }

  // Earlier this week / month — spread to give analytics meaningful volume.
  for (let d = 2; d <= 29; d++) {
    const n = (d % 4) + 1;
    for (let i = 0; i < n; i++) {
      const prod = db.products[(d * 7 + i * 3) % db.products.length];
      addRecord({
        productId: prod.id, productName: prod.name, quantity: (i % 3) + 1,
        unitPrice: prod.unitPrice, timestamp: daysAgo(d, 10 + i, 10),
        source: d % 5 === 0 ? "manual" : "scanned",
        status: d % 9 === 0 ? "needs_review" : "saved",
      });
    }
  }
}

function seedScans() {
  // A saved scan (already confirmed)
  const coca = db.products.find((p) => p.sku === "CC-50");
  const savedScan = {
    id: nextId("scan"),
    fileName: "page-14-aug.jpg",
    createdAt: daysAgo(13, 10, 0),
    status: "saved",
    recordCount: 2,
    extracted: [
      { productName: coca.name, quantity: 5, unitPrice: coca.unitPrice, date: daysAgo(13, 9, 0), confidence: 0.94 },
      { productName: "Fanta Orange", quantity: 3, unitPrice: 450, date: daysAgo(13, 9, 5), confidence: 0.88 },
    ],
  };
  db.scans.push(savedScan);

  // A scan awaiting review (needs_review)
  const peak = db.products.find((p) => p.sku === "PM-01");
  const reviewScan = {
    id: nextId("scan"),
    fileName: "page-15-aug.jpg",
    createdAt: daysAgo(12, 14, 0),
    status: "needs_review",
    recordCount: 8,
    extracted: [
      { productName: peak.name, quantity: 2, unitPrice: peak.unitPrice, date: daysAgo(12, 13, 0), confidence: 0.91 },
      { productName: "Unknown item", quantity: 1, unitPrice: 0, date: daysAgo(12, 13, 10), confidence: 0.42 },
      { productName: "Rice bag 25kg", quantity: 1, unitPrice: 16000, date: daysAgo(12, 13, 20), confidence: 0.97 },
    ],
  };
  db.scans.push(reviewScan);
}

export function seed() {
  seedBusiness();
  seedProducts();
  seedRecords();
  seedScans();
}
