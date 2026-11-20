// Static self-check: node verify.js
// Catches copy drift and broken markup that caused past releases to ship broken.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const failures = [];
const check = (ok, msg) => { if (!ok) failures.push(msg); };

const htmlCopies = [
  'index.html',
  'android/app/src/main/assets/index.html',
  'android_build/project/assets/index.html'
];

for (const file of htmlCopies) {
  const html = read(file);
  const depth = [...html.matchAll(/<div\b|<\/div>/g)]
    .reduce((n, m) => n + (m[0] === '</div>' ? -1 : 1), 0);
  check(depth === 0, `${file}: unbalanced div tags (depth ${depth})`);

  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
  for (const js of ['app.js', 'google-sync.js']) {
    const code = read(js);
    for (const m of code.matchAll(/getElementById\('([^']+)'\)/g)) {
      const id = m[1];
      const dynamic = ['btnEmptyScheduleProgram', 'btnRequestCallPermPrompt'];
      const legacy = ['androidWifiSyncUrl', 'btnCopyWifiUrl', 'btnForceWifiSync', 'btnSyncNowGlobal', 'mobileNavSync', 'wifiSyncIndicator', 'wifiSyncStatusText'];
      check(ids.has(id) || dynamic.includes(id) || legacy.includes(id), `${file}: #${id} referenced by ${js} but absent`);
    }
  }
}

for (const file of ['android/app/src/main/assets', 'android_build/project/assets']) {
  for (const asset of ['index.html', 'styles.css', 'app.js', 'google-sync.js', 'manifest.json', 'service-worker.js']) {
    check(read(asset) === read(path.join(file, asset)), `${file}/${asset} is stale — run build-native-apk.ps1`);
  }
}

const versions = [
  ['app.js', "const APP_VERSION = '1.0.5'"],
  ['index.html', 'v1.0.5'],
  ['google-sync.js', "version: '1.0.5'"],
  ['README.md', 'Version 1.0.5']
];
for (const [file, needle] of versions) {
  check(read(file).includes(needle), `${file}: version string missing (${needle})`);
}

check(!read('app.js').includes('playLevelUpSound'), 'app.js still calls the missing playLevelUpSound');

const requiredFiles = [
  'android_build/project/src/com/bisrat/orbit/ReminderWidgetProvider.java',
  'android_build/project/res/xml/reminder_widget_info.xml',
  'android_build/project/res/layout/reminder_widget.xml',
  'android/app/src/main/java/com/bisrat/orbit/OrbitReminderService.java',
  'android/app/src/main/java/com/bisrat/orbit/BootReceiver.java',
  'android/app/src/main/res/layout/notification_reminder.xml',
  'android/app/src/main/res/drawable/ic_stat_orbit.png',
  'icons/icon-96.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icon-master.png',
  'start-local.bat', 'start-local.ps1'
];
for (const file of requiredFiles) {
  try { fs.accessSync(path.join(root, file)); } catch (e) { failures.push(`missing ${file}`); }
}

check(!read('index.html').includes('fonts.googleapis.com'), 'index.html still loads remote fonts (offline UI depends on system fonts)');
const manifest = read('android/app/src/main/AndroidManifest.xml');
check(manifest.includes('OrbitReminderService') && manifest.includes('BootReceiver'), 'Android manifest missing reminder service or boot receiver');
check(!manifest.includes('READ_PHONE_STATE'), 'manifest still requests unused READ_PHONE_STATE');
check(manifest.includes('android:allowBackup="false"'), 'manifest still allows automatic device backup');
check(!read('index.html').includes('accounts.google.com/gsi/client'), 'index.html still loads Google Identity on every launch');
check(read('app.js').includes("querySelectorAll('.nav-item')"), 'bottom-nav selectors were not updated');

const htmlIds = [...read('index.html').matchAll(/id="([^"]+)"/g)].map(m => m[1]);
const duplicateIds = htmlIds.filter((id, i) => htmlIds.indexOf(id) !== i);
check(duplicateIds.length === 0, `duplicate element IDs: ${[...new Set(duplicateIds)].join(', ')}`);
for (const nav of ['circle', 'callbacks', 'calendar', 'settings']) {
  check(read('index.html').includes(`data-nav="${nav}"`), `bottom nav missing ${nav} button`);
}
check(read('index.html').includes('id="mobileFabAdd"'), 'bottom nav missing add-friend button');

if (failures.length) {
  console.error('verify: FAILED\n- ' + failures.join('\n- '));
  process.exit(1);
}
console.log('verify: OK');
