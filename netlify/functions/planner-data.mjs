import { getStore } from "@netlify/blobs";

const KEY = "planner-data.json";
const DEFAULT_NAMES = ["Anne", "Anne (V)", "Roos", "Annemarth", "Chantal", "Danny", "Donna", "Elisha", "Esmee", "Ingrid", "Jacqueline", "Julie", "Katinka", "Kitty", "Lisa", "Mariska", "Mascha", "Nadine", "Nanda", "Nathalie", "Nova", "Rebecca", "Sascha", "Suzanne", "Willemijn", "Winnifred", "Bianca", "Laura", "Maris", "Saskia"];

function response(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "no-store, max-age=0",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type"
    }
  });
}

function sortNames(arr) {
  return [...arr].filter(Boolean).map(String).sort((a, b) => a.localeCompare(b, "nl", { sensitivity: "base" }));
}

function cleanKey(s) {
  return String(s).replace(/[.#$/\[\]]/g, "_");
}

function emptyData() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    years: {}
  };
}

function ensureYear(data, year) {
  const y = String(year || new Date().getFullYear());
  if (!data.years || typeof data.years !== "object") data.years = {};
  if (!data.years[y] || typeof data.years[y] !== "object") {
    data.years[y] = { people: sortNames(DEFAULT_NAMES), marked: {} };
  }
  if (!Array.isArray(data.years[y].people)) data.years[y].people = sortNames(DEFAULT_NAMES);
  if (!data.years[y].marked || typeof data.years[y].marked !== "object") data.years[y].marked = {};
  data.years[y].people = sortNames(data.years[y].people);
  return data.years[y];
}

async function loadData(store) {
  let data = null;
  try {
    data = await store.get(KEY, { type: "json", consistency: "strong" });
  } catch (error) {
    console.error("Kon planner-data niet lezen:", error);
  }
  if (!data || typeof data !== "object") data = emptyData();
  if (!data.years || typeof data.years !== "object") data.years = {};
  return data;
}

async function saveData(store, data) {
  data.updatedAt = new Date().toISOString();
  await store.setJSON(KEY, data);
  return data;
}

export default async (req) => {
  if (req.method === "OPTIONS") return response({ ok: true });

  const store = getStore({ name: "vakantieplanner", consistency: "strong" });
  const url = new URL(req.url);
  const requestedYear = Number(url.searchParams.get("year")) || new Date().getFullYear();

  try {
    let data = await loadData(store);

    if (req.method === "GET") {
      const yearData = ensureYear(data, requestedYear);
      await saveData(store, data);
      return response({ ok: true, year: requestedYear, yearData, updatedAt: data.updatedAt });
    }

    if (req.method !== "POST") {
      return response({ ok: false, error: "Method not allowed" }, 405);
    }

    const body = await req.json().catch(() => ({}));
    const year = Number(body.year) || requestedYear;
    const yearData = ensureYear(data, year);
    const action = body.action;

    if (action === "toggle") {
      const key = String(body.key || "");
      if (!key) return response({ ok: false, error: "Geen cel-key ontvangen" }, 400);
      if (yearData.marked[key]) delete yearData.marked[key];
      else yearData.marked[key] = true;
    } else if (action === "addName") {
      const name = String(body.name || "").trim();
      if (!name) return response({ ok: false, error: "Geen naam ontvangen" }, 400);
      const exists = yearData.people.some(p => p.toLowerCase() === name.toLowerCase());
      if (!exists) yearData.people = sortNames([...yearData.people, name]);
    } else if (action === "removeName") {
      const name = String(body.name || "").trim();
      if (!name) return response({ ok: false, error: "Geen naam ontvangen" }, 400);
      yearData.people = sortNames(yearData.people.filter(p => p !== name));
      const prefix = cleanKey(name) + "_";
      for (const key of Object.keys(yearData.marked)) {
        if (key.startsWith(prefix)) delete yearData.marked[key];
      }
    } else if (action === "replaceYear") {
      const incoming = body.yearData;
      if (!incoming || typeof incoming !== "object") return response({ ok: false, error: "Geen geldige jaar-data ontvangen" }, 400);
      data.years[String(year)] = {
        people: sortNames(Array.isArray(incoming.people) ? incoming.people : DEFAULT_NAMES),
        marked: incoming.marked && typeof incoming.marked === "object" ? incoming.marked : {}
      };
    } else if (action === "replaceAll") {
      const incoming = body.data;
      if (!incoming || typeof incoming !== "object") return response({ ok: false, error: "Geen geldige backup-data ontvangen" }, 400);
      data = incoming;
      if (!data.version) data.version = 1;
      if (!data.createdAt) data.createdAt = new Date().toISOString();
      if (!data.years || typeof data.years !== "object") data.years = {};
      ensureYear(data, year);
    } else {
      return response({ ok: false, error: "Onbekende actie" }, 400);
    }

    ensureYear(data, year);
    await saveData(store, data);
    return response({ ok: true, year, yearData: data.years[String(year)], updatedAt: data.updatedAt, data });
  } catch (error) {
    console.error(error);
    return response({ ok: false, error: error.message || "Onbekende serverfout" }, 500);
  }
};
