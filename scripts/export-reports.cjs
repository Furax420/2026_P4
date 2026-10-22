const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'rapports');
const metrics = ['statements', 'branches', 'functions', 'lines'];
const labels = ['Instructions', 'Branches', 'Fonctions', 'Lignes'];
const suites = [
  { id: 'front', title: 'Front', tool: 'Vitest · React Testing Library', source: 'frontend/coverage/vitest' },
  { id: 'back', title: 'Back', tool: 'Vitest · Supertest · PostgreSQL', source: 'backend/coverage' },
  { id: 'e2e', title: 'E2E', tool: 'Cypress · Istanbul · NYC', source: 'frontend/coverage/e2e' },
];
const escape = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
const sourceFiles = git('ls-files', '-z', '--', 'backend', 'frontend', 'docker-compose.yml', 'scripts/check-integration-ratio.cjs').split('\0').filter(Boolean).sort();

function filesIn(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relative = prefix + entry.name;
    return entry.isDirectory()
      ? filesIn(path.join(directory, entry.name), relative + '/')
      : [relative];
  });
}

// Validate every input before replacing the saved reports.
for (const suite of suites) {
  const source = path.join(root, suite.source);
  const reportTime = fs.statSync(path.join(source, 'coverage-summary.json')).mtime;
  suite.generatedAt = reportTime.toISOString();
  const inputs = sourceFiles.filter((file) => suite.id === 'e2e' || file.startsWith(suite.id === 'front' ? 'frontend/' : 'backend/'));
  if (inputs.some((file) => fs.statSync(path.join(root, file)).mtimeMs > reportTime.getTime())) {
    throw new Error(`${suite.id}: source files changed after the report; rerun the complete suite`);
  }
  suite.coverage = readJson(path.join(source, 'coverage-summary.json')).total;
  for (const metric of metrics) {
    const actual = suite.coverage[metric]?.pct;
    if (typeof actual !== 'number' || actual < 80) throw new Error(`${suite.id}: ${metric} is below 80%`);
  }
  if (!fs.existsSync(path.join(source, 'index.html'))) throw new Error(`${suite.id}: missing HTML report`);
  suite.pages = filesIn(source).filter((file) => file.endsWith('.html') && !file.startsWith('lcov-report/') && !file.endsWith('index.html')).sort();
  if (suite.id !== 'e2e') {
    const result = readJson(path.join(source, 'test-results.json'));
    if (!result.success || result.numFailedTests || result.numPendingTests || !result.numPassedTests) {
      throw new Error(`${suite.id}: all tests must run and pass`);
    }
    suite.tests = result.numPassedTests;
    suite.integration = result.testResults.reduce((count, testFile) => count + (
      testFile.name.replaceAll('\\', '/').includes('/tests/integration/')
        ? testFile.assertionResults.filter((test) => test.status === 'passed').length : 0
    ), 0);
    if (suite.integration / suite.tests < 0.3) throw new Error(`${suite.id}: integration ratio is below 30%`);
  }
}

const hash = crypto.createHash('sha256');
for (const file of sourceFiles) hash.update(file).update('\0').update(fs.readFileSync(path.join(root, file))).update('\0');
const now = new Date();
const manifest = {
  generatedAt: now.toISOString(),
  validatedAt: suites.map((suite) => suite.generatedAt).sort().at(-1),
  sourceCommit: git('rev-parse', 'HEAD'),
  sourceSha256: hash.digest('hex'),
  sourceChanges: git('diff', 'HEAD', '--name-only', '--', 'backend', 'frontend', 'docker-compose.yml', 'scripts/check-integration-ratio.cjs'),
  node: process.version,
  suites: suites.map(({ id, source, coverage, tests, integration, pages, generatedAt }) => ({ id, source, coverage, tests, integration, sourceFiles: pages.length, generatedAt })),
};
fs.mkdirSync(output, { recursive: true });
for (const suite of suites) {
  const target = path.resolve(output, suite.id);
  // Only these three fixed directories inside rapports may be replaced.
  if (path.dirname(target) !== output || !['front', 'back', 'e2e'].includes(path.basename(target))) throw new Error('Invalid report destination');
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(path.join(root, suite.source), target, { recursive: true });
}
fs.writeFileSync(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const date = new Date(manifest.validatedAt).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' });
const percentage = (value) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value) + ' %';
const cards = suites.map((suite, index) => `
    <article class="card" aria-labelledby="${suite.id}-title">
      <div class="card-top"><span class="number">0${index + 1}</span><span class="badge">Seuils atteints</span></div>
      <h2 id="${suite.id}-title">${suite.title}</h2>
      <p class="tool">${escape(suite.tool)}</p>
      <p class="scope">${suite.tests ? `${suite.tests} tests réussis · ${suite.integration} intégrations` : 'Parcours dans un vrai navigateur'}</p>
      <dl class="metrics">${metrics.map((metric, i) => `<div><dt>${labels[i]}</dt><dd>${percentage(suite.coverage[metric].pct)}</dd></div>`).join('')}</dl>
      <a class="button" href="rapports/${suite.id}/index.html">Explorer le rapport <span aria-hidden="true">↗</span></a>
      <details><summary>${suite.pages.length} fichiers couverts</summary><ul class="sources">${suite.pages.map((file) => `<li><a href="rapports/${suite.id}/${encodeURI(file)}">${escape(file.replace(/\.html$/, ''))}</a></li>`).join('')}</ul></details>
      <div class="downloads"><a href="rapports/${suite.id}/coverage-summary.json">Synthèse JSON</a><a href="rapports/${suite.id}/lcov.info">LCOV</a>${suite.tests ? `<a href="rapports/${suite.id}/test-results.json">Résultats des tests</a>` : ''}</div>
    </article>`).join('');

const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Rapports de couverture front, back et E2E du projet Yoga Studio.">
  <title>Rapports de tests — Yoga Studio</title>
  <style>
    :root{color-scheme:light;--paper:#f7f8f3;--ink:#1c352c;--muted:#52675e;--line:#dce3d9;--accent:#dcefad}
    *{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6}
    a{color:inherit;text-underline-offset:3px}a:focus-visible,summary:focus-visible{outline:3px solid #687d2c;outline-offset:5px;border-radius:3px}
    .shell{width:min(1180px,calc(100% - 48px));margin:auto}.topbar{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:26px 0;border-bottom:1px solid var(--line)}
    .brand{font-size:14px;font-weight:750;letter-spacing:.12em;display:flex;align-items:center;gap:12px}.mark{display:grid;place-items:center;width:36px;height:36px;border-radius:50%;background:var(--ink);color:var(--accent);font-size:18px}
    .date{color:var(--muted);font-size:13px}header{padding:32px 0 22px}.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:700;color:var(--muted)}
    h1{font-size:clamp(34px,4vw,48px);line-height:1.1;letter-spacing:-.045em;font-weight:650;margin:14px 0 20px}.intro{max-width:650px;font-size:17px;color:var(--muted);margin:0}
    .facts{display:flex;gap:36px;flex-wrap:wrap;padding:12px 0 24px;font-size:14px}.facts strong{font-size:22px;font-weight:650;margin-right:7px}.facts span{color:var(--muted)}
    .grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start}.card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 4px 16px #26392b04}
    .card-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.number{font-size:13px;font-weight:700;color:var(--muted)}.badge{font-size:11px;font-weight:700;background:#eff5e4;color:#395228;padding:5px 10px;border-radius:30px}
    h2{font-size:30px;letter-spacing:-.025em;font-weight:650;margin:20px 0 2px}.tool{font-size:12px;color:var(--muted);margin:0}.scope{font-size:12px;margin:14px 0 20px;color:var(--muted);min-height:20px}
    .metrics{margin:0 0 22px}.metrics div{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-top:1px solid #edf0e9}.metrics dt{font-size:13px;color:var(--muted)}.metrics dd{margin:0;font-size:16px;font-weight:650;font-variant-numeric:tabular-nums}
    .button{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 15px;border-radius:9px;background:var(--ink);color:#fff;text-decoration:none;font-size:13px;font-weight:650}.button:hover{background:#315444}.button span{color:var(--accent);font-size:19px}
    details{margin-top:18px;border-bottom:1px solid var(--line);padding-bottom:16px}summary{cursor:pointer;font-size:13px;color:var(--muted)}.sources{padding-left:17px;font-size:12px;overflow-wrap:anywhere}.sources li{margin:7px 0}.downloads{display:flex;flex-wrap:wrap;gap:8px 14px;font-size:11px;color:var(--muted);padding-top:15px}
    .help{margin:30px 0 40px;padding:22px 26px;background:#eaf0df;border-radius:14px;display:grid;grid-template-columns:1fr 2fr;gap:22px;font-size:13px}.help h2{font-size:16px;margin:0}.help p{margin:0;color:#405448}
    footer{border-top:1px solid var(--line);padding:22px 0 32px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:12px;color:var(--muted)}code{font-size:12px}
    @media(max-width:900px){.grid{grid-template-columns:1fr}.card{padding:24px}.help{grid-template-columns:1fr;gap:8px}.scope{min-height:0}}
    @media(max-width:480px){.shell{width:calc(100% - 32px)}.topbar{align-items:flex-start;flex-direction:column;gap:8px}header{padding-top:36px}.facts{gap:12px 24px}}
    @media print{body{background:white}.grid{grid-template-columns:repeat(3,minmax(0,1fr))}.card{padding:15px;box-shadow:none}.button{background:none;color:var(--ink);border:1px solid var(--line)}.downloads,details{display:none}}
  </style>
</head>
<body>
<div class="shell">
  <div class="topbar"><div class="brand"><span class="mark" aria-hidden="true">Y</span>YOGA STUDIO</div><span class="date">Validation du <time datetime="${manifest.validatedAt}">${date}</time></span></div>
  <header><div class="eyebrow">Projet P4 · Qualité du code</div><h1>Rapports de tests</h1><p class="intro">Trois suites complémentaires pour vérifier les comportements de l’application. Choisissez un rapport ou accédez directement au détail d’un fichier.</p></header>
  <div class="facts"><div><strong>3</strong><span>rapports complets</span></div><div><strong>80 %</strong><span>minimum par indicateur</span></div><div><strong>Hors ligne</strong><span>consultation sans installation</span></div></div>
  <main aria-label="Rapports de couverture"><div class="grid">${cards}
  </div><aside class="help"><h2>Comment lire un rapport ?</h2><p>Ouvrez une suite, puis un fichier pour voir les lignes exécutées, les branches et les portions non couvertes. Les pourcentages sont calculés pour chaque suite ; une couverture élevée ne garantit pas l’absence de bugs.</p></aside></main>
  <footer><span>Code vérifié : <code>${escape(manifest.sourceCommit.slice(0, 7))}</code> · Copies datées, conservées dans le dépôt.</span><a href="rapports/manifest.json">Détails de la validation</a></footer>
</div>
</body>
</html>
`;
fs.writeFileSync(path.join(root, 'rapports.html'), html);
console.log(`Saved ${suites.length} complete reports and rapports.html for ${manifest.sourceCommit.slice(0, 7)}.`);
