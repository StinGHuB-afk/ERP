const { chromium } = require('playwright');
chromium.launch({ headless: true }).then(b => {
  console.log('Playwright OK');
  return b.close();
}).then(() => process.exit(0)).catch(e => { console.error('FAIL:', e.message); process.exit(1); });
