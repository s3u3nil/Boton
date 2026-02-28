const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cron = require('node-cron');
const fs = require('fs');

// ================= SETTINGS =================

const SEND_HOUR = 8;
const SEND_MINUTE = 45;

const ADMIN_GROUP_ID = '120363420632237968@g.us';

let BOT_PAUSED = false;
let IS_SENDING = false;

// ================= MONTHLY CONFIG =================

const MONTHLY_DAY = 10;

const MONTHLY_GROUPS = {
  'Rent vikaspuri': '🔆 Monthly Reminder: Screenshot of Rental Payment may please be shared',
  'Rent WTC': '🔆 Monthly Reminder: Screenshot of Rental Payment may please be shared',
  'DLF Valley Rental Monthly Follow-Up': '🔆 Monthly Reminder: Screenshot of Rental Payment may please be shared'
};

// ================= WEEKLY CONFIG =================

const WEEKLY_DAY = 5;

const WEEKLY_GROUPS = {
  'Gloster Bills':
    '🔆 Weekly Reminder: Ajay Sir to kindly share the update on pending bills of HOS as shared.'
};

// ================= DAILY MESSAGE VARIATIONS =================

const DEFAULT_MESSAGES = [
  "🔆 Reminder:\nAll concern Engineers/Architects/Staff/Faculty requested to update the status of work in this group. *(Daily DPR is Mandatory)*",
  "🔆  Gentle Reminder:\nEngineers/Architects/Staff/Faculty Please update today's work status in this group. *(Daily DPR is Mandatory)*",
  "🔆 Update Request:\nEngineers/Architects/Staff/Faculty Kindly share current work progress status. *(Daily DPR and Work Progress Photos are Mandatory)*"
];

const HR_MESSAGES = [
`🔆 Reminder:
HR team to please expedite the requirement process for Construction, Design cell etc.`,
`🔆 Follow-up:
HR Team Kindly prioritize and update recruitment status for ongoing requirements.`,
`🔆 Status Request:
HR team please update progress on pending manpower requirements.`
];

// ================= FIXED GROUP MESSAGES =================

const FIXED_GROUP_MESSAGES = {
   'URGENT MEDIA LSAD':
    '🔆 Reminder: Coordinator to please report to HOS office by today along with updated Status of allocated task.',
  'Vikaspuri Flat':
    '🔆 Reminder: Anju Madam to please share the updated Status on daily basis.',
  'COA Inspection 2025-26':
    '🔆 Reminder: Coordinator to please report to HOS office by today along with updated Status of allocated task. HOD to ensure timely compliance.',
  'LSAD Beautification 🟧':
    '🔆 Reminder: Concerned Individual to please share the status of the allocated task to HOS office.',
  'Architecture content':
    '🔆 Reminder: Media Coordinator/Faculty to please ensure minimum 04 posts (weekly) are shared on all social media platforms.',
  'Hyde Park - other group':
    '🔆 Reminder: Saurav Sir to please share the updated status of the allocated task on daily basis to HOS office.',
  '1 LSAD - HEADS.':
    '🔆 Reminder: Domain Heads to please ensure timely compliance of all tasks. Special attention to pinned tasks.',
  'LSAD Recruitment':
    '🔆 Reminder: HR Team to please align recruitment as per requirement shared by LSAD & SOD-II domain heads.',
  'NIRF 2026 ACTION (Heads)':
    '🔆 Reminder: Domain Heads to coordinate with accreditation cell. Daily updates required.',
  'Khajurla Photos':    
    '🔆 Reminder: All concern to update',
  'Placements LSAD & SOD-II 🟥':
    '🔆 Reminder: Placement Coordinator to Discuss the Progress of Research Target of the School, Once in a week',
  'LSAD Admission Display Block-30':
    '🔆 Reminder: Admission Coordinators to Share the Progress on the Admission Display of Block-30',
  'LSAD • Research':
    '🔆 Reminder: Research Coordinator to Discuss the Progress of Research Target of the School, Once in a week',
  'HOS Sir CV':
    '🔆 Reminder: Please share status with HOS office and close the issue immediately',
  'Infra Block-6 Ductable ACs Purchase':
    '🔆 Reminder: Purchase of Copper wire for AC installation pending. Kindly expedite.',
  'LSAD  BRANDING':
    '🔆 Reminder: Share new ideas regarding LSAD branding and update discussed points',
  'Infra New Products/Ideas':
    '🔆 Reminder: For new products and ideas',
  'LSAD EDREV TARGETS 🔴':
    '🔆 Reminder: HODs to initiate activities and meetings on regular basis to promote EDUREV among students.',
  'LSAD - UMS Email, Bills check AKS acc':
    '🔆 Reminder: Deepak/Ajay/Vishal Sir to Post emails here on this group daily basis for the necessary intimation to HOS Sir',
  'IDEARCH / DMH':
    '🔆 Reminder:For Further Action .',
  '272 clothes iron':
    '🔆 Reminder: For 272 Clothes Iron ',
  'LSAD - Admissions reports Architecture/Design/Planning 2026 🟥':
    '🔆 Reminder : All conerned to Share the admission activity, posts, reports DPR.',
  'Drawing Issued Status':
    '🔆 Reminder: All Engineer to Provide the New & Updated Status of Above Drawings .',
  'LSAD - Follow-up':
    '🔆 Follow-up Request :HODS to revert on the allocated task specially the edurev Status to Hos office.',
  'Graphics Work ':
    '🔆 Reminder: All Graphic Designer/Staff to Update their Status Tasks (Daily DPR Is Mandatory).',
  'Zero energy zero carbon house':
    '🔆 Reminder: Concerned to please share update with HOS Sir',
'CDR Pending syllabus status':
    '🔆 Reminder: Concerned to please share update with HOS Sir',
'LSAD Cultural & Sports 🟧':
    '🔆 Reminder: Coordinator to share the Plan of Action for Cultural & Sports Activities planned for current semester',
'LSAD Industry Interface':
    '🔆 Reminder: Coordinator to share the Plan of Action against the allocated Target as per OBP and Plan of action to achieve the same',
'Spare parts of Gloster PB08 ET 6611':
    '🔆 Reminder: Concerned to please share update',
  'Online E-commerce/Product Selling AMAZON':
    '🔆 Reminder: Actual Utility Products must be created at LSAD Workshops, ensuring they can be readily sold on Online E-Commerce Platforms. All to share pictures and POA to facilitate the sale of these products.',
  'LSAD Admission Advert Campaign 🟧':
    '🔆 Reminder: The Admission Team is kindly requsested to initate the advertisement for the Architecture domain and to provide an update advertisement that is currently being run or boosted with HOS'
  // (keep your full list here same as before)
};

// ================= CRITICAL CONFIG =================

const CRITICAL_GROUP_NAME = 'Infra Critical Issues 🔴';


const CRITICAL_TASKS = [
    { text: "VC sir Lab 37-302", tag: "919988006682" },
  { text: "Lift of Block-35 - Sir for Block 35 lift two vendors are coming on 25/02/26   in campus for discussion", tag: "919876644338" },
  { text: "Heat Pump - Sir all work of heat pump done and comissioning will be done by 26.02.26 as confirmed by M/s AO Smith.", tag: "919876644338" },
  { text: "Crane - Comparison will be shown along with building heights by 25/02/26", tag: "919876644338" },
  { text: "Sliding door -Case sent to @Shilpa Madam mam and will be approved by today.", tag: "917814300330" },
  { text: "Mittal Contractor - ", tag: "919988006682" },
  { text: "New Infra Labs - ", tag: "918054913878" },
  { text: "Case Sent to @Shilpa Madam Mam. @Sanjeev kundra Electrical AD sir to coordinate ", tag: "919872668177" },
  { text: "MALL BLOCK ROAD NEAR BLOCK 15 PAVERS - ", tag: "918872711464" },
  { text: "ROUND ABOUT NEW FLEXES BLOCK 15 ROUND ABOUT - ", tag: "918699363400" },
  { text: "BOLLARDS ON PAVERS NEAR PROJECT STUDIO PARKING - ", tag: "919041475593" },
  { text: "STP of Paragpur - ", tag: "918427793671" },
  { text: "Silicon and Brickwork Cleaning Campus - ", tag: "919988006682" },
  { text: "Automation Parag - ", tag: "919876644338" },
  { text: "Lighting Parag - ", tag: "919876644338" },
  { text: "ROUND ABOUT ARCH- ", tag: "919888552797" },
  { text: "ROUND ABOUT GREENERY - ", tag: "919041475593" },
  { text: "ROAD NEAR MALL - ", tag: "918872711464" },
{ text: "*Solar water coolers installed at the Agriculture Farm* - Sir these inverter and batteries have been checked from the vendor Havells As per him both batteries and inverters are not practical for repair We are coordinating with PSPCL and JE was supposed to come  yesterday but now he promise to come tomorrow.  The area being rural and no nearby urban supply is available. So we trying to find shortest nearby feeder. ", tag: "91734751 8850" },
  { text: "BOLLARDS PARKING - ", tag: "918054913878" },
  { text: "ARCHITECTURE PORCH - ", tag: "919888552797" },
  { text: "ARCH ROAD MARKING - ", tag: "919888552797" },
 { text: "PIPES NEAR MGMT - ", tag: "917986747113" },
 { text: "ROOTS NEAR CHAN OFFICE - ", tags: ["919041475593","919041465629","917986881303" ]},
 { text: "PLANTERS CHAN OFFICE- ", tags: ["919041475593","919041465629","917986881303" ]},
 { text: "Plaza sculptures and plinth- ", tag: "919988006682"},
 { text: "Nylon Net for Safety- ", tags: ["919872720252","917508183822"]},
 { text: "PENALTY AND INCENTIVE SYSTEM PLANNING- ", tag: ""},
 { text: "BSF cantt sculpture vendor- ", tag: ""},
  // keep full list same
];
// ================= CRITICAL GROUP 2 =================

const CRITICAL_GROUP_NAME_2 = 'LSAD Critical Issues 🟥';


const CRITICAL_TASKS_2 = [
  {
    text: "Time problem related to Block Beautification ",
    tag: ""
  },
  {
    text: "Thesis Interaction with Final Year Students - On 10 and 11 March - Thesis interaction",
    tag: ""
  },

];


// ================= LIST GROUPS (Non-Critical Task Lists) =================

const LIST_GROUPS = {
  'SITE-272 Renovation': {
    title: 'SITE-272 Renovation',
    tasks: [
      "Bathroom paint",
      "Egg boiler",
      "Aarav cycles ",
      "Also clear basement - mosquitoes n smell coming",
      "Kitchen ground floor repair storage channels ",
      "Gas stove n burner giving problem ",
      "AC SERVICE ON SUNDAY ",
      "CLEARANCE OF OLD IRON SCRAP LYING IN BACK YARD "
    ]
  },


};
// ================= VC LAB GROUP =================

const VC_LAB_GROUP_NAME = 'VC sir Lab 37 - 302 P1 🔴';

const VC_LAB_MESSAGE =
'🔆 Reminder: Kindly review and update the status of Lab 37 - 302 .';

// ================= HELPERS =================

function getRotatedMessage(messages) {
  const days = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
  return messages[Math.floor(days / 2) % messages.length];
}

function isMonthlyDay() {
  const today = new Date();
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  return today.getDate() === Math.min(MONTHLY_DAY, lastDay);
}

function isWeeklyDay() {
  return new Date().getDay() === WEEKLY_DAY;
}

// ✅ 15–30 SECOND DELAY
function randomDelay() {
  const ms = Math.floor(Math.random() * (30000 - 15000 + 1)) + 15000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getTodayFile() {
  const today = new Date().toISOString().slice(0, 10);
  return `sent-${today}.json`;
}

function loadSentGroups() {
  if (!fs.existsSync(getTodayFile())) return {};
  return JSON.parse(fs.readFileSync(getTodayFile(), 'utf8'));
}

function markGroupSent(groupName) {
  const data = loadSentGroups();
  data[groupName] = true;
  fs.writeFileSync(getTodayFile(), JSON.stringify(data, null, 2));
}

function getDailyMessage(groupName) {
  if (FIXED_GROUP_MESSAGES[groupName]) return FIXED_GROUP_MESSAGES[groupName];
  if (groupName.toLowerCase().includes('recruitment')) {
    return getRotatedMessage(HR_MESSAGES);
  }
  return getRotatedMessage(DEFAULT_MESSAGES);
}

// ================= WHATSAPP CLIENT =================

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: './auth' }),
  puppeteer: {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    protocolTimeout: 180000
  },
  takeoverOnConflict: true,
  takeoverTimeoutMs: 0,
  authTimeoutMs: 180000,
  markOnlineOnConnect: false
});

// ================= QR =================

client.on('qr', qr => {
  console.log('📱 Scan QR Code');
  qrcode.generate(qr, { small: true });
});

// ================= CRITICAL SEND =================

async function sendCriticalReminder() {
  try {
    console.log("Sending critical reminders...");

    const chats = await client.getChats();

    const infraGroup = chats.find(
      c => c.isGroup && c.name === CRITICAL_GROUP_NAME
    );

    const lsadGroup = chats.find(
      c => c.isGroup && c.name === CRITICAL_GROUP_NAME_2
    );

    async function sendToGroup(group, tasks) {
      if (!group || tasks.length === 0) return;

      let message = `🔆 *CRITICAL TASK / ISSUE*\n\n`;
      let mentions = [];

      tasks.forEach((task, index) => {

        message += `${index + 1}. ${task.text}\n`;

        // SUPPORTS BOTH tag (single) AND tags (multiple)

if (task.tag || task.tags) {

  // Single tag support
  if (task.tag && typeof task.tag === "string") {

    const cleanNumber = task.tag.replace(/\D/g, '');

    if (cleanNumber.length >= 10) {
      message += `@${cleanNumber}\n`;
      mentions.push(cleanNumber + "@c.us");
    }
  }

  // Multiple tags support
  if (task.tags && Array.isArray(task.tags)) {

    task.tags.forEach(number => {

      if (typeof number === "string") {
        const cleanNumber = number.replace(/\D/g, '');

        if (cleanNumber.length >= 10) {
          message += ` @${cleanNumber}`;
          mentions.push(cleanNumber + "@c.us");
        }
      }

    });
  }
}

        message += `\n`;
      });

      await group.sendMessage(message, {
        mentions: mentions
      });

      console.log(`Sent to ${group.name}`);
    }

    await sendToGroup(infraGroup, CRITICAL_TASKS);
    await randomDelay(5000, 10000);
    await sendToGroup(lsadGroup, CRITICAL_TASKS_2);

    console.log("Critical reminders completed.");

  } catch (err) {
    console.error("Critical send error:", err);
  }
}

// ================= LIST GROUP SEND =================

async function sendListGroupReminders() {
  try {
    console.log("Sending list group reminders...");

    const chats = await client.getChats();

    for (const groupName in LIST_GROUPS) {

      const group = chats.find(
        c => c.isGroup && c.name?.trim() === groupName
      );

      if (!group) continue;

      const config = LIST_GROUPS[groupName];

      let message = `${config.title}\n\n`;

      config.tasks.forEach((task, index) => {
        message += `${index + 1}. ${task}\n`;
      });

      await group.sendMessage(message);

      console.log(`List sent to ${groupName}`);
      await randomDelay();
    }

  } catch (err) {
    console.error("List group send error:", err);
  }
}
// ================= VC LAB SEND =================

async function sendVCLabReminder() {
  if (BOT_PAUSED) return;

  try {
    const chats = await client.getChats();
    const group = chats.find(c => c.isGroup && c.name?.trim() === VC_LAB_GROUP_NAME);
    if (!group) return;

    await group.sendMessage(VC_LAB_MESSAGE);
    console.log('🔴 VC Lab reminder sent');

  } catch (err) {
    console.error('VC Lab error:', err);
  }
}

// ================= DAILY SEND =================

async function sendReminders() {
  if (BOT_PAUSED) return '⏸ Bot paused';
  if (IS_SENDING) return '⏳ Already sending';

  IS_SENDING = true;
  console.log("🚀 Sending reminders...");

  try {
    const sentGroups = loadSentGroups();
    const chats = await client.getChats();
    const groups = chats.filter(c => c.isGroup && !c.archived);

    const monthlyToday = isMonthlyDay();
    const weeklyToday = isWeeklyDay();

    let sent = 0;

    for (const group of groups) {

      const groupName = group.name?.trim();
      if (!groupName) continue;
// Skip special groups
if (
  groupName === CRITICAL_GROUP_NAME ||
  groupName === CRITICAL_GROUP_NAME_2 ||
  groupName === VC_LAB_GROUP_NAME
) continue;
      if (group.id._serialized === ADMIN_GROUP_ID) continue;
      if (sentGroups[groupName]) continue;

      if (MONTHLY_GROUPS[groupName]) {
        if (monthlyToday) {
          await group.sendMessage(MONTHLY_GROUPS[groupName]);
          markGroupSent(groupName);
          sent++;
          await randomDelay();
        }
        continue;
      }

      if (WEEKLY_GROUPS[groupName]) {
        if (weeklyToday) {
          await group.sendMessage(WEEKLY_GROUPS[groupName]);
          markGroupSent(groupName);
          sent++;
          await randomDelay();
        }
        continue;
      }

      const msg = getDailyMessage(groupName);
      await group.sendMessage(msg);
      markGroupSent(groupName);
      sent++;
      await randomDelay();
    }

    return `🟢 Sent reminders to ${sent} groups`;

  } catch (err) {
    console.error('Send error:', err);
    return '❌ Error occurred';
  } finally {
    IS_SENDING = false;
  }
}

// ================= ADMIN COMMANDS =================

client.on('message', async msg => {
  try {
    if (msg.from !== ADMIN_GROUP_ID) return;

    const text = msg.body.trim().toLowerCase();

    if (text === '!pause') {
      BOT_PAUSED = true;
      await msg.reply('⏸ Bot Paused');
    }

    if (text === '!resume') {
      BOT_PAUSED = false;
      await msg.reply('▶️ Bot Resumed');
    }

    if (text === '!critical') {
      await sendCriticalReminder();
      await msg.reply('🔴 Critical Reminder Sent');
    }

    if (text === '!daily') {
      const res = await sendReminders();
      await msg.reply(res);
    }

    if (text === '!status') {
      const sentData = loadSentGroups();
      await msg.reply(`🤖 Bot Running
Paused: ${BOT_PAUSED}
Sending: ${IS_SENDING}
Groups Sent Today: ${Object.keys(sentData).length}`);
    }

  } catch (err) {
    console.error('Admin command error:', err);
  }
});

// ================= DASHBOARD: SAVE GROUPS LIST =================
// Saves all group names to groups-list.json so dashboard can categorize them

async function saveGroupsList() {
  try {
    const chats = await client.getChats();
    const groups = chats
      .filter(c => c.isGroup && !c.archived)
      .map(c => c.name?.trim())
      .filter(Boolean);
    fs.writeFileSync('groups-list.json', JSON.stringify(groups, null, 2));
    console.log(`📋 Groups list saved (${groups.length} groups)`);
  } catch (e) {
    console.error('Error saving groups list:', e);
  }
}

// ================= DASHBOARD: MANUAL SEND (from dashboard) =================
// Checks pending-send.json every minute and sends via bot

async function checkPendingSends() {
  const pendingFile = 'pending-send.json';
  if (!fs.existsSync(pendingFile)) return;

  try {
    const pending = JSON.parse(fs.readFileSync(pendingFile, 'utf8'));
    if (!pending.length) return;

    const chats = await client.getChats();

    for (const item of pending) {
      // Skip items older than 5 minutes
      if (Date.now() - item.timestamp > 5 * 60 * 1000) {
        console.log(`⏭ Expired send skipped: "${item.group}"`);
        continue;
      }
      const group = chats.find(c => c.isGroup && c.name?.trim() === item.group);
      if (group) {
        await group.sendMessage(item.msg);
        console.log(`📤 Dashboard manual send → "${item.group}"`);
      } else {
        console.log(`❌ Group not found for manual send: "${item.group}"`);
      }
    }

    // Clear after processing
    fs.writeFileSync(pendingFile, '[]');
  } catch (e) {
    console.error('Pending send error:', e);
  }
}

// ================= READY & CRON =================

client.on('ready', () => {
  console.log('✅ WhatsApp Ready');
  console.log('🤖 BOT RUNNING...');

  // ── Dashboard additions ──
  saveGroupsList();                                        // saves groups on startup
  cron.schedule('*/1 * * * *', checkPendingSends);        // checks manual sends every minute

  cron.schedule(`${SEND_MINUTE} ${SEND_HOUR} * * *`, async () => {
    const res = await sendReminders();
    console.log(res);
  });
cron.schedule(`10 9 * * *`, sendListGroupReminders);

  cron.schedule(`0 9 * * *`, sendCriticalReminder);
  cron.schedule(`0 14 * * *`, sendCriticalReminder);

  cron.schedule(`05 9 * * *`, sendVCLabReminder);
  cron.schedule(`45 11 * * *`, sendVCLabReminder);
  cron.schedule(`47 14 * * *`, sendVCLabReminder);
  cron.schedule(`2 16 * * *`, sendVCLabReminder);
});

// ================= INIT =================

client.initialize();
