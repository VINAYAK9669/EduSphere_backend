#!/usr/bin/env node
'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Config ───────────────────────────────────────────────────────────────────

const SCHEMA_DIR = path.resolve(__dirname, '..', 'src', 'db', 'postgres', 'schema');
const OUTPUT     = path.resolve(__dirname, '..', 'schema-diagram.html');

const TABLE_CATEGORY = {
  users:            'auth',
  institutions:     'institution',
  teacher_profiles: 'profile',
  student_profiles: 'profile',
  classes:          'academic',
  sessions:         'academic',
  enrollments:      'data',
  competencies:     'data',
  assessments:      'data',
  notes:            'data',
};

const CAT = {
  auth:        { color: '#7c3aed', bg: '#f5f3ff', text: '#5b21b6', label: 'Auth'        },
  institution: { color: '#2563eb', bg: '#eff6ff', text: '#1d4ed8', label: 'Institution' },
  profile:     { color: '#0891b2', bg: '#ecfeff', text: '#0e7490', label: 'Profile'     },
  academic:    { color: '#059669', bg: '#ecfdf5', text: '#047857', label: 'Academic'    },
  data:        { color: '#d97706', bg: '#fffbeb', text: '#b45309', label: 'Data'        },
};

const TYPE_BADGE = {
  text:      { bg: '#dbeafe', color: '#1d4ed8', label: 'text'      },
  integer:   { bg: '#dcfce7', color: '#15803d', label: 'int'       },
  timestamp: { bg: '#fef3c7', color: '#92400e', label: 'timestamp' },
  date:      { bg: '#ede9fe', color: '#5b21b6', label: 'date'      },
  boolean:   { bg: '#e0f2fe', color: '#0369a1', label: 'bool'      },
  enum:      { bg: '#fce7f3', color: '#9d174d', label: 'enum'      },
};

// ─── Parser ───────────────────────────────────────────────────────────────────

function readSchemas() {
  const files = fs.readdirSync(SCHEMA_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts')
    .sort();

  // First pass: build exportName → sqlTableName map (for FK resolution)
  const exportToSql = {};
  for (const file of files) {
    const src = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');
    const re  = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) exportToSql[m[1]] = m[2];
  }

  // Second pass: full parse
  const tables = [];
  for (const file of files) {
    const src = fs.readFileSync(path.join(SCHEMA_DIR, file), 'utf8');
    tables.push(...parseFile(src, exportToSql));
  }
  return tables;
}

function parseFile(src, exportToSql) {
  const tables = [];
  const re     = /export\s+const\s+(\w+)\s*=\s*pgTable\s*\(/g;
  let m;

  while ((m = re.exec(src)) !== null) {
    const exportName = m[1];
    const tail       = src.slice(m.index + m[0].length);

    const nameMatch = tail.match(/^\s*['"]([^'"]+)['"]/);
    if (!nameMatch) continue;
    const tableName = nameMatch[1];

    const afterName  = nameMatch[0].length;
    const commaMatch = tail.slice(afterName).match(/^\s*,\s*/);
    if (!commaMatch) continue;

    const blockStart = afterName + commaMatch[0].length;
    if (tail[blockStart] !== '{') continue;

    const colBlock = extractBraces(tail, blockStart);
    if (!colBlock) continue;

    const columns  = parseColumns(colBlock, exportToSql);
    const category = TABLE_CATEGORY[tableName] || 'data';

    tables.push({ exportName, tableName, columns, category });
  }
  return tables;
}

function extractBraces(src, startIdx) {
  let depth = 0, start = -1;
  for (let i = startIdx; i < src.length; i++) {
    if (src[i] === '{') { if (!depth) start = i + 1; depth++; }
    else if (src[i] === '}') { depth--; if (!depth) return src.slice(start, i); }
  }
  return null;
}

function parseColumns(block, exportToSql) {
  // Join continuation lines (lines starting with a dot) onto previous line
  const joined = block.replace(/\n(\s+)\./g, ' .');
  const columns = [];

  for (const raw of joined.split('\n')) {
    const line = raw.trim().replace(/,\s*$/, '');
    if (!line || line.startsWith('//')) continue;

    const m = line.match(/^(\w+)\s*:\s*(\w+)\s*\(\s*['"]([^'"]+)['"]\s*\)([\s\S]*)/);
    if (!m) continue;

    const [, jsName, typeFn, sqlName, rest] = m;
    const r = rest.replace(/\s+/g, ' ');

    let type = typeFn;
    if (!['text', 'integer', 'timestamp', 'date', 'boolean'].includes(typeFn)) type = 'enum';

    const isPK       = r.includes('.primaryKey()');
    const isNotNull  = isPK || r.includes('.notNull()');
    const isUnique   = isPK || r.includes('.unique()');
    const isArray    = r.includes('.array()');
    const defMatch   = r.match(/\.default\(\s*['"]?([^'")\s]+)['"]?\s*\)/);
    const defaultVal = defMatch ? defMatch[1] : null;

    let fkRef = null;
    const fkM = r.match(/\.references\(\s*\(\s*\)\s*=>\s*(\w+)\.(\w+)/);
    if (fkM) fkRef = { table: exportToSql[fkM[1]] || fkM[1], column: fkM[2] };

    columns.push({ jsName, sqlName, type, typeFn, isPK, isNotNull, isUnique, isArray, defaultVal, fkRef });
  }
  return columns;
}

// ─── HTML Rendering ───────────────────────────────────────────────────────────

function renderCard(table) {
  const cat      = CAT[table.category] || CAT.data;
  const fkCols   = table.columns.filter(c => c.fkRef);
  const colCount = table.columns.length;

  const colRows = table.columns.map(col => {
    const tb   = TYPE_BADGE[col.type] || { bg: '#f1f5f9', color: '#475569', label: col.type };
    const name = col.isArray ? col.sqlName + '[]' : col.sqlName;

    const badges = [
      col.isPK      ? `<span class="b-pk">PK</span>` : '',
      col.isNotNull && !col.isPK ? `<span class="b-nn" title="NOT NULL">*</span>` : '',
      col.isUnique  && !col.isPK ? `<span class="b-unq">UNQ</span>` : '',
      col.isArray   ? `<span class="b-arr">[ ]</span>` : '',
      col.defaultVal ? `<span class="b-def" title="DEFAULT">${col.defaultVal}</span>` : '',
    ].filter(Boolean).join('');

    const fkBadge = col.fkRef
      ? `<span class="b-fk" title="FK → ${col.fkRef.table}.${col.fkRef.column}">&#x2192; ${col.fkRef.table}</span>`
      : '';

    return `
        <div class="col-row${col.isPK ? ' row-pk' : col.fkRef ? ' row-fk' : ''}">
          <span class="col-name">${name}</span>
          <span class="b-type" style="background:${tb.bg};color:${tb.color}">${tb.label}</span>
          ${badges}
          ${fkBadge}
        </div>`;
  }).join('');

  const fkSection = fkCols.length ? `
      <div class="fk-section">
        <div class="fk-title">References</div>
        <div class="fk-links">
          ${[...new Set(fkCols.map(c => c.fkRef.table))].map(t => `<span class="fk-chip">&#x2192; ${t}</span>`).join('')}
        </div>
      </div>` : '';

  return `
  <div class="card" data-category="${table.category}" style="--cat:${cat.color}">
    <div class="card-head" style="border-top:4px solid ${cat.color}">
      <div class="card-head-top">
        <span class="tbl-name">${table.tableName}</span>
        <span class="cat-badge" style="background:${cat.bg};color:${cat.text}">${cat.label}</span>
      </div>
      <div class="tbl-meta">${colCount} columns${fkCols.length ? ` · ${fkCols.length} FK` : ''}</div>
    </div>
    <div class="columns">${colRows}
    </div>${fkSection}
  </div>`;
}

function generateHTML(tables) {
  const now       = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const totalCols = tables.reduce((n, t) => n + t.columns.length, 0);
  const totalFKs  = tables.reduce((n, t) => n + t.columns.filter(c => c.fkRef).length, 0);

  const catCounts = {};
  for (const t of tables) catCounts[t.category] = (catCounts[t.category] || 0) + 1;

  const filterBtns = [
    `<button class="f-btn active" onclick="filter(this,'all')">All <span class="f-cnt">${tables.length}</span></button>`,
    ...Object.entries(CAT).map(([k, v]) =>
      `<button class="f-btn" onclick="filter(this,'${k}')" style="--fc:${v.color}">${v.label} <span class="f-cnt">${catCounts[k] || 0}</span></button>`
    ),
  ].join('\n      ');

  const cards = tables.map(renderCard).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EduSphere — DB Schema</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:#f1f5f9;color:#1e293b;min-height:100vh}

/* ── Header ── */
.header{background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);color:#fff;padding:2rem 2.5rem 1.5rem}
.header-top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.logo{font-size:1.5rem;font-weight:800;letter-spacing:-0.03em}
.logo span{color:#60a5fa}
.gen-time{font-size:0.75rem;color:rgba(255,255,255,0.45);margin-top:0.2rem}
.stats{display:flex;gap:2.5rem;margin-top:1.25rem}
.stat-val{font-size:2rem;font-weight:800;line-height:1}
.stat-lbl{font-size:0.7rem;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.06em;margin-top:0.25rem}

/* ── Filters ── */
.filters{display:flex;flex-wrap:wrap;gap:0.5rem;padding:1rem 2rem;background:#fff;border-bottom:1px solid #e2e8f0;position:sticky;top:0;z-index:10;box-shadow:0 1px 4px rgba(0,0,0,0.06)}
.f-btn{display:inline-flex;align-items:center;gap:0.4rem;padding:0.375rem 0.875rem;border:1.5px solid #e2e8f0;border-radius:9999px;cursor:pointer;font-size:0.813rem;font-weight:500;background:#fff;color:#475569;transition:all 0.15s}
.f-btn:hover{border-color:var(--fc,#475569);color:var(--fc,#1e293b)}
.f-btn.active{background:var(--fc,#1e293b);color:#fff;border-color:var(--fc,#1e293b)}
.f-cnt{font-size:0.7rem;font-weight:700;background:rgba(0,0,0,0.08);color:inherit;padding:0.05rem 0.35rem;border-radius:9999px}
.f-btn.active .f-cnt{background:rgba(255,255,255,0.2)}

/* ── Grid ── */
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1.25rem;padding:1.75rem 2rem;max-width:1700px;margin:0 auto}

/* ── Card ── */
.card{background:#fff;border-radius:0.875rem;box-shadow:0 1px 3px rgba(0,0,0,0.07),0 4px 12px rgba(0,0,0,0.04);overflow:hidden;transition:box-shadow 0.2s,transform 0.2s;display:flex;flex-direction:column}
.card:hover{box-shadow:0 4px 20px rgba(0,0,0,0.12);transform:translateY(-2px)}
.card.hidden{display:none}

/* ── Card head ── */
.card-head{padding:1rem 1.25rem 0.75rem;border-bottom:1px solid #f1f5f9}
.card-head-top{display:flex;align-items:center;gap:0.625rem;margin-bottom:0.25rem}
.tbl-name{font-family:'SF Mono','Fira Code','Cascadia Code',monospace;font-size:0.938rem;font-weight:700;color:#0f172a;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cat-badge{padding:0.2rem 0.6rem;border-radius:9999px;font-size:0.688rem;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;flex-shrink:0}
.tbl-meta{font-size:0.7rem;color:#94a3b8}

/* ── Columns ── */
.columns{flex:1;padding:0.375rem 0}
.col-row{display:flex;align-items:center;gap:0.4rem;padding:0.4rem 1.25rem;font-size:0.8rem;border-bottom:1px solid #f8fafc;min-height:32px}
.col-row:last-child{border-bottom:none}
.col-row:hover{background:#f8fafc}
.row-pk{background:#fffbeb}
.row-pk:hover{background:#fef9c3}
.row-fk{background:#f0f9ff}
.row-fk:hover{background:#e0f2fe}
.col-name{font-family:'SF Mono','Fira Code',monospace;color:#1e293b;font-weight:500;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;font-size:0.813rem}

/* ── Badges ── */
.b-type{padding:0.15rem 0.45rem;border-radius:4px;font-size:0.663rem;font-weight:700;font-family:monospace;white-space:nowrap;flex-shrink:0}
.b-pk{background:#fbbf24;color:#78350f;padding:0.1rem 0.35rem;border-radius:3px;font-size:0.625rem;font-weight:800;flex-shrink:0}
.b-nn{color:#ef4444;font-weight:800;font-size:0.875rem;flex-shrink:0;line-height:1}
.b-unq{background:#e0e7ff;color:#3730a3;padding:0.1rem 0.35rem;border-radius:3px;font-size:0.6rem;font-weight:700;flex-shrink:0}
.b-arr{background:#f0fdf4;color:#15803d;padding:0.1rem 0.35rem;border-radius:3px;font-size:0.6rem;font-weight:700;flex-shrink:0}
.b-def{background:#f1f5f9;color:#64748b;padding:0.1rem 0.35rem;border-radius:3px;font-size:0.6rem;flex-shrink:0;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.b-fk{color:#2563eb;font-size:0.713rem;font-family:monospace;white-space:nowrap;flex-shrink:0;font-weight:500}

/* ── FK section ── */
.fk-section{border-top:1px solid #f1f5f9;padding:0.625rem 1.25rem;background:#fafbfd}
.fk-title{font-size:0.625rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:0.375rem}
.fk-links{display:flex;flex-wrap:wrap;gap:0.25rem}
.fk-chip{display:inline-flex;align-items:center;gap:0.2rem;background:#eff6ff;color:#1d4ed8;padding:0.2rem 0.5rem;border-radius:4px;font-size:0.713rem;font-family:monospace;font-weight:500}

/* ── Legend ── */
.legend{display:flex;flex-wrap:wrap;align-items:center;gap:0.75rem 1.5rem;padding:0.875rem 2rem;background:#fff;border-top:1px solid #e2e8f0}
.legend-title{font-size:0.688rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.06em}
.l-item{display:flex;align-items:center;gap:0.35rem;font-size:0.75rem;color:#64748b}

/* ── Footer ── */
footer{text-align:center;padding:1.5rem;font-size:0.75rem;color:#94a3b8;border-top:1px solid #e2e8f0;background:#fff;margin-top:2rem}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:#f1f5f9}
::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:#94a3b8}
</style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <div>
      <div class="logo">Edu<span>Sphere</span> — DB Schema</div>
      <div class="gen-time">PostgreSQL · Drizzle ORM · Generated ${now}</div>
    </div>
  </div>
  <div class="stats">
    <div><div class="stat-val">${tables.length}</div><div class="stat-lbl">Tables</div></div>
    <div><div class="stat-val">${totalCols}</div><div class="stat-lbl">Columns</div></div>
    <div><div class="stat-val">${totalFKs}</div><div class="stat-lbl">FK Relations</div></div>
    <div><div class="stat-val">${Object.keys(CAT).length}</div><div class="stat-lbl">Categories</div></div>
  </div>
</div>

<div class="filters">
  ${filterBtns}
</div>

<div class="grid" id="grid">
${cards}
</div>

<div class="legend">
  <span class="legend-title">Legend</span>
  <span class="l-item"><span class="b-pk">PK</span> Primary key</span>
  <span class="l-item"><span class="b-nn">*</span> Not null</span>
  <span class="l-item"><span class="b-unq">UNQ</span> Unique</span>
  <span class="l-item"><span class="b-arr">[ ]</span> Array</span>
  <span class="l-item"><span class="b-fk">&#x2192; table</span> Foreign key</span>
  <span class="l-item"><span class="b-type" style="background:#dbeafe;color:#1d4ed8">text</span> Text</span>
  <span class="l-item"><span class="b-type" style="background:#dcfce7;color:#15803d">int</span> Integer</span>
  <span class="l-item"><span class="b-type" style="background:#fef3c7;color:#92400e">timestamp</span> Timestamp</span>
  <span class="l-item"><span class="b-type" style="background:#ede9fe;color:#5b21b6">date</span> Date</span>
  <span class="l-item"><span class="b-type" style="background:#fce7f3;color:#9d174d">enum</span> Enum</span>
  <span class="l-item"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#fffbeb;border:1px solid #fbbf24;vertical-align:middle"></span> Primary key row</span>
  <span class="l-item"><span style="display:inline-block;width:12px;height:12px;border-radius:2px;background:#f0f9ff;border:1px solid #93c5fd;vertical-align:middle"></span> Foreign key row</span>
</div>

<footer>
  EduSphere Backend — PostgreSQL schema via Drizzle ORM &nbsp;·&nbsp; ${tables.length} tables &nbsp;·&nbsp; Regenerate: <code>npm run db:diagram</code>
</footer>

<script>
function filter(btn, cat) {
  document.querySelectorAll('.f-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.card').forEach(card => {
    const show = cat === 'all' || card.dataset.category === cat;
    card.classList.toggle('hidden', !show);
  });
}
</script>
</body>
</html>`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function run() {
  try {
    const tables = readSchemas();
    const html   = generateHTML(tables);
    fs.writeFileSync(OUTPUT, html, 'utf8');
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] schema-diagram.html updated — ${tables.length} tables, ${tables.reduce((n,t)=>n+t.columns.length,0)} columns, ${tables.reduce((n,t)=>n+t.columns.filter(c=>c.fkRef).length,0)} FK links`);
  } catch (err) {
    console.error('Error generating diagram:', err.message);
  }
}

const watchMode = process.argv.includes('--watch');

run(); // always run once immediately

if (watchMode) {
  console.log(`Watching ${path.relative(process.cwd(), SCHEMA_DIR)} for changes... (Ctrl+C to stop)\n`);

  let debounce = null;
  fs.watch(SCHEMA_DIR, { persistent: true }, (event, filename) => {
    if (!filename || !filename.endsWith('.ts')) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      console.log(`  changed: ${filename}`);
      run();
    }, 150); // 150ms debounce — catches editor multi-write
  });
}
