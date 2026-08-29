let counters = {};

export function nextId(prefix) {
  counters[prefix] = (counters[prefix] || 0) + 1;
  return `${prefix}_${counters[prefix].toString().padStart(5, "0")}`;
}

export const db = {
  business: null,
  products: [],
  records: [],
  scans: [],
  settings: {
    language: "en",
    darkMode: false,
  },
};

export function resetStore() {
  counters = {};
  db.business = null;
  db.products = [];
  db.records = [];
  db.scans = [];
  db.settings = { language: "en", darkMode: false };
}
