# WhatsApp Bot Dashboard

## Setup (2 steps only)

### Step 1 — Place files
Copy `server.js` and `dashboard.html` into the SAME folder as your bot file.

### Step 2 — Edit one line in server.js
Open `server.js` and change this line to match your bot filename:
```js
const BOT_FILE = path.join(__dirname, 'bot.js'); // ← change 'bot.js' to your filename
```

### Step 3 — Start the dashboard server
```bash
node server.js
```

### Step 4 — Open in browser
```
http://localhost:3000
```

---

## What you can do on the dashboard

| Section | What you can manage |
|---|---|
| Dashboard | Overview stats, schedule summary |
| Sent Today | See which groups got messages, clear/reset log |
| Daily Groups | Add/edit/delete fixed group messages |
| Weekly Groups | Add/edit/delete weekly groups |
| Monthly Groups | Add/edit/delete monthly groups |
| Message Templates | Edit default & HR rotating messages |
| Critical Tasks | Add/edit/delete/reorder infra & LSAD tasks with phone numbers |
| List Groups | Add/edit/delete task lists per group |
| Schedule | Change daily send hour/minute, monthly/weekly day |

## Important Notes

- After saving ANY change → **restart your bot** for changes to take effect
- The dashboard directly edits your bot.js file
- A backup before first use is recommended: `cp bot.js bot.backup.js`
- The server runs on port 3000 — only accessible on your local machine

## Both servers run together
Run your bot and the dashboard simultaneously:
```bash
# Terminal 1
node bot.js

# Terminal 2  
node server.js
```
