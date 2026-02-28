/**
 * WhatsApp Bot Dashboard Server v2
 * Run: node server.js
 * Open: http://localhost:3000
 * Place this file in the SAME folder as your bot.js
 */

const express = require('express');
const fs      = require('fs');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

// ── CONFIG ─────────────────────────────────────────────────────────────────
const BOT_FILE      = path.join(__dirname, 'bot.js'); // ← CHANGE THIS to your bot filename
const PB_FILE       = path.join(__dirname, 'phonebook.json');
const LOGS_FILE     = path.join(__dirname, 'dashboard-logs.json');
const CRON_FILE     = path.join(__dirname, 'cron-times.json');

// ── HELPERS ────────────────────────────────────────────────────────────────

function extractBlock(src, varName) {
  const start = src.search(new RegExp(`const ${varName}\\s*=\\s*`));
  if (start === -1) return null;
  const afterEq = src.indexOf('=', start) + 1;
  let i = afterEq;
  while (i < src.length && /\s/.test(src[i])) i++;
  const opener = src[i], closer = opener === '{' ? '}' : opener === '[' ? ']' : null;
  if (!closer) return null;
  let depth = 0, end = i;
  for (; end < src.length; end++) {
    if (src[end] === opener) depth++;
    else if (src[end] === closer) { depth--; if (depth === 0) { end++; break; } }
  }
  return { raw: src.slice(i, end), from: i, to: end };
}

function safeEval(str) {
  try { return Function('"use strict"; return (' + str + ')')(); } catch { return null; }
}

function replaceBlock(src, varName, newValueStr) {
  const block = extractBlock(src, varName);
  if (!block) return src;
  return src.slice(0, block.from) + newValueStr + src.slice(block.to);
}

function replaceScalar(src, varName, newValue) {
  return src.replace(new RegExp(`(const ${varName}\\s*=\\s*)[^;\\n]+`), `$1${newValue}`);
}

const pretty = obj => JSON.stringify(obj, null, 2);

function serverLog(type, msg) {
  const logs = loadJSON(LOGS_FILE, []);
  const time = new Date().toTimeString().slice(0, 8);
  logs.unshift({ time, type, msg });
  if (logs.length > 200) logs.splice(200);
  fs.writeFileSync(LOGS_FILE, JSON.stringify(logs));
}

function loadJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return def; }
}

// ── GET CONFIG ─────────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  try {
    const src = fs.readFileSync(BOT_FILE, 'utf8');
    const b   = name => { const bl = extractBlock(src, name); return bl ? safeEval(bl.raw) : null; };
    const s   = (pattern, def='') => { const m = src.match(pattern); return m ? m[1] : def; };

    res.json({
      schedule: {
        sendHour:   parseInt(s(/const SEND_HOUR\s*=\s*(\d+)/, '8')),
        sendMinute: parseInt(s(/const SEND_MINUTE\s*=\s*(\d+)/, '45')),
        monthlyDay: parseInt(s(/const MONTHLY_DAY\s*=\s*(\d+)/, '10')),
        weeklyDay:  parseInt(s(/const WEEKLY_DAY\s*=\s*(\d+)/, '5')),
      },
      criticalName:   s(/const CRITICAL_GROUP_NAME\s*=\s*'([^']+)'/),
      criticalName2:  s(/const CRITICAL_GROUP_NAME_2\s*=\s*'([^']+)'/),
      vcLabGroupName: s(/const VC_LAB_GROUP_NAME\s*=\s*'([^']+)'/),
      vcLabMessage:   s(/const VC_LAB_MESSAGE\s*=\s*\n?'([^']+)'/),
      fixedGroups:     b('FIXED_GROUP_MESSAGES') || {},
      monthlyGroups:   b('MONTHLY_GROUPS')       || {},
      weeklyGroups:    b('WEEKLY_GROUPS')         || {},
      criticalTasks:   b('CRITICAL_TASKS')        || [],
      criticalTasks2:  b('CRITICAL_TASKS_2')      || [],
      listGroups:      b('LIST_GROUPS')            || {},
      defaultMessages: b('DEFAULT_MESSAGES')       || [],
      hrMessages:      b('HR_MESSAGES')            || [],
    });
    serverLog('ok', 'Config read successfully');
  } catch (e) {
    serverLog('err', 'Config read error: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SAVE CONFIG ────────────────────────────────────────────────────────────

app.post('/api/save', (req, res) => {
  try {
    let src = fs.readFileSync(BOT_FILE, 'utf8');
    const { section, data } = req.body;

    if (section === 'schedule') {
      src = replaceScalar(src, 'SEND_HOUR',   data.sendHour);
      src = replaceScalar(src, 'SEND_MINUTE', data.sendMinute);
      src = replaceScalar(src, 'MONTHLY_DAY', data.monthlyDay);
      src = replaceScalar(src, 'WEEKLY_DAY',  data.weeklyDay);
    } else if (section === 'fixedGroups')    { src = replaceBlock(src, 'FIXED_GROUP_MESSAGES', pretty(data)); }
    else if (section === 'monthlyGroups')    { src = replaceBlock(src, 'MONTHLY_GROUPS', pretty(data)); }
    else if (section === 'weeklyGroups')     { src = replaceBlock(src, 'WEEKLY_GROUPS', pretty(data)); }
    else if (section === 'criticalTasks')    { src = replaceBlock(src, 'CRITICAL_TASKS', pretty(data)); }
    else if (section === 'criticalTasks2')   { src = replaceBlock(src, 'CRITICAL_TASKS_2', pretty(data)); }
    else if (section === 'listGroups')       { src = replaceBlock(src, 'LIST_GROUPS', pretty(data)); }
    else if (section === 'defaultMessages')  { src = replaceBlock(src, 'DEFAULT_MESSAGES', pretty(data)); }
    else if (section === 'hrMessages')       { src = replaceBlock(src, 'HR_MESSAGES', pretty(data)); }
    else if (section === 'vcLab') {
      src = src.replace(/const VC_LAB_GROUP_NAME\s*=\s*'[^']*'/, `const VC_LAB_GROUP_NAME = '${data.name}'`);
      src = src.replace(/const VC_LAB_MESSAGE\s*=\s*\n?'[^']*'/, `const VC_LAB_MESSAGE =\n'${data.msg}'`);
    }
    else { return res.status(400).json({ error: 'Unknown section: ' + section }); }

    fs.writeFileSync(BOT_FILE, src, 'utf8');
    serverLog('ok', `Saved section: ${section}`);
    res.json({ ok: true });
  } catch (e) {
    serverLog('err', 'Save error: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SENT TODAY ─────────────────────────────────────────────────────────────

app.get('/api/sent-today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const file  = path.join(__dirname, `sent-${today}.json`);
  res.json(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {});
});

app.delete('/api/sent-today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const file  = path.join(__dirname, `sent-${today}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  serverLog('warn', 'Sent-today log cleared via dashboard');
  res.json({ ok: true });
});

// ── BACKUP ─────────────────────────────────────────────────────────────────

app.get('/api/backup', (req, res) => {
  try {
    const src = fs.readFileSync(BOT_FILE, 'utf8');
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Disposition', `attachment; filename="bot-backup-${date}.js"`);
    res.setHeader('Content-Type', 'text/javascript');
    res.send(src);
    serverLog('ok', 'Backup downloaded');
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── GROUPS LIST ────────────────────────────────────────────────────────────

app.get('/api/groups', (req, res) => {
  const file = path.join(__dirname, 'groups-list.json');
  res.json(fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []);
});

// ── PHONE BOOK ─────────────────────────────────────────────────────────────

app.get('/api/phonebook', (req, res) => {
  res.json(loadJSON(PB_FILE, {}));
});

app.post('/api/phonebook', (req, res) => {
  try {
    fs.writeFileSync(PB_FILE, JSON.stringify(req.body, null, 2));
    serverLog('ok', 'Phone book saved (' + Object.keys(req.body).length + ' contacts)');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── LOGS ───────────────────────────────────────────────────────────────────

app.get('/api/logs', (req, res) => {
  res.json(loadJSON(LOGS_FILE, []));
});

app.delete('/api/logs', (req, res) => {
  fs.writeFileSync(LOGS_FILE, '[]');
  res.json({ ok: true });
});

// ── CRON TIMES ─────────────────────────────────────────────────────────────

app.get('/api/cron-times', (req, res) => {
  res.json(loadJSON(CRON_FILE, {
    critical: ['0 9', '0 14'],
    vclab:    ['5 9', '45 11', '47 14', '2 16']
  }));
});

app.post('/api/cron-times', (req, res) => {
  try {
    const { key, times } = req.body;
    const current = loadJSON(CRON_FILE, { critical: ['0 9', '0 14'], vclab: ['5 9', '45 11', '47 14', '2 16'] });
    current[key] = times;
    fs.writeFileSync(CRON_FILE, JSON.stringify(current, null, 2));

    // Also patch bot.js cron lines
    let src = fs.readFileSync(BOT_FILE, 'utf8');

    if (key === 'critical') {
      const cronLines = times.map(t => {
        const [min, hr] = t.split(' ');
        return `cron.schedule(\`${min} ${hr} * * *\`, sendCriticalReminder)`;
      });
      // Replace existing critical cron lines
      src = src.replace(
        /cron\.schedule\(`\d+ \d+ \* \* \*`, sendCriticalReminder\);\s*\n\s*cron\.schedule\(`\d+ \d+ \* \* \*`, sendCriticalReminder\)/,
        cronLines.join(';\n  ')
      );
    }

    if (key === 'vclab') {
      const cronLines = times.map(t => {
        const [min, hr] = t.split(' ');
        return `cron.schedule(\`${min} ${hr} * * *\`, sendVCLabReminder)`;
      });
      // Replace existing vclab cron lines (all consecutive ones)
      src = src.replace(
        /(cron\.schedule\(`\d+ \d+ \* \* \*`, sendVCLabReminder\);\s*\n\s*){1,6}cron\.schedule\(`\d+ \d+ \* \* \*`, sendVCLabReminder\)/,
        cronLines.join(';\n  ')
      );
    }

    fs.writeFileSync(BOT_FILE, src, 'utf8');
    serverLog('ok', `Cron times updated for: ${key}`);
    res.json({ ok: true });
  } catch (e) {
    serverLog('err', 'Cron save error: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── MANUAL SEND ────────────────────────────────────────────────────────────
// This endpoint writes a "pending send" file that your bot.js checks and executes.
// Add the bot-side handler below to your bot.js.

app.post('/api/send', (req, res) => {
  try {
    const { group, msg } = req.body;
    if (!group || !msg) return res.status(400).json({ error: 'group and msg required' });

    const pendingFile = path.join(__dirname, 'pending-send.json');
    const pending = loadJSON(pendingFile, []);
    pending.push({ group, msg, timestamp: Date.now() });
    fs.writeFileSync(pendingFile, JSON.stringify(pending, null, 2));

    serverLog('ok', `Manual send queued → "${group}"`);
    res.json({ ok: true });
  } catch (e) {
    serverLog('err', 'Send queue error: ' + e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── SERVE DASHBOARD ────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// ── START ──────────────────────────────────────────────────────────────────

app.listen(3000, () => {
  console.log('');
  console.log('✅ Dashboard server running');
  console.log('🌐 Open: http://localhost:3000');
  console.log('');
  serverLog('info', 'Dashboard server started');
});
