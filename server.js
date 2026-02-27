/**
 * WhatsApp Bot Dashboard Server
 * Run: node server.js
 * Open: http://localhost:3000
 * Place this file in the SAME folder as your bot.js
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

const BOT_FILE = path.join(__dirname, 'bot.js'); // <-- change to your bot filename

// ─── Helper: extract a JS object/value between markers ───────────────────────

function extractBlock(src, varName) {
  const regex = new RegExp(`const ${varName}\\s*=\\s*`);
  const start = src.search(regex);
  if (start === -1) return null;
  const afterEq = src.indexOf('=', start) + 1;
  let i = afterEq;
  while (i < src.length && /\s/.test(src[i])) i++;
  const opener = src[i];
  const closer = opener === '{' ? '}' : opener === '[' ? ']' : null;
  if (!closer) return null;
  let depth = 0, end = i;
  for (; end < src.length; end++) {
    if (src[end] === opener) depth++;
    else if (src[end] === closer) { depth--; if (depth === 0) { end++; break; } }
  }
  return { raw: src.slice(i, end), from: i, to: end };
}

function extractScalar(src, varName) {
  const m = src.match(new RegExp(`const ${varName}\\s*=\\s*([^;\\n]+)`));
  return m ? m[1].trim() : null;
}

// ─── READ bot config ──────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  try {
    const src = fs.readFileSync(BOT_FILE, 'utf8');

    // Safe eval helper using Function constructor
    const safeEval = (str) => {
      try { return Function('"use strict"; return (' + str + ')')(); } catch { return null; }
    };

    const fixedBlock   = extractBlock(src, 'FIXED_GROUP_MESSAGES');
    const monthlyBlock = extractBlock(src, 'MONTHLY_GROUPS');
    const weeklyBlock  = extractBlock(src, 'WEEKLY_GROUPS');
    const criticalBlock  = extractBlock(src, 'CRITICAL_TASKS');
    const criticalBlock2 = extractBlock(src, 'CRITICAL_TASKS_2');
    const listBlock    = extractBlock(src, 'LIST_GROUPS');
    const defaultMsgBlock = extractBlock(src, 'DEFAULT_MESSAGES');
    const hrMsgBlock   = extractBlock(src, 'HR_MESSAGES');

    const hourMatch  = src.match(/const SEND_HOUR\s*=\s*(\d+)/);
    const minMatch   = src.match(/const SEND_MINUTE\s*=\s*(\d+)/);
    const monthlyDay = src.match(/const MONTHLY_DAY\s*=\s*(\d+)/);
    const weeklyDay  = src.match(/const WEEKLY_DAY\s*=\s*(\d+)/);
    const adminId    = src.match(/const ADMIN_GROUP_ID\s*=\s*'([^']+)'/);
    const critName   = src.match(/const CRITICAL_GROUP_NAME\s*=\s*'([^']+)'/);
    const critName2  = src.match(/const CRITICAL_GROUP_NAME_2\s*=\s*'([^']+)'/);
    const vcName     = src.match(/const VC_LAB_GROUP_NAME\s*=\s*'([^']+)'/);
    const vcMsg      = src.match(/const VC_LAB_MESSAGE\s*=\s*\n?'([^']+)'/);

    res.json({
      schedule: {
        sendHour:   hourMatch  ? parseInt(hourMatch[1])  : 8,
        sendMinute: minMatch   ? parseInt(minMatch[1])   : 45,
        monthlyDay: monthlyDay ? parseInt(monthlyDay[1]) : 10,
        weeklyDay:  weeklyDay  ? parseInt(weeklyDay[1])  : 5,
      },
      adminGroupId:    adminId  ? adminId[1]  : '',
      criticalName:    critName  ? critName[1]  : '',
      criticalName2:   critName2 ? critName2[1] : '',
      vcLabGroupName:  vcName   ? vcName[1]   : '',
      vcLabMessage:    vcMsg    ? vcMsg[1]    : '',
      fixedGroups:     fixedBlock   ? safeEval(fixedBlock.raw)   : {},
      monthlyGroups:   monthlyBlock ? safeEval(monthlyBlock.raw) : {},
      weeklyGroups:    weeklyBlock  ? safeEval(weeklyBlock.raw)  : {},
      criticalTasks:   criticalBlock  ? safeEval(criticalBlock.raw)  : [],
      criticalTasks2:  criticalBlock2 ? safeEval(criticalBlock2.raw) : [],
      listGroups:      listBlock   ? safeEval(listBlock.raw)   : {},
      defaultMessages: defaultMsgBlock ? safeEval(defaultMsgBlock.raw) : [],
      hrMessages:      hrMsgBlock   ? safeEval(hrMsgBlock.raw)   : [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── WRITE a section back ─────────────────────────────────────────────────────

function replaceBlock(src, varName, newValueStr) {
  const block = extractBlock(src, varName);
  if (!block) return src;
  return src.slice(0, block.from) + newValueStr + src.slice(block.to);
}

function replaceScalar(src, varName, newValue) {
  return src.replace(
    new RegExp(`(const ${varName}\\s*=\\s*)[^;\\n]+`),
    `$1${newValue}`
  );
}

app.post('/api/save', (req, res) => {
  try {
    let src = fs.readFileSync(BOT_FILE, 'utf8');
    const { section, data } = req.body;

    const pretty = (obj) => JSON.stringify(obj, null, 2);

    if (section === 'schedule') {
      src = replaceScalar(src, 'SEND_HOUR',   data.sendHour);
      src = replaceScalar(src, 'SEND_MINUTE', data.sendMinute);
      src = replaceScalar(src, 'MONTHLY_DAY', data.monthlyDay);
      src = replaceScalar(src, 'WEEKLY_DAY',  data.weeklyDay);
    }
    else if (section === 'fixedGroups')    src = replaceBlock(src, 'FIXED_GROUP_MESSAGES', pretty(data));
    else if (section === 'monthlyGroups')  src = replaceBlock(src, 'MONTHLY_GROUPS', pretty(data));
    else if (section === 'weeklyGroups')   src = replaceBlock(src, 'WEEKLY_GROUPS', pretty(data));
    else if (section === 'criticalTasks')  src = replaceBlock(src, 'CRITICAL_TASKS', pretty(data));
    else if (section === 'criticalTasks2') src = replaceBlock(src, 'CRITICAL_TASKS_2', pretty(data));
    else if (section === 'listGroups')     src = replaceBlock(src, 'LIST_GROUPS', pretty(data));
    else if (section === 'defaultMessages') src = replaceBlock(src, 'DEFAULT_MESSAGES', pretty(data));
    else if (section === 'hrMessages')     src = replaceBlock(src, 'HR_MESSAGES', pretty(data));
    else return res.status(400).json({ error: 'Unknown section' });

    fs.writeFileSync(BOT_FILE, src, 'utf8');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── TODAY SENT STATUS ────────────────────────────────────────────────────────

app.get('/api/sent-today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const file  = path.join(__dirname, `sent-${today}.json`);
  if (!fs.existsSync(file)) return res.json({});
  res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
});

app.delete('/api/sent-today', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const file  = path.join(__dirname, `sent-${today}.json`);
  if (fs.existsSync(file)) fs.unlinkSync(file);
  res.json({ ok: true });
});

// ─── Serve dashboard ──────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

app.listen(3000, () => {
  console.log('✅ Dashboard running at http://localhost:3000');
});
