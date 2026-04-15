// ─────────────────────────────────────────────────────────────────────────────  
// mongobet.js — Single-file MongoBet Gaming Catalogue UI  
// Run:  node mongobet.js  
// Then: http://localhost:3000  
// ─────────────────────────────────────────────────────────────────────────────  
  
const express = require("express");  
const { MongoClient } = require("mongodb");  
  
const app = express();  
const PORT = process.env.PORT || 3000;  
const MONGO_URI = "" 
const DB_NAME = "gaming_catalogue";  
const COLLECTION = "games";  
  
let db, collection;  
  
// ─── MongoDB Connection ──────────────────────────────────────────────────────  
  
async function connectDB() {  
  const client = new MongoClient(MONGO_URI);  
  await client.connect();  
  db = client.db(DB_NAME);  
  collection = db.collection(COLLECTION);  
  console.log(`✅ Connected to MongoDB — ${DB_NAME}.${COLLECTION}`);  
}  
  
// ─── API Routes ──────────────────────────────────────────────────────────────  
  
// GET /api/games — browse/filter games  
app.get("/api/games", async (req, res) => {  
  try {  
    const {  
      page = 1,  
      limit = 24,  
      category,  
      subcategory,  
      provider,  
      volatility,  
      status = "active",  
      sort = "popularity",  
      tag,  
      jurisdiction,  
      featured,  
      isNew,  
    } = req.query;  
  
    const skip = (parseInt(page) - 1) * parseInt(limit);  
    const filter = {};  
  
    if (status) filter.status = status;  
    if (category) filter.category = category;  
    if (subcategory) filter.subcategory = subcategory;  
    if (provider) filter.provider = provider;  
    if (volatility) filter.volatility = volatility;  
    if (tag) filter.tags = tag;  
    if (jurisdiction) filter.jurisdictions = jurisdiction;  
    if (featured === "true") filter.is_featured = true;  
    if (isNew === "true") filter.is_new = true;  
  
    const sortOptions = {  
      popularity: { popularity_score: -1 },  
      rating: { "player_rating.average": -1 },  
      newest: { release_date: -1 },  
      name_asc: { name: 1 },  
      name_desc: { name: -1 },  
    };  
  
    const sortBy = sortOptions[sort] || sortOptions.popularity;  
  
    const [games, total] = await Promise.all([  
      collection.find(filter).sort(sortBy).skip(skip).limit(parseInt(limit)).toArray(),  
      collection.countDocuments(filter),  
    ]);  
  
    res.json({  
      games,  
      pagination: {  
        page: parseInt(page),  
        limit: parseInt(limit),  
        total,  
        pages: Math.ceil(total / parseInt(limit)),  
      },  
    });  
  } catch (err) {  
    console.error("Error fetching games:", err);  
    res.status(500).json({ error: "Failed to fetch games" });  
  }  
});  
  
// GET /api/games/autocomplete — Atlas Search autocomplete (typeahead)  
app.get("/api/games/autocomplete", async (req, res) => {  
  try {  
    const { q } = req.query;  
  
    if (!q || q.trim().length < 2) {  
      return res.json({ suggestions: [] });  
    }  
  
    const pipeline = [  
      {  
        $search: {  
          index: "games_autocomplete",  
          compound: {  
            should: [  
              {  
                autocomplete: {  
                  query: q,  
                  path: "name",  
                  fuzzy: { maxEdits: 1, prefixLength: 2 },  
                  score: { boost: { value: 5 } },  
                },  
              },  
              {  
                autocomplete: {  
                  query: q,  
                  path: "provider",  
                  fuzzy: { maxEdits: 1, prefixLength: 2 },  
                  score: { boost: { value: 3 } },  
                },  
              },  
              {  
                autocomplete: {  
                  query: q,  
                  path: "theme",  
                  fuzzy: { maxEdits: 1, prefixLength: 2 },  
                },  
              },  
            ],  
            minimumShouldMatch: 1,  
          },  
        },  
      },  
      { $limit: 8 },  
      {  
        $project: {  
          name: 1,  
          slug: 1,  
          category: 1,  
          provider: 1,  
          theme: 1,  
          "player_rating.average": 1,  
          is_new: 1,  
          score: { $meta: "searchScore" },  
        },  
      },  
    ];  
  
    const suggestions = await collection.aggregate(pipeline).toArray();  
    res.json({ suggestions });  
  } catch (err) {  
    console.error("Autocomplete error:", err);  
    // Fallback to regex  
    try {  
      const { q } = req.query;  
      const regex = new RegExp(q, "i");  
      const suggestions = await collection  
        .find({ status: "active", $or: [{ name: regex }, { provider: regex }] })  
        .sort({ popularity_score: -1 })  
        .limit(8)  
        .project({ name: 1, slug: 1, category: 1, provider: 1, theme: 1, "player_rating.average": 1, is_new: 1 })  
        .toArray();  
      res.json({ suggestions, _fallback: true });  
    } catch (fbErr) {  
      res.json({ suggestions: [] });  
    }  
  }  
});  
  
// GET /api/games/search — Atlas Search full-text (on Enter)  
app.get("/api/games/search", async (req, res) => {  
  try {  
    const {  
      q,  
      page = 1,  
      limit = 24,  
      category,  
      provider,  
    } = req.query;  
  
    if (!q || q.trim().length === 0) {  
      return res.json({ games: [], pagination: { page: 1, limit: 24, total: 0, pages: 0 } });  
    }  
  
    const must = [];  
    const filter = [];  
  
    must.push({  
      text: {  
        query: q,  
        path: ["name", "description", "short_description", "theme"],  
        fuzzy: { maxEdits: 1, prefixLength: 2 },  
      },  
    });  
  
    if (category) {  
      filter.push({  
        queryString: {  
          defaultPath: "category",  
          query: category,  
        },  
      });  
    }  
  
    if (provider) {  
      filter.push({  
        text: {  
          query: provider,  
          path: "provider",  
        },  
      });  
    }  
  
    const searchStage = {  
      $search: {  
        index: "games_search",  
        compound: {  
          must,  
          filter,  
        },  
        highlight: {  
          path: ["name", "description"],  
        },  
      },  
    };  
  
    const pipeline = [  
      searchStage,  
      {  
        $addFields: {  
          search_score: { $meta: "searchScore" },  
          highlights: { $meta: "searchHighlights" },  
        },  
      },  
      {  
        $facet: {  
          results: [  
            { $skip: (parseInt(page) - 1) * parseInt(limit) },  
            { $limit: parseInt(limit) },  
          ],  
          total: [{ $count: "count" }],  
        },  
      },  
    ];  
  
    const [result] = await collection.aggregate(pipeline).toArray();  
    const games = result.results || [];  
    const total = result.total[0]?.count || 0;  
  
    res.json({  
      games,  
      pagination: {  
        page: parseInt(page),  
        limit: parseInt(limit),  
        total,  
        pages: Math.ceil(total / parseInt(limit)),  
      },  
    });  
  } catch (err) {  
    console.error("Search error:", err);  
    console.log("⚠️  Falling back to regex search...");  
    try {  
      const { q, page = 1, limit = 24 } = req.query;  
      const regex = new RegExp(q, "i");  
      const regexFilter = {  
        status: "active",  
        $or: [  
          { name: regex },  
          { description: regex },  
          { provider: regex },  
          { theme: regex },  
          { tags: regex },  
        ],  
      };  
  
      const [games, total] = await Promise.all([  
        collection.find(regexFilter)  
          .sort({ popularity_score: -1 })  
          .skip((parseInt(page) - 1) * parseInt(limit))  
          .limit(parseInt(limit))  
          .toArray(),  
        collection.countDocuments(regexFilter),  
      ]);  
  
      res.json({  
        games,  
        pagination: {  
          page: parseInt(page),  
          limit: parseInt(limit),  
          total,  
          pages: Math.ceil(total / parseInt(limit)),  
        },  
        _notice: "Results from fallback regex search (Atlas Search unavailable)",  
      });  
    } catch (fallbackErr) {  
      res.status(500).json({ error: "Search failed" });  
    }  
  }  
});  
  
// GET /api/games/:slug — single game detail  
app.get("/api/games/:slug", async (req, res) => {  
  try {  
    const game = await collection.findOne({ slug: req.params.slug });  
    if (!game) return res.status(404).json({ error: "Game not found" });  
    res.json(game);  
  } catch (err) {  
    res.status(500).json({ error: "Failed to fetch game" });  
  }  
});  
  
// GET /api/filters — get available filter values  
app.get("/api/filters", async (req, res) => {  
  try {  
    const [categories, providers, volatilities, subcategories] = await Promise.all([  
      collection.distinct("category", { status: "active" }),  
      collection.distinct("provider", { status: "active" }),  
      collection.distinct("volatility", { status: "active" }),  
      collection.distinct("subcategory", { status: "active" }),  
    ]);  
    res.json({ categories, providers, volatilities, subcategories });  
  } catch (err) {  
    res.status(500).json({ error: "Failed to fetch filters" });  
  }  
});  
  
// GET /api/stats — catalogue stats  
app.get("/api/stats", async (req, res) => {  
  try {  
    const pipeline = [  
      { $match: { status: "active" } },  
      {  
        $group: {  
          _id: "$category",  
          count: { $sum: 1 },  
          avg_rating: { $avg: "$player_rating.average" },  
        },  
      },  
      { $sort: { count: -1 } },  
    ];  
    const stats = await collection.aggregate(pipeline).toArray();  
    const total = stats.reduce((sum, s) => sum + s.count, 0);  
    res.json({ total, by_category: stats });  
  } catch (err) {  
    res.status(500).json({ error: "Failed to fetch stats" });  
  }  
});  
  
// ─── HTML UI ─────────────────────────────────────────────────────────────────  
  
const HTML = `  
<!DOCTYPE html>  
<html lang="en">  
<head>  
  <meta charset="UTF-8" />  
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />  
  <title>MongoBet — Gaming Catalogue</title>  
  <style>  
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }  
  
    :root {  
      --bg-primary: #ffffff;  
      --bg-secondary: #f5f7fa;  
      --bg-tertiary: #edf0f5;  
      --blue-accent: #1a56db;  
      --blue-light: #3b82f6;  
      --blue-pale: #eff6ff;  
      --blue-border: #bfdbfe;  
      --red-primary: #dc2626;  
      --red-dark: #b91c1c;  
      --red-pale: #fef2f2;  
      --red-border: #fecaca;  
      --green-accent: #00684a;  
      --green-light: #00ed64;  
      --green-pale: #ecfdf5;  
      --gold: #d97706;  
      --gold-pale: #fffbeb;  
      --purple: #7c3aed;  
      --text-primary: #111827;  
      --text-secondary: #4b5563;  
      --text-muted: #9ca3af;  
      --border: #e5e7eb;  
      --border-light: #f3f4f6;  
      --card-bg: #ffffff;  
      --card-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);  
      --card-shadow-hover: 0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.06);  
      --radius: 12px;  
      --radius-sm: 8px;  
      --radius-xs: 6px;  
    }  
  
    body {  
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;  
      background: var(--bg-secondary);  
      color: var(--text-primary);  
      line-height: 1.5;  
      min-height: 100vh;  
    }  
  
    /* ── Header ── */  
    header {  
      background: var(--bg-primary);  
      border-bottom: 3px solid var(--red-primary);  
      padding: 0 24px;  
      position: sticky;  
      top: 0;  
      z-index: 100;  
      box-shadow: 0 1px 8px rgba(0,0,0,0.06);  
    }  
  
    .header-inner {  
      max-width: 1440px;  
      margin: 0 auto;  
      display: flex;  
      align-items: center;  
      justify-content: space-between;  
      height: 68px;  
      gap: 24px;  
    }  
  
    .logo {  
      display: flex;  
      align-items: center;  
      gap: 10px;  
      text-decoration: none;  
      flex-shrink: 0;  
    }  
  
    .logo-leaf { width: 36px; height: 36px; }  
  
    .logo-text {  
      font-size: 24px;  
      font-weight: 800;  
      letter-spacing: -0.5px;  
    }  
  
    .logo-mongo { color: var(--green-accent); }  
    .logo-bet { color: var(--red-primary); }  
  
    /* ── Search ── */  
    .search-container {  
      flex: 1;  
      max-width: 600px;  
      position: relative;  
    }  
  
    .search-input {  
      width: 100%;  
      padding: 10px 44px 10px 16px;  
      background: var(--bg-secondary);  
      border: 2px solid var(--border);  
      border-radius: 24px;  
      color: var(--text-primary);  
      font-size: 14px;  
      outline: none;  
      transition: all 0.2s;  
    }  
  
    .search-input:focus {  
      border-color: var(--blue-accent);  
      box-shadow: 0 0 0 3px rgba(26, 86, 219, 0.15);  
      background: var(--bg-primary);  
    }  
  
    .search-input::placeholder { color: var(--text-muted); }  
  
    .search-icon {  
      position: absolute;  
      right: 14px;  
      top: 50%;  
      transform: translateY(-50%);  
      color: var(--text-muted);  
      pointer-events: none;  
    }  
  
    .search-hint {  
      position: absolute;  
      right: 40px;  
      top: 50%;  
      transform: translateY(-50%);  
      font-size: 10px;  
      color: var(--text-muted);  
      background: var(--bg-tertiary);  
      padding: 2px 6px;  
      border-radius: 4px;  
      pointer-events: none;  
      opacity: 0;  
      transition: opacity 0.2s;  
    }  
  
    .search-input:focus ~ .search-hint { opacity: 1; }  
  
    /* ── Autocomplete Dropdown ── */  
    .autocomplete-dropdown {  
      position: absolute;  
      top: calc(100% + 6px);  
      left: 0;  
      right: 0;  
      background: var(--bg-primary);  
      border: 1px solid var(--border);  
      border-radius: var(--radius);  
      box-shadow: 0 12px 40px rgba(0,0,0,0.12);  
      z-index: 200;  
      display: none;  
      overflow: hidden;  
    }  
  
    .autocomplete-dropdown.visible { display: block; }  
  
    .ac-item {  
      display: flex;  
      align-items: center;  
      gap: 12px;  
      padding: 10px 16px;  
      cursor: pointer;  
      transition: background 0.1s;  
      border-bottom: 1px solid var(--border-light);  
    }  
  
    .ac-item:last-child { border-bottom: none; }  
    .ac-item:hover, .ac-item.ac-active { background: var(--blue-pale); }  
  
    .ac-icon {  
      width: 36px;  
      height: 36px;  
      background: var(--bg-tertiary);  
      border-radius: var(--radius-xs);  
      display: flex;  
      align-items: center;  
      justify-content: center;  
      font-size: 18px;  
      flex-shrink: 0;  
    }  
  
    .ac-info { flex: 1; min-width: 0; }  
  
    .ac-name {  
      font-size: 14px;  
      font-weight: 600;  
      color: var(--text-primary);  
      white-space: nowrap;  
      overflow: hidden;  
      text-overflow: ellipsis;  
    }  
  
    .ac-meta {  
      font-size: 12px;  
      color: var(--text-muted);  
    }  
  
    .ac-badge-new {  
      font-size: 10px;  
      background: var(--green-pale);  
      color: var(--green-accent);  
      padding: 1px 6px;  
      border-radius: 4px;  
      font-weight: 600;  
    }  
  
    .ac-footer {  
      padding: 10px 16px;  
      text-align: center;  
      font-size: 12px;  
      color: var(--blue-accent);  
      background: var(--bg-secondary);  
      cursor: pointer;  
      font-weight: 600;  
    }  
  
    .ac-footer:hover { background: var(--blue-pale); }  
  
    .header-stats {  
      display: flex;  
      gap: 12px;  
      flex-shrink: 0;  
    }  
  
    .stat-badge {  
      background: var(--bg-secondary);  
      border: 1px solid var(--border);  
      padding: 6px 12px;  
      border-radius: 20px;  
      font-size: 12px;  
      font-weight: 600;  
      color: var(--text-secondary);  
      white-space: nowrap;  
    }  
  
    .stat-badge span { color: var(--green-accent); font-weight: 700; }  
  
    /* ── Layout ── */  
    .app-container {  
      max-width: 1440px;  
      margin: 0 auto;  
      display: flex;  
      gap: 24px;  
      padding: 24px;  
    }  
  
    /* ── Sidebar ── */  
    .sidebar { width: 260px; flex-shrink: 0; }  
  
    .filter-section {  
      background: var(--card-bg);  
      border: 1px solid var(--border);  
      border-radius: var(--radius);  
      padding: 16px;  
      margin-bottom: 16px;  
      box-shadow: var(--card-shadow);  
    }  
  
    .filter-title {  
      font-size: 12px;  
      font-weight: 700;  
      text-transform: uppercase;  
      letter-spacing: 0.5px;  
      color: var(--text-muted);  
      margin-bottom: 10px;  
      display: flex;  
      align-items: center;  
      gap: 6px;  
    }  
  
    .filter-btn {  
      display: block;  
      width: 100%;  
      padding: 7px 10px;  
      background: transparent;  
      border: 1px solid transparent;  
      border-radius: var(--radius-xs);  
      color: var(--text-secondary);  
      font-size: 13px;  
      cursor: pointer;  
      text-align: left;  
      transition: all 0.15s;  
      margin-bottom: 2px;  
    }  
  
    .filter-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }  
  
    .filter-btn.active {  
      background: var(--red-primary);  
      color: white;  
      border-color: var(--red-primary);  
      font-weight: 600;  
    }  
  
    .filter-btn.active:hover { background: var(--red-dark); }  
  
    /* ── Content ── */  
    .content { flex: 1; min-width: 0; }  
  
    .toolbar {  
      display: flex;  
      align-items: center;  
      justify-content: space-between;  
      margin-bottom: 20px;  
      flex-wrap: wrap;  
      gap: 12px;  
    }  
  
    .results-info { font-size: 14px; color: var(--text-secondary); }  
    .results-info strong { color: var(--text-primary); }  
  
    .sort-select {  
      padding: 8px 12px;  
      background: var(--card-bg);  
      border: 1px solid var(--border);  
      border-radius: var(--radius-sm);  
      color: var(--text-primary);  
      font-size: 13px;  
      cursor: pointer;  
      outline: none;  
    }  
  
    .search-notice {  
      width: 100%;  
      padding: 10px 14px;  
      background: var(--blue-pale);  
      border: 1px solid var(--blue-border);  
      border-radius: var(--radius-sm);  
      font-size: 13px;  
      color: var(--blue-accent);  
      display: none;  
      align-items: center;  
      gap: 8px;  
    }  
  
    .search-notice.visible { display: flex; }  
  
    .clear-search {  
      background: var(--blue-accent);  
      border: none;  
      color: white;  
      padding: 4px 10px;  
      border-radius: 4px;  
      cursor: pointer;  
      font-size: 12px;  
      margin-left: auto;  
      font-weight: 600;  
    }  
  
    .clear-search:hover { background: var(--blue-light); }  
  
    /* ── Category Tabs ── */  
    .category-tabs {  
      display: flex;  
      gap: 6px;  
      margin-bottom: 20px;  
      overflow-x: auto;  
      padding-bottom: 4px;  
    }  
  
    .category-tab {  
      padding: 8px 16px;  
      background: var(--card-bg);  
      border: 1px solid var(--border);  
      border-radius: 20px;  
      color: var(--text-secondary);  
      font-size: 13px;  
      font-weight: 600;  
      cursor: pointer;  
      white-space: nowrap;  
      transition: all 0.15s;  
    }  
  
    .category-tab:hover { border-color: var(--blue-accent); color: var(--blue-accent); }  
  
    .category-tab.active {  
      background: var(--red-primary);  
      border-color: var(--red-primary);  
      color: white;  
    }  
  
    .category-tab .tab-icon { margin-right: 6px; }  
  
    /* ── Game Grid ── */  
    .game-grid {  
      display: grid;  
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));  
      gap: 16px;  
    }  
  
    .game-card {  
      background: var(--card-bg);  
      border: 1px solid var(--border);  
      border-radius: var(--radius);  
      overflow: hidden;  
      cursor: pointer;  
      transition: all 0.2s;  
      position: relative;  
      box-shadow: var(--card-shadow);  
    }  
  
    .game-card:hover {  
      transform: translateY(-4px);  
      border-color: var(--blue-accent);  
      box-shadow: var(--card-shadow-hover);  
    }  
  
    .game-thumb {  
      width: 100%;  
      aspect-ratio: 16/10;  
      display: flex;  
      align-items: center;  
      justify-content: center;  
      font-size: 40px;  
      position: relative;  
      overflow: hidden;  
    }  
  
    .game-thumb-bg {  
      position: absolute;  
      inset: 0;  
    }  
  
    .game-thumb-bg.cat-slots { background: linear-gradient(135deg, #667eea, #764ba2); }  
    .game-thumb-bg.cat-live_casino { background: linear-gradient(135deg, #e63946, #c1121f); }  
    .game-thumb-bg.cat-table_games { background: linear-gradient(135deg, #00684a, #00ed64); }  
    .game-thumb-bg.cat-instant_win { background: linear-gradient(135deg, #d97706, #f59e0b); }  
    .game-thumb-bg.cat-virtual_sports { background: linear-gradient(135deg, #1a56db, #3b82f6); }  
  
    .game-thumb-pattern {  
      position: absolute;  
      inset: 0;  
      opacity: 0.08;  
      background-image:  
        radial-gradient(circle at 20% 30%, white 1px, transparent 1px),  
        radial-gradient(circle at 80% 70%, white 1px, transparent 1px),  
        radial-gradient(circle at 50% 50%, white 1px, transparent 1px);  
      background-size: 30px 30px, 25px 25px, 35px 35px;  
    }  
  
    .game-thumb-icon {  
      position: relative;  
      z-index: 1;  
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));  
    }  
  
    .game-badges {  
      position: absolute;  
      top: 8px;  
      left: 8px;  
      display: flex;  
      gap: 4px;  
      flex-wrap: wrap;  
      z-index: 2;  
    }  
  
    .badge {  
      padding: 2px 8px;  
      border-radius: 4px;  
      font-size: 10px;  
      font-weight: 700;  
      text-transform: uppercase;  
      letter-spacing: 0.3px;  
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);  
    }  
  
    .badge-new { background: #00ed64; color: #003d29; }  
    .badge-featured { background: #fbbf24; color: #78350f; }  
    .badge-exclusive { background: var(--red-primary); color: white; }  
    .badge-jackpot { background: #7c3aed; color: white; }  
    .badge-live { background: var(--red-primary); color: white; animation: pulse-live 2s infinite; }  
  
    @keyframes pulse-live {  
      0%, 100% { opacity: 1; }  
      50% { opacity: 0.7; }  
    }  
  
    .game-info { padding: 12px; }  
  
    .game-name {  
      font-size: 14px;  
      font-weight: 700;  
      margin-bottom: 2px;  
      white-space: nowrap;  
      overflow: hidden;  
      text-overflow: ellipsis;  
      color: var(--text-primary);  
    }  
  
    .game-provider {  
      font-size: 12px;  
      color: var(--text-muted);  
      margin-bottom: 8px;  
    }  
  
    .game-meta { display: flex; gap: 6px; flex-wrap: wrap; }  
  
    .meta-tag {  
      padding: 2px 8px;  
      background: var(--bg-secondary);  
      border-radius: 4px;  
      font-size: 11px;  
      color: var(--text-secondary);  
      font-weight: 500;  
    }  
  
    .meta-tag.rtp { color: var(--green-accent); background: var(--green-pale); }  
    .meta-tag.volatility-high { color: #dc2626; background: var(--red-pale); }  
    .meta-tag.volatility-low { color: var(--green-accent); background: var(--green-pale); }  
    .meta-tag.volatility-medium { color: var(--gold); background: var(--gold-pale); }  
  
    .game-rating {  
      display: flex;  
      align-items: center;  
      gap: 4px;  
      margin-top: 8px;  
      font-size: 12px;  
      color: var(--gold);  
    }  
  
    .game-rating .count { color: var(--text-muted); font-size: 11px; }  
  
    /* ── Modal ── */  
    .modal-overlay {  
      display: none;  
      position: fixed;  
      inset: 0;  
      background: rgba(0, 0, 0, 0.5);  
      backdrop-filter: blur(4px);  
      z-index: 200;  
      justify-content: center;  
      align-items: center;  
      padding: 24px;  
    }  
  
    .modal-overlay.visible { display: flex; }  
  
    .modal {  
      background: var(--bg-primary);  
      border: 1px solid var(--border);  
      border-radius: var(--radius);  
      max-width: 700px;  
      width: 100%;  
      max-height: 85vh;  
      overflow-y: auto;  
      box-shadow: 0 20px 60px rgba(0,0,0,0.2);  
    }  
  
    .modal-header {  
      display: flex;  
      align-items: center;  
      justify-content: space-between;  
      padding: 20px 24px;  
      border-bottom: 1px solid var(--border);  
    }  
  
    .modal-header h2 { font-size: 20px; font-weight: 700; color: var(--text-primary); }  
  
    .modal-close {  
      background: var(--bg-secondary);  
      border: 1px solid var(--border);  
      color: var(--text-secondary);  
      font-size: 18px;  
      cursor: pointer;  
      padding: 4px 10px;  
      border-radius: var(--radius-xs);  
      transition: all 0.15s;  
    }  
  
    .modal-close:hover { background: var(--bg-tertiary); color: var(--text-primary); }  
  
    .modal-body { padding: 24px; }  
  
    .modal-section { margin-bottom: 20px; }  
  
    .modal-section h3 {  
      font-size: 12px;  
      text-transform: uppercase;  
      letter-spacing: 0.5px;  
      color: var(--text-muted);  
      margin-bottom: 10px;  
      font-weight: 700;  
    }  
  
    .detail-grid {  
      display: grid;  
      grid-template-columns: 1fr 1fr;  
      gap: 10px;  
    }  
  
    .detail-item {  
      padding: 10px 14px;  
      background: var(--bg-secondary);  
      border-radius: var(--radius-sm);  
      border: 1px solid var(--border-light);  
    }  
  
    .detail-label {  
      font-size: 11px;  
      color: var(--text-muted);  
      text-transform: uppercase;  
      letter-spacing: 0.3px;  
      margin-bottom: 2px;  
    }  
  
    .detail-value { font-size: 14px; font-weight: 600; color: var(--text-primary); }  
  
    .feature-chips { display: flex; flex-wrap: wrap; gap: 6px; }  
  
    .feature-chip {  
      padding: 4px 10px;  
      background: var(--blue-pale);  
      border: 1px solid var(--blue-border);  
      border-radius: 14px;  
      font-size: 12px;  
      color: var(--blue-accent);  
      font-weight: 500;  
    }  
  
    .play-buttons { display: flex; gap: 12px; margin-top: 24px; }  
  
    .btn-play {  
      flex: 1;  
      padding: 14px;  
      border: none;  
      border-radius: var(--radius-sm);  
      font-size: 15px;  
      font-weight: 700;  
      cursor: pointer;  
      transition: all 0.15s;  
      text-transform: uppercase;  
      letter-spacing: 0.5px;  
    }  
  
    .btn-play-real {  
      background: var(--red-primary);  
      color: white;  
    }  
  
    .btn-play-real:hover { background: var(--red-dark); transform: scale(1.02); box-shadow: 0 4px 16px rgba(220,38,38,0.3); }  
  
    .btn-play-demo {  
      background: var(--bg-secondary);  
      border: 2px solid var(--border);  
      color: var(--text-primary);  
    }  
  
    .btn-play-demo:hover { border-color: var(--blue-accent); color: var(--blue-accent); }  
  
    /* ── Pagination ── */  
    .pagination {  
      display: flex;  
      justify-content: center;  
      align-items: center;  
      gap: 6px;  
      margin-top: 32px;  
      padding-bottom: 32px;  
    }  
  
    .page-btn {  
      padding: 8px 14px;  
      background: var(--card-bg);  
      border: 1px solid var(--border);  
      border-radius: var(--radius-sm);  
      color: var(--text-secondary);  
      cursor: pointer;  
      font-size: 13px;  
      transition: all 0.15s;  
    }  
  
    .page-btn:hover:not(:disabled) { border-color: var(--blue-accent); color: var(--blue-accent); }  
  
    .page-btn.active {  
      background: var(--red-primary);  
      border-color: var(--red-primary);  
      color: white;  
    }  
  
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }  
  
    /* ── Loading & Empty ── */  
    .loading { text-align: center; padding: 60px 20px; color: var(--text-muted); }  
  
    .spinner {  
      display: inline-block;  
      width: 40px;  
      height: 40px;  
      border: 3px solid var(--border);  
      border-top-color: var(--red-primary);  
      border-radius: 50%;  
      animation: spin 0.8s linear infinite;  
      margin-bottom: 12px;  
    }  
  
    @keyframes spin { to { transform: rotate(360deg); } }  
  
    .empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }  
    .empty-state .emoji { font-size: 48px; margin-bottom: 12px; }  
  
    /* ── Footer ── */  
    footer {  
      border-top: 1px solid var(--border);  
      background: var(--bg-primary);  
      padding: 24px;  
      text-align: center;  
      color: var(--text-muted);  
      font-size: 12px;  
    }  
  
    footer a { color: var(--blue-accent); text-decoration: none; }  
    footer a:hover { text-decoration: underline; }  
  
    /* ── Responsive ── */  
    @media (max-width: 900px) {  
      .sidebar { display: none; }  
      .header-stats { display: none; }  
      .game-grid { grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); }  
    }  
  
    @media (max-width: 600px) {  
      .header-inner { height: 56px; }  
      .logo-text { font-size: 20px; }  
      .search-input { font-size: 13px; padding: 8px 36px 8px 12px; }  
      .game-grid { grid-template-columns: repeat(2, 1fr); gap: 10px; }  
      .game-info { padding: 8px; }  
      .game-name { font-size: 12px; }  
    }  
  </style>  
</head>  
<body>  
  
  <header>  
    <div class="header-inner">  
      <a href="/" class="logo" onclick="resetAll(); return false;">  
        <svg class="logo-leaf" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">  
          <path d="M18 2C14 6 4 14 4 22c0 7.18 6.26 12 14 12s14-4.82 14-12C32 14 22 6 18 2z" fill="#00684A"/>  
          <path d="M18 10v18M18 28c-3-4-6-8-6-13M18 28c3-4 6-8 6-13" stroke="#fff" stroke-width="2" stroke-linecap="round"/>  
        </svg>  
        <span class="logo-text">  
          <span class="logo-mongo">Mongo</span><span class="logo-bet">Bet</span>  
        </span>  
      </a>  
  
      <div class="search-container">  
        <input  
          type="text"  
          class="search-input"  
          id="searchInput"  
          placeholder="Search games, providers, themes…"  
          autocomplete="off"  
        />  
        <span class="search-icon">🔍</span>  
        <span class="search-hint">⏎ Enter to search</span>  
        <div class="autocomplete-dropdown" id="acDropdown"></div>  
      </div>  
  
      <div class="header-stats">  
        <div class="stat-badge">Games: <span id="totalGames">—</span></div>  
        <div class="stat-badge">Providers: <span id="totalProviders">—</span></div>  
      </div>  
    </div>  
  </header>  
  
  <div class="app-container">  
    <aside class="sidebar" id="sidebar"></aside>  
    <main class="content">  
      <div class="category-tabs" id="categoryTabs"></div>  
      <div class="toolbar">  
        <div class="results-info" id="resultsInfo"></div>  
        <select class="sort-select" id="sortSelect" onchange="handleSortChange()">  
          <option value="popularity">Sort: Popularity</option>  
          <option value="rating">Sort: Rating</option>  
          <option value="newest">Sort: Newest</option>  
          <option value="name_asc">Sort: A → Z</option>  
          <option value="name_desc">Sort: Z → A</option>  
        </select>  
        <div class="search-notice" id="searchNotice">  
          <span>🔍 Search results for: "<strong id="searchQuery"></strong>"</span>  
          <button class="clear-search" onclick="clearSearch()">✕ Clear</button>  
        </div>  
      </div>  
      <div id="gameGrid" class="game-grid"></div>  
      <div class="loading" id="loading" style="display:none">  
        <div class="spinner"></div>  
        <p>Loading games…</p>  
      </div>  
      <div class="empty-state" id="emptyState" style="display:none">  
        <div class="emoji">🎰</div>  
        <p>No games found. Try a different search or filter.</p>  
      </div>  
      <div class="pagination" id="pagination"></div>  
    </main>  
  </div>  
  
  <div class="modal-overlay" id="modalOverlay" onclick="closeModal(event)">  
    <div class="modal" id="modal" onclick="event.stopPropagation()">  
      <div class="modal-header">  
        <h2 id="modalTitle"></h2>  
        <button class="modal-close" onclick="closeModal()">✕</button>  
      </div>  
      <div class="modal-body" id="modalBody"></div>  
    </div>  
  </div>  
  
  <footer>  
    <p>🍀 MongoBet — Powered by <a href="https://www.mongodb.com" target="_blank">MongoDB Atlas</a> &amp; Atlas Search</p>  
    <p style="margin-top:6px">This is a demo catalogue. No real gambling takes place. Please gamble responsibly. 18+</p>  
  </footer>  
  
  <script>  
    // ── State ──  
    const state = {  
      games: [],  
      filters: { categories: [], providers: [], volatilities: [] },  
      pagination: { page: 1, limit: 24, total: 0, pages: 0 },  
      activeCategory: null,  
      activeProvider: null,  
      activeVolatility: null,  
      sort: "popularity",  
      searchQuery: "",  
      isSearching: false,  
    };  
  
    const CATEGORY_CONFIG = {  
      slots:          { label: "Slots",          icon: "🎰" },  
      live_casino:    { label: "Live Casino",    icon: "🎥" },  
      table_games:    { label: "Table Games",    icon: "🃏" },  
      instant_win:    { label: "Instant Win",    icon: "🎟️" },  
      virtual_sports: { label: "Virtual Sports", icon: "🏇" },  
    };  
  
    const CATEGORY_ICONS = {  
      slots: "🎰", live_casino: "🎥", table_games: "🃏",  
      instant_win: "🎟️", virtual_sports: "🏇",  
    };  
  
    // ── API ──  
    async function fetchJSON(url) {  
      const res = await fetch(url);  
      if (!res.ok) throw new Error(res.statusText);  
      return res.json();  
    }  
  
    async function loadFilters() {  
      state.filters = await fetchJSON("/api/filters");  
      renderSidebar();  
    }  
  
    async function loadStats() {  
      const stats = await fetchJSON("/api/stats");  
      document.getElementById("totalGames").textContent = stats.total;  
      document.getElementById("totalProviders").textContent = state.filters.providers?.length || "—";  
    }  
  
    async function loadGames() {  
      showLoading(true);  
      try {  
        let data;  
        if (state.isSearching && state.searchQuery) {  
          const params = new URLSearchParams({  
            q: state.searchQuery,  
            page: state.pagination.page,  
            limit: state.pagination.limit,  
          });  
          if (state.activeCategory) params.set("category", state.activeCategory);  
          if (state.activeProvider) params.set("provider", state.activeProvider);  
          data = await fetchJSON("/api/games/search?" + params);  
        } else {  
          const params = new URLSearchParams({  
            page: state.pagination.page,  
            limit: state.pagination.limit,  
            sort: state.sort,  
          });  
          if (state.activeCategory) params.set("category", state.activeCategory);  
          if (state.activeProvider) params.set("provider", state.activeProvider);  
          if (state.activeVolatility) params.set("volatility", state.activeVolatility);  
          data = await fetchJSON("/api/games?" + params);  
        }  
        state.games = data.games;  
        state.pagination = data.pagination;  
        renderGames();  
        renderPagination();  
        renderResultsInfo();  
      } catch (err) {  
        console.error("Failed to load games:", err);  
      } finally {  
        showLoading(false);  
      }  
    }  
  
    async function openGameDetail(slug) {  
      try {  
        const game = await fetchJSON("/api/games/" + slug);  
        renderModal(game);  
        document.getElementById("modalOverlay").classList.add("visible");  
        document.body.style.overflow = "hidden";  
      } catch (err) {  
        console.error("Failed to load game:", err);  
      }  
    }  
  
    // ── Autocomplete ──  
    let acTimeout;  
    let acIndex = -1;  
    let acResults = [];  
  
    const searchInput = document.getElementById("searchInput");  
    const acDropdown = document.getElementById("acDropdown");  
  
    searchInput.addEventListener("input", (e) => {  
      clearTimeout(acTimeout);  
      const q = e.target.value.trim();  
  
      if (q.length < 2) {  
        hideAutocomplete();  
        return;  
      }  
  
      acTimeout = setTimeout(async () => {  
        try {  
          const data = await fetchJSON("/api/games/autocomplete?q=" + encodeURIComponent(q));  
          acResults = data.suggestions || [];  
          acIndex = -1;  
          renderAutocomplete(q);  
        } catch (err) {  
          console.error("Autocomplete error:", err);  
          hideAutocomplete();  
        }  
      }, 200);  
    });  
  
    searchInput.addEventListener("keydown", (e) => {  
      const items = acDropdown.querySelectorAll(".ac-item");  
  
      if (e.key === "ArrowDown") {  
        e.preventDefault();  
        acIndex = Math.min(acIndex + 1, items.length - 1);  
        updateAcHighlight(items);  
      } else if (e.key === "ArrowUp") {  
        e.preventDefault();  
        acIndex = Math.max(acIndex - 1, -1);  
        updateAcHighlight(items);  
      } else if (e.key === "Enter") {  
        e.preventDefault();  
        hideAutocomplete();  
  
        if (acIndex >= 0 && acIndex < acResults.length) {  
          // Navigate to selected autocomplete item  
          openGameDetail(acResults[acIndex].slug);  
          searchInput.blur();  
        } else {  
          // Full-text search  
          const q = searchInput.value.trim();  
          if (q.length >= 2) {  
            state.searchQuery = q;  
            state.isSearching = true;  
            state.pagination.page = 1;  
            document.getElementById("searchQuery").textContent = q;  
            document.getElementById("searchNotice").classList.add("visible");  
            loadGames();  
          }  
        }  
      } else if (e.key === "Escape") {  
        hideAutocomplete();  
      }  
    });  
  
    searchInput.addEventListener("focus", () => {  
      if (acResults.length > 0 && searchInput.value.trim().length >= 2) {  
        acDropdown.classList.add("visible");  
      }  
    });  
  
    // Close autocomplete when clicking outside  
    document.addEventListener("click", (e) => {  
      if (!e.target.closest(".search-container")) {  
        hideAutocomplete();  
      }  
    });  
  
    function renderAutocomplete(query) {  
      if (acResults.length === 0) {  
        hideAutocomplete();  
        return;  
      }  
  
      let html = acResults.map((item, i) => {  
        const icon = CATEGORY_ICONS[item.category] || "🎮";  
        const catLabel = CATEGORY_CONFIG[item.category]?.label || item.category;  
        const newBadge = item.is_new ? ' <span class="ac-badge-new">NEW</span>' : "";  
  
        // Highlight matching text  
        const regex = new RegExp("(" + query.replace(/[.*+?^\${}()|[\\]\\\\]/g, "\\\\\\$&") + ")", "gi");  
        const highlighted = (item.name || "").replace(regex, "<strong>\\$1</strong>");  
  
        return '<div class="ac-item" data-index="' + i + '" onclick="selectAutocomplete(' + i + ')" onmouseenter="acIndex=' + i + ';updateAcHighlight()">' +  
          '<div class="ac-icon">' + icon + '</div>' +  
          '<div class="ac-info">' +  
            '<div class="ac-name">' + highlighted + newBadge + '</div>' +  
            '<div class="ac-meta">' + (item.provider || "") + ' · ' + catLabel + '</div>' +  
          '</div>' +  
        '</div>';  
      }).join("");  
  
      html += '<div class="ac-footer" onclick="executeFullSearch()">🔍 Search all results for "' + query + '"</div>';  
  
      acDropdown.innerHTML = html;  
      acDropdown.classList.add("visible");  
    }  
  
    function hideAutocomplete() {  
      acDropdown.classList.remove("visible");  
      acIndex = -1;  
    }  
  
    function updateAcHighlight(items) {  
      const allItems = items || acDropdown.querySelectorAll(".ac-item");  
      allItems.forEach((el, i) => {  
        el.classList.toggle("ac-active", i === acIndex);  
      });  
    }  
  
    function selectAutocomplete(index) {  
      if (acResults[index]) {  
        hideAutocomplete();  
        openGameDetail(acResults[index].slug);  
      }  
    }  
  
    function executeFullSearch() {  
      const q = searchInput.value.trim();  
      hideAutocomplete();  
      if (q.length >= 2) {  
        state.searchQuery = q;  
        state.isSearching = true;  
        state.pagination.page = 1;  
        document.getElementById("searchQuery").textContent = q;  
        document.getElementById("searchNotice").classList.add("visible");  
        loadGames();  
      }  
    }  
  
    // ── Rendering ──  
    function renderSidebar() {  
      const sidebar = document.getElementById("sidebar");  
      let providerHTML = state.filters.providers.sort().slice(0, 20).map(p => {  
        const active = state.activeProvider === p ? "active" : "";  
        return '<button class="filter-btn ' + active + '" onclick="setProvider(\\'' + p.replace(/'/g, "\\\\'") + '\\')">' + p + '</button>';  
      }).join("");  
  
      let volHTML = (state.filters.volatilities || []).filter(v => v).map(v => {  
        const active = state.activeVolatility === v ? "active" : "";  
        return '<button class="filter-btn ' + active + '" onclick="setVolatility(\\'' + v + '\\')">' + v + '</button>';  
      }).join("");  
  
      sidebar.innerHTML =  
        '<div class="filter-section"><div class="filter-title">🏢 Provider</div>' +  
        '<button class="filter-btn ' + (!state.activeProvider ? "active" : "") + '" onclick="setProvider(null)">All Providers</button>' +  
        providerHTML + '</div>' +  
        '<div class="filter-section"><div class="filter-title">⚡ Volatility</div>' +  
        '<button class="filter-btn ' + (!state.activeVolatility ? "active" : "") + '" onclick="setVolatility(null)">All</button>' +  
        volHTML + '</div>';  
    }  
  
    function renderCategoryTabs() {  
      const tabs = document.getElementById("categoryTabs");  
      let html = '<button class="category-tab ' + (!state.activeCategory ? "active" : "") + '" onclick="setCategory(null)"><span class="tab-icon">🎮</span>All Games</button>';  
      for (const cat of state.filters.categories) {  
        const cfg = CATEGORY_CONFIG[cat] || { label: cat, icon: "🎮" };  
        const active = state.activeCategory === cat ? "active" : "";  
        html += '<button class="category-tab ' + active + '" onclick="setCategory(\\'' + cat + '\\')"><span class="tab-icon">' + cfg.icon + '</span>' + cfg.label + '</button>';  
      }  
      tabs.innerHTML = html;  
    }  
  
    function renderGames() {  
      const grid = document.getElementById("gameGrid");  
      const empty = document.getElementById("emptyState");  
  
      if (state.games.length === 0) {  
        grid.innerHTML = "";  
        empty.style.display = "block";  
        return;  
      }  
      empty.style.display = "none";  
  
      grid.innerHTML = state.games.map(game => {  
        const icon = CATEGORY_ICONS[game.category] || "🎮";  
        const catClass = "cat-" + (game.category || "slots");  
        let badges = "";  
        if (game.is_new) badges += '<span class="badge badge-new">New</span>';  
        if (game.is_featured) badges += '<span class="badge badge-featured">★ Featured</span>';  
        if (game.is_exclusive) badges += '<span class="badge badge-exclusive">Exclusive</span>';  
        if (game.jackpot) badges += '<span class="badge badge-jackpot">Jackpot</span>';  
        if (game.category === "live_casino") badges += '<span class="badge badge-live">● Live</span>';  
  
        let meta = "";  
        const rtp = game.rtp?.default || game.rtp;  
        if (rtp) meta += '<span class="meta-tag rtp">RTP ' + rtp + '%</span>';  
        if (game.volatility) {  
          let vClass = "meta-tag";  
          if (game.volatility.includes("High")) vClass += " volatility-high";  
          else if (game.volatility.includes("Low")) vClass += " volatility-low";  
          else vClass += " volatility-medium";  
          meta += '<span class="' + vClass + '">' + game.volatility + '</span>';  
        }  
        if (game.max_win_multiplier) meta += '<span class="meta-tag">' + game.max_win_multiplier + '</span>';  
  
        const rating = game.player_rating?.average || 0;  
        const ratingCount = game.player_rating?.count || 0;  
        const stars = "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));  
  
        return '<div class="game-card" onclick="openGameDetail(\\'' + game.slug + '\\')">' +  
          '<div class="game-thumb"><div class="game-thumb-bg ' + catClass + '"></div><div class="game-thumb-pattern"></div><span class="game-thumb-icon">' + icon + '</span>' +  
          '<div class="game-badges">' + badges + '</div></div>' +  
          '<div class="game-info">' +  
            '<div class="game-name" title="' + (game.name || "").replace(/"/g, '&quot;') + '">' + game.name + '</div>' +  
            '<div class="game-provider">' + (game.provider || "Unknown") + '</div>' +  
            '<div class="game-meta">' + meta + '</div>' +  
            '<div class="game-rating"><span>' + stars + '</span> <span>' + rating + '</span> <span class="count">(' + ratingCount.toLocaleString() + ')</span></div>' +  
          '</div></div>';  
      }).join("");  
    }  
  
    function renderModal(game) {  
      document.getElementById("modalTitle").textContent = game.name;  
      const body = document.getElementById("modalBody");  
  
      const rtp = game.rtp?.default || game.rtp || "N/A";  
      const rtpRange = game.rtp?.range ? game.rtp.range.min + "% – " + game.rtp.range.max + "%" : "";  
      let gridInfo = "";  
      if (game.grid) {  
        gridInfo = game.grid.reels + "×" + game.grid.rows;  
        if (game.grid.paylines) gridInfo += " · " + game.grid.paylines.toLocaleString() + " " + (game.grid.payline_type || "lines");  
      }  
  
      let detailsHTML =  
        '<div class="detail-grid">' +  
        '<div class="detail-item"><div class="detail-label">Provider</div><div class="detail-value">' + (game.provider || "—") + '</div></div>' +  
        '<div class="detail-item"><div class="detail-label">Category</div><div class="detail-value">' + (CATEGORY_CONFIG[game.category]?.label || game.category) + '</div></div>' +  
        (rtp !== "N/A" ? '<div class="detail-item"><div class="detail-label">RTP</div><div class="detail-value" style="color:var(--green-accent)">' + rtp + '%' + (rtpRange ? ' <small style="color:var(--text-muted)">(' + rtpRange + ')</small>' : '') + '</div></div>' : '') +  
        (game.volatility ? '<div class="detail-item"><div class="detail-label">Volatility</div><div class="detail-value">' + game.volatility + '</div></div>' : '') +  
        (gridInfo ? '<div class="detail-item"><div class="detail-label">Grid</div><div class="detail-value">' + gridInfo + '</div></div>' : '') +  
        (game.max_win_multiplier ? '<div class="detail-item"><div class="detail-label">Max Win</div><div class="detail-value" style="color:var(--gold)">' + game.max_win_multiplier + '</div></div>' : '') +  
        (game.hit_frequency_pct ? '<div class="detail-item"><div class="detail-label">Hit Frequency</div><div class="detail-value">' + game.hit_frequency_pct + '%</div></div>' : '') +  
        (game.game_type ? '<div class="detail-item"><div class="detail-label">Game Type</div><div class="detail-value">' + game.game_type + '</div></div>' : '') +  
        '</div>';  
  
      let featuresHTML = "";  
      if (game.features && game.features.length) {  
        featuresHTML = '<div class="modal-section"><h3>Features</h3><div class="feature-chips">' +  
          game.features.map(f => '<span class="feature-chip">' + f + '</span>').join("") + '</div></div>';  
      }  
  
      let jackpotHTML = "";  
      if (game.jackpot) {  
        jackpotHTML = '<div class="modal-section"><h3>🏆 Jackpot — ' + game.jackpot.type.replace(/_/g, " ") + '</h3><div class="detail-grid">' +  
          game.jackpot.tiers.map(t =>  
            '<div class="detail-item"><div class="detail-label">' + t.name + '</div><div class="detail-value" style="color:var(--gold)">Seed: £' + t.seed_value.toLocaleString() + '</div></div>'  
          ).join("") + '</div></div>';  
      }  
  
      let stakesHTML = "";  
      if (game.stake_limits && game.stake_limits.length) {  
        stakesHTML = '<div class="modal-section"><h3>Stake Limits</h3><div class="detail-grid">' +  
          game.stake_limits.map(s =>  
            '<div class="detail-item"><div class="detail-label">' + s.currency + '</div><div class="detail-value">' + s.min_stake.toFixed(2) + ' – ' + s.max_stake.toLocaleString() + '</div></div>'  
          ).join("") + '</div></div>';  
      }  
  
      let jurisdictionsHTML = "";  
      if (game.jurisdictions && game.jurisdictions.length) {  
        jurisdictionsHTML = '<div class="modal-section"><h3>Licensed Jurisdictions</h3><div class="feature-chips">' +  
          game.jurisdictions.map(j => '<span class="feature-chip">' + j + '</span>').join("") + '</div></div>';  
      }  
  
      body.innerHTML =  
        (game.description ? '<p style="color:var(--text-secondary);margin-bottom:20px;line-height:1.6">' + game.description + '</p>' : '') +  
        '<div class="modal-section"><h3>Game Details</h3>' + detailsHTML + '</div>' +  
        featuresHTML + jackpotHTML + stakesHTML + jurisdictionsHTML +  
        '<div class="play-buttons">' +  
          '<button class="btn-play btn-play-real">▶ Play Now</button>' +  
          (game.demo_url ? '<button class="btn-play btn-play-demo">Demo</button>' : '') +  
        '</div>';  
    }  
  
    function renderPagination() {  
      const container = document.getElementById("pagination");  
      const { page, pages } = state.pagination;  
      if (pages <= 1) { container.innerHTML = ""; return; }  
      let html = '<button class="page-btn" onclick="goToPage(' + (page - 1) + ')" ' + (page <= 1 ? "disabled" : "") + '>‹ Prev</button>';  
      let start = Math.max(1, page - 2);  
      let end = Math.min(pages, page + 2);  
      if (start > 1) html += '<button class="page-btn" onclick="goToPage(1)">1</button>' + (start > 2 ? '<span style="color:var(--text-muted)">…</span>' : '');  
      for (let i = start; i <= end; i++) {  
        html += '<button class="page-btn ' + (i === page ? "active" : "") + '" onclick="goToPage(' + i + ')">' + i + '</button>';  
      }  
      if (end < pages) html += (end < pages - 1 ? '<span style="color:var(--text-muted)">…</span>' : '') + '<button class="page-btn" onclick="goToPage(' + pages + ')">' + pages + '</button>';  
      html += '<button class="page-btn" onclick="goToPage(' + (page + 1) + ')" ' + (page >= pages ? "disabled" : "") + '>Next ›</button>';  
      container.innerHTML = html;  
    }  
  
    function renderResultsInfo() {  
      const info = document.getElementById("resultsInfo");  
      const { page, limit, total } = state.pagination;  
      const from = (page - 1) * limit + 1;  
      const to = Math.min(page * limit, total);  
      info.innerHTML = total === 0  
        ? "No results"  
        : "Showing <strong>" + from + "–" + to + "</strong> of <strong>" + total.toLocaleString() + "</strong> games";  
    }  
  
    function showLoading(show) {  
      document.getElementById("loading").style.display = show ? "block" : "none";  
      if (show) {  
        document.getElementById("gameGrid").innerHTML = "";  
        document.getElementById("emptyState").style.display = "none";  
      }  
    }  
  
    // ── Handlers ──  
    function setCategory(cat) {  
      state.activeCategory = state.activeCategory === cat ? null : cat;  
      state.pagination.page = 1;  
      renderCategoryTabs();  
      loadGames();  
    }  
  
    function setProvider(provider) {  
      state.activeProvider = state.activeProvider === provider ? null : provider;  
      state.pagination.page = 1;  
      renderSidebar();  
      loadGames();  
    }  
  
    function setVolatility(vol) {  
      state.activeVolatility = state.activeVolatility === vol ? null : vol;  
      state.pagination.page = 1;  
      renderSidebar();  
      loadGames();  
    }  
  
    function handleSortChange() {  
      state.sort = document.getElementById("sortSelect").value;  
      state.pagination.page = 1;  
      loadGames();  
    }  
  
    function goToPage(p) {  
      state.pagination.page = p;  
      loadGames();  
      window.scrollTo({ top: 0, behavior: "smooth" });  
    }  
  
    function closeModal(e) {  
      if (e && e.target !== document.getElementById("modalOverlay")) return;  
      document.getElementById("modalOverlay").classList.remove("visible");  
      document.body.style.overflow = "";  
    }  
  
    function resetAll() {  
      state.activeCategory = null;  
      state.activeProvider = null;  
      state.activeVolatility = null;  
      state.searchQuery = "";  
      state.isSearching = false;  
      state.pagination.page = 1;  
      state.sort = "popularity";  
      searchInput.value = "";  
      hideAutocomplete();  
      document.getElementById("searchNotice").classList.remove("visible");  
      document.getElementById("sortSelect").value = "popularity";  
      renderCategoryTabs();  
      renderSidebar();  
      loadGames();  
    }  
  
    function clearSearch() {  
      state.searchQuery = "";  
      state.isSearching = false;  
      state.pagination.page = 1;  
      searchInput.value = "";  
      hideAutocomplete();  
      document.getElementById("searchNotice").classList.remove("visible");  
      loadGames();  
    }  
  
    document.addEventListener("keydown", (e) => {  
      if (e.key === "Escape") closeModal();  
    });  
  
    // ── Init ──  
    async function init() {  
      await loadFilters();  
      renderCategoryTabs();  
      await Promise.all([loadGames(), loadStats()]);  
    }  
  
    init();  
  </script>  
</body>  
</html>  
`;  
  
app.get("/", (req, res) => {  
  res.setHeader("Content-Type", "text/html");  
  res.send(HTML);  
});  
  
// ─── Start ───────────────────────────────────────────────────────────────────  
async function start() {  
  try {  
    await connectDB();  
    app.listen(PORT, () => {  
      console.log("");  
      console.log("🍀 ══════════════════════════════════════════════");  
      console.log("   MongoBet Gaming Catalogue");  
      console.log("   http://localhost:" + PORT);  
      console.log("🍀 ══════════════════════════════════════════════");  
      console.log("");  
    });  
  } catch (err) {  
    console.error("❌ Failed to start:", err);  
    process.exit(1);  
  }  
}  
  
start();  
