/**
 * mandiPrice.js
 * Utility module to fetch mandi (agricultural market) prices
 * from the data.gov.in Agmarknet API.
 *
 * Usage:
 *   import { fetchMandiPrices, getMyLocationPrices } from './mandiPrice.js';
 *
 *   const result = await fetchMandiPrices({ state: 'Rajasthan', district: 'Kota', commodity: 'Wheat' });
 *   console.log(result.records);        // all records
 *   console.log(result.todayRecords);   // only today's records
 *   console.log(result.summary);        // { min, max, avgModal, count }
 */

const CONFIG = {
    apiKey: process.env.MANDI_API_KEY,
    baseURL: "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
    geocodeURL: "https://nominatim.openstreetmap.org/reverse",
    defaultLimit: 10,
};


function getTodayString() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getFullYear()}`;
}

function buildURL(filters = {}) {
    const url = new URL(CONFIG.baseURL);

    url.searchParams.set("api-key", CONFIG.apiKey);
    url.searchParams.set("format", "json");
    url.searchParams.set("offset", String(filters.offset ?? 0));
    url.searchParams.set("limit", String(filters.limit ?? CONFIG.defaultLimit));

    const fieldMap = {
        state: "filters[state.keyword]",
        district: "filters[district]",
        commodity: "filters[commodity]",
        market: "filters[market]",
        variety: "filters[variety]",
        grade: "filters[grade]",
    };

    for (const [key, param] of Object.entries(fieldMap)) {
        const val = filters[key];
        if (val && String(val).trim()) {
            url.searchParams.set(param, String(val).trim());
        }
    }

    return url.toString();
}

function computeSummary(records) {
    if (!records.length) return { min: null, max: null, avgModal: null, count: 0 };

    const toNum = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? null : n;
    };

    const mins = records.map(r => toNum(r.min_price)).filter(n => n !== null);
    const maxs = records.map(r => toNum(r.max_price)).filter(n => n !== null);
    const modals = records.map(r => toNum(r.modal_price)).filter(n => n !== null);

    return {
        min: mins.length ? Math.min(...mins) : null,
        max: maxs.length ? Math.max(...maxs) : null,
        avgModal: modals.length ? Math.round(modals.reduce((a, b) => a + b, 0) / modals.length) : null,
        count: records.length,
    };
}

function cleanDistrict(raw = "") {
    return raw.replace(/\s*district\s*/i, "").trim();
}


async function fetchMandiPrices(filters = {}) {
    const url = buildURL(filters);
    const today = getTodayString();

    let records = [], total = 0;

    try {
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`API responded with HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        records = Array.isArray(data.records) ? data.records : [];
        total = parseInt(data.total, 10) || records.length;

    } catch (err) {
        return {
            success: false,
            records: [],
            todayRecords: [],
            displayRecords: [],
            isToday: false,
            today,
            summary: computeSummary([]),
            total: 0,
            error: err.message,
        };
    }

    const todayRecords = records.filter(r => r.arrival_date === today);
    const isToday = todayRecords.length > 0;
    const displayRecords = isToday ? todayRecords : records;

    return {
        success: true,
        records,
        todayRecords,
        displayRecords,
        isToday,
        today,
        summary: computeSummary(displayRecords),
        total,
        error: null,
    };
}

async function detectLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve({ success: false, error: "Geolocation is not supported by this browser." });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async ({ coords }) => {
                const { latitude: lat, longitude: lon } = coords;

                try {
                    const res = await fetch(
                        `${CONFIG.geocodeURL}?lat=${lat}&lon=${lon}&format=json`,
                        { headers: { "Accept-Language": "en" } }
                    );
                    const data = await res.json();
                    const addr = data.address || {};

                    const district = cleanDistrict(
                        addr.county || addr.state_district || addr.district || ""
                    );
                    const state = addr.state || "";

                    resolve({ success: true, state, district, lat, lon, error: null });

                } catch (err) {
                    resolve({ success: false, error: `Reverse geocoding failed: ${err.message}` });
                }
            },
            (err) => {
                resolve({ success: false, error: `GPS error: ${err.message}` });
            }
        );
    });
}

async function getMyLocationPrices(commodity, extraFilters = {}) {
    const location = await detectLocation();

    if (!location.success) {
        return {
            success: false,
            records: [],
            todayRecords: [],
            displayRecords: [],
            isToday: false,
            today: getTodayString(),
            summary: computeSummary([]),
            total: 0,
            error: location.error,
            location: null,
        };
    }

    const result = await fetchMandiPrices({
        state: location.state,
        district: location.district,
        commodity,
        ...extraFilters,
    });

    return {
        ...result,
        location: {
            state: location.state,
            district: location.district,
            lat: location.lat,
            lon: location.lon,
        },
    };
}

async function fetchAllPages(filters = {}, maxPages = 5) {
    const pageSize = filters.limit ?? CONFIG.defaultLimit;
    const today = getTodayString();
    let allRecords = [];
    let page = 0;
    let lastError = null;

    while (page < maxPages) {
        const result = await fetchMandiPrices({ ...filters, offset: page * pageSize });

        if (!result.success) {
            lastError = result.error;
            break;
        }

        allRecords = allRecords.concat(result.records);

        if (result.records.length < pageSize) break; // last page
        page++;
    }

    const todayRecords = allRecords.filter(r => r.arrival_date === today);
    const isToday = todayRecords.length > 0;
    const displayRecords = isToday ? todayRecords : allRecords;

    return {
        success: lastError === null || allRecords.length > 0,
        records: allRecords,
        todayRecords,
        displayRecords,
        isToday,
        today,
        summary: computeSummary(displayRecords),
        pages: page + 1,
        error: lastError,
    };
}


export {
    fetchMandiPrices,
    detectLocation,
    getMyLocationPrices,
    fetchAllPages,
    buildURL,
    getTodayString,
    computeSummary,
};