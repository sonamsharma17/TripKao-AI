const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const localtunnel = require('localtunnel');
const crypto = require('crypto');
const mongoose = require('mongoose');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'posts_images')));

// Ensure directory structures exist
const imagesDir = path.join(__dirname, 'posts_images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Config paths
const configPath = path.join(__dirname, 'config.json');
const logFilePath = path.join(__dirname, 'posting_logs.txt');
const localDbPath = path.join(__dirname, 'posts_db.json');

// Mongoose MongoDB Schema
let isMongoConnected = false;

const PostSchema = new mongoose.Schema({
  media: [String],
  type: { type: String, default: 'Post' },
  caption: { type: String, default: '' },
  date: String,
  time: String,
  scheduledDate: Date,
  status: { type: String, default: 'Pending' },
  details: mongoose.Schema.Types.Mixed
});

const Post = mongoose.model('Post', PostSchema);

// Local DB fallback helper
function loadLocalDb() {
  if (!fs.existsSync(localDbPath)) {
    fs.writeFileSync(localDbPath, JSON.stringify([], null, 2), 'utf8');
  }
  try {
    return JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  } catch (e) {
    return [];
  }
}

function saveLocalDb(data) {
  try {
    fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    logMessage('ERROR', `Failed to save local JSON DB: ${e.message}`);
  }
}

// Load settings
function loadConfig() {
  let config = {
    facebookPageId: "",
    instagramBusinessAccountId: "",
    metaAccessToken: "",
    csvFilePath: "./schedule.csv",
    imagesFolderPath: "./posts_images",
    timezone: "Asia/Kolkata",
    publishToFacebook: true,
    publishToInstagram: true,
    useLocalTunnel: true,
    cloudinaryCloudName: "",
    cloudinaryApiKey: "",
    cloudinaryApiSecret: "",
    schedulerActive: false,
    mongoUri: "mongodb://localhost:27017/tripkaroai"
  };

  try {
    if (fs.existsSync(configPath)) {
      config = { ...config, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
    }
  } catch (e) {
    logMessage('ERROR', `Error reading config file: ${e.message}`);
  }

  // Override with environment variables if available
  if (process.env.MONGO_URI) config.mongoUri = process.env.MONGO_URI;
  if (process.env.META_ACCESS_TOKEN) config.metaAccessToken = process.env.META_ACCESS_TOKEN;
  if (process.env.FACEBOOK_PAGE_ID) config.facebookPageId = process.env.FACEBOOK_PAGE_ID;
  if (process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID) config.instagramBusinessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  if (process.env.TIMEZONE) config.timezone = process.env.TIMEZONE;

  // Disable localtunnel in cloud environments
  if (process.env.RENDER || process.env.NODE_ENV === 'production') {
    config.useLocalTunnel = false;
  }

  return config;
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    logMessage('ERROR', `Error saving config file: ${e.message}`);
  }
}

// Logger helper
function logMessage(level, message) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [${level}] ${message}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(logFilePath, logLine);
  } catch (err) {
    console.error('Failed to write to log file:', err);
  }
}

// Database auto-seeder
async function autoSeedDb() {
  try {
    let count = 0;
    if (isMongoConnected) {
      count = await Post.countDocuments();
    } else {
      const localDb = loadLocalDb();
      count = localDb.length;
    }

    if (count === 0) {
      logMessage('INFO', 'Database is empty. Auto-seeding from configured schedule file...');
      const rows = await readSchedule();
      if (rows.length > 0) {
        logMessage('INFO', `Found ${rows.length} rows in schedule. Seeding database...`);
        const localDb = loadLocalDb();
        
        for (const row of rows) {
          const media = (row.media || row.image || '').trim();
          const type = (row.type || 'Post').trim();
          const date = row.date || '';
          const time = row.time || '';
          const caption = row.caption || '';

          if (!media) continue;

          const mediaFiles = media.split(',').map(f => f.trim()).filter(Boolean);
          const scheduledDate = parseDateTime(date, time) || new Date();

          const postData = {
            media: mediaFiles,
            type: type,
            caption: caption,
            date: date,
            time: time,
            scheduledDate: scheduledDate,
            status: 'Pending',
            details: null
          };

          if (isMongoConnected) {
            const dbPost = new Post(postData);
            await dbPost.save();
          } else {
            postData._id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
            localDb.push(postData);
          }
        }
        if (!isMongoConnected) {
          saveLocalDb(localDb);
        }
        logMessage('INFO', `Auto-seeded database successfully with ${rows.length} posts.`);
      } else {
        logMessage('INFO', 'No rows found in schedule file to auto-seed.');
      }
    }
  } catch (err) {
    logMessage('WARNING', `Auto-seeding database failed: ${err.message}`);
  }
}

// Database Connection
async function connectDb() {
  const config = loadConfig();
  const mongoUri = config.mongoUri || 'mongodb://localhost:27017/tripkaroai';
  logMessage('INFO', `Attempting to connect to MongoDB at ${mongoUri}...`);
  try {
    mongoose.set('strictQuery', false);
    // Timeout in 5 seconds
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    isMongoConnected = true;
    logMessage('INFO', 'Successfully connected to MongoDB database!');
  } catch (err) {
    isMongoConnected = false;
    logMessage('WARNING', `Failed to connect to MongoDB: ${err.message}. Falling back to local JSON file posts_db.json`);
  }
  
  // Always trigger auto-seeder after connection attempt resolves
  await autoSeedDb();
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'csvFile') {
      cb(null, __dirname);
    } else {
      cb(null, imagesDir);
    }
  },
  filename: function (req, file, cb) {
    if (file.fieldname === 'csvFile') {
      cb(null, file.originalname.endsWith('.xlsx') ? 'schedule.xlsx' : 'schedule.csv');
    } else {
      // Ensure unique filename if collision occurs to prevent overwrites
      const uniqueSuffix = Date.now() + '_' + Math.round(Math.random() * 1e4);
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${base}_${uniqueSuffix}${ext}`);
    }
  }
});

const upload = multer({ storage: storage });

// Tunnel Manager
let tunnelInstance = null;
let tunnelUrl = '';

async function startTunnel() {
  const config = loadConfig();
  if (!config.useLocalTunnel) {
    if (tunnelInstance) {
      await stopTunnel();
    }
    return;
  }

  if (tunnelInstance && tunnelUrl) {
    return; // Already running
  }

  logMessage('INFO', `Starting local tunnel on port ${PORT}...`);
  try {
    tunnelInstance = await localtunnel({ port: PORT });
    tunnelUrl = tunnelInstance.url;
    logMessage('INFO', `Tunnel successfully established at: ${tunnelUrl}`);

    tunnelInstance.on('close', () => {
      logMessage('WARNING', 'Local tunnel closed.');
      tunnelInstance = null;
      tunnelUrl = '';
    });

    tunnelInstance.on('error', (err) => {
      logMessage('ERROR', `Local tunnel error: ${err.message}`);
      tunnelInstance = null;
      tunnelUrl = '';
    });
  } catch (err) {
    logMessage('ERROR', `Failed to establish local tunnel: ${err.message}`);
    tunnelInstance = null;
    tunnelUrl = '';
  }
}

async function stopTunnel() {
  if (tunnelInstance) {
    logMessage('INFO', 'Stopping local tunnel...');
    try {
      await tunnelInstance.close();
    } catch (e) {}
    tunnelInstance = null;
    tunnelUrl = '';
  }
}

// Keep connection alive or reconnect tunnel if required
setInterval(async () => {
  const config = loadConfig();
  if (config.useLocalTunnel && config.schedulerActive && !tunnelUrl) {
    logMessage('INFO', 'Tunnel disconnected. Reconnecting...');
    await startTunnel();
  }
}, 30000);

// Excel / CSV Parsers (for importer seeding)
function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    if (!fs.existsSync(filePath)) {
      return resolve([]);
    }
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

function parseExcel(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return xlsx.utils.sheet_to_json(worksheet);
  } catch (err) {
    logMessage('ERROR', `Failed to read Excel file: ${err.message}`);
    return [];
  }
}

function normalizeRow(row) {
  const normalized = {};
  for (const key of Object.keys(row)) {
    const normKey = key.trim().toLowerCase();
    normalized[normKey] = row[key];
  }
  return normalized;
}

async function readSchedule() {
  const config = loadConfig();
  const filePath = path.isAbsolute(config.csvFilePath)
    ? config.csvFilePath
    : path.join(__dirname, config.csvFilePath);

  if (!fs.existsSync(filePath)) {
    return [];
  }

  let rows = [];
  if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
    rows = parseExcel(filePath);
  } else {
    rows = await parseCSV(filePath);
  }
  return rows.map(normalizeRow);
}

// Date / Time Slot calculations
function parseDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  try {
    const combinedStr = `${dateStr.trim()} ${timeStr.trim()}`;
    const parsedDate = new Date(combinedStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (e) {}
  return null;
}

function getNowInTimezone(tz) {
  if (!tz || tz.toLowerCase() === 'local') {
    return new Date();
  }
  try {
    const options = {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
      timeZone: tz
    };
    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(new Date());
    const map = {};
    parts.forEach(p => map[p.type] = p.value);
    
    const isoString = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
    return new Date(isoString);
  } catch (err) {
    logMessage('ERROR', `Failed to parse timezone ${tz}, falling back to local: ${err.message}`);
    return new Date();
  }
}

// Get the next pre-filled slot according to the 4-times-a-day schedule rules
async function getNextScheduleSlot() {
  let latestPost = null;

  if (isMongoConnected) {
    try {
      latestPost = await Post.findOne().sort({ scheduledDate: -1 });
    } catch (e) {
      logMessage('ERROR', `MongoDB failed in slot fetch: ${e.message}`);
    }
  }

  if (!isMongoConnected) {
    const localPosts = loadLocalDb();
    if (localPosts.length > 0) {
      localPosts.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
      latestPost = localPosts[localPosts.length - 1];
    }
  }

  const slots = ['10:00 AM', '12:00 PM', '05:00 PM', '07:30 PM'];

  if (!latestPost) {
    // Starting default slot: Aug 3, 2026 at 10:00 AM
    return {
      date: '03 Aug 2026',
      time: '10:00 AM',
      scheduledDate: parseDateTime('03 Aug 2026', '10:00 AM') || new Date('2026-08-03T10:00:00')
    };
  }

  let nextDate = new Date(latestPost.scheduledDate);
  let slotIndex = slots.indexOf(latestPost.time);

  if (slotIndex === -1 || slotIndex === slots.length - 1) {
    // Next day at 10:00 AM
    nextDate.setDate(nextDate.getDate() + 1);
    slotIndex = 0;
  } else {
    // Next slot same day
    slotIndex++;
  }

  const nextTimeStr = slots[slotIndex];
  
  // Format Date string: "DD MMM YYYY"
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayStr = String(nextDate.getDate()).padStart(2, '0');
  const monthStr = months[nextDate.getMonth()];
  const yearStr = nextDate.getFullYear();
  const nextDateStr = `${dayStr} ${monthStr} ${yearStr}`;

  const targetScheduledDate = parseDateTime(nextDateStr, nextTimeStr) || nextDate;

  return {
    date: nextDateStr,
    time: nextTimeStr,
    scheduledDate: targetScheduledDate
  };
}

// Cloudinary APIs
function getCloudinaryResourceType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
    return 'video';
  }
  return 'image';
}

async function uploadToCloudinary(localFilePath, resourceType, config) {
  const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = config;
  if (!cloudinaryCloudName || !cloudinaryApiKey || !cloudinaryApiSecret) {
    throw new Error('Cloudinary configuration is incomplete.');
  }
  
  const timestamp = Math.round((new Date()).getTime() / 1000);
  const publicId = `post_${Date.now()}`;
  
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
  
  const fileBuffer = fs.readFileSync(localFilePath);
  const formData = new FormData();
  formData.append('file', new Blob([fileBuffer]));
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('api_key', cloudinaryApiKey);
  formData.append('signature', signature);
  
  const url = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/upload`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData
  });
  
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Cloudinary error: ${data.error?.message || JSON.stringify(data)}`);
  }
  return {
    url: data.secure_url,
    public_id: data.public_id
  };
}

async function deleteFromCloudinary(publicId, resourceType, config) {
  const { cloudinaryCloudName, cloudinaryApiKey, cloudinaryApiSecret } = config;
  const timestamp = Math.round((new Date()).getTime() / 1000);
  const signatureString = `public_id=${publicId}&timestamp=${timestamp}${cloudinaryApiSecret}`;
  const signature = crypto.createHash('sha1').update(signatureString).digest('hex');
  
  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('api_key', cloudinaryApiKey);
  formData.append('signature', signature);
  
  const url = `https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/${resourceType}/destroy`;
  const res = await fetch(url, {
    method: 'POST',
    body: formData
  });
  return res.json();
}

// Puppeteer Browser Automation Posting Engine
async function publishWithPuppeteer(postRow) {
  const config = loadConfig();
  const { facebookEmail, facebookPassword, runVisually, publishToFacebook, publishToInstagram } = config;
  
  if (!facebookEmail || !facebookPassword) {
    throw new Error('Facebook Email or Password is not configured in Settings.');
  }

  const postId = postRow._id;
  const imageKey = (postRow.media || postRow.image || '').trim();
  const type = (postRow.type || 'Post').trim();
  const caption = postRow.caption || '';
  
  logMessage('INFO', `[Puppeteer] Starting posting workflow for: ${imageKey} [Type: ${type}]`);

  const mediaFiles = type.toLowerCase() === 'carousel' 
    ? imageKey.split(',').map(f => f.trim()).filter(Boolean)
    : [imageKey];

  // 1. Verify files exist locally
  for (const file of mediaFiles) {
    const localFilePath = path.join(imagesDir, file);
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Media file not found: ${localFilePath}`);
    }
  }

  logMessage('INFO', '[Puppeteer] Launching Chromium browser...');
  const browser = await puppeteer.launch({
    headless: !runVisually,
    defaultViewport: null,
    userDataDir: path.join(__dirname, 'puppeteer_session'),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-notifications',
      '--window-size=1280,900'
    ]
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Set navigation timeouts
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(45000);

  try {
    // STEP 1: Go to Facebook login page first to establish a session
    logMessage('INFO', '[Puppeteer] Navigating to Facebook login page...');
    await page.goto('https://www.facebook.com/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check if we landed on a login form or are already logged in
    const currentUrl = page.url();
    const needsLogin = await page.evaluate(() => {
      return !!(document.getElementById('email') || document.querySelector("input[name='email']") || document.getElementById('pass'));
    });

    if (needsLogin) {
      logMessage('INFO', '[Puppeteer] Login form detected. Entering credentials...');
      
      // Clear and type email
      const emailField = await page.$('#email') || await page.$("input[name='email']");
      if (emailField) {
        await emailField.click({ clickCount: 3 }); // select all existing text
        await emailField.type(facebookEmail, { delay: 50 });
      }
      
      // Clear and type password
      const passField = await page.$('#pass') || await page.$("input[name='pass']");
      if (passField) {
        await passField.click({ clickCount: 3 });
        await passField.type(facebookPassword, { delay: 50 });
      }
      
      // Click login button - simplest approach: press Enter since password field is focused
      logMessage('INFO', '[Puppeteer] Submitting login form...');
      
      await Promise.all([
        page.keyboard.press('Enter'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
      ]);
      
      logMessage('INFO', `[Puppeteer] Post-login URL: ${page.url()}`);
      
      // Check for security checkpoints or 2FA
      const postLoginUrl = page.url();
      if (postLoginUrl.includes('checkpoint') || postLoginUrl.includes('two_step_verification') || postLoginUrl.includes('login_source') || postLoginUrl.includes('authentication')) {
        logMessage('WARNING', '[Puppeteer] Facebook Login Checkpoint/2FA code required!');
        if (!runVisually) {
          throw new Error('Facebook login requires manual verification or 2FA. Please check "Run Browser Visually" in Settings, trigger this sync again, and complete the checkpoint on your screen.');
        }
        logMessage('INFO', '[Puppeteer] Please complete the login verification manually in the opened browser window now. Waiting up to 120 seconds...');
        
        // Wait at least 5 seconds before checking - user needs time to interact
        await new Promise(r => setTimeout(r, 5000));
        
        await page.waitForFunction(() => {
          const url = window.location.href;
          // Must be on facebook.com but NOT on any auth/verification page
          return url.includes('facebook.com') && 
                 !url.includes('checkpoint') && 
                 !url.includes('two_step_verification') &&
                 !url.includes('authentication') &&
                 !url.includes('/login');
        }, { timeout: 120000 });
        logMessage('INFO', '[Puppeteer] Checkpoint cleared successfully!');
      }
      
      logMessage('INFO', '[Puppeteer] Facebook login successful!');
    } else {
      logMessage('INFO', '[Puppeteer] Already logged in to Facebook. Session active.');
    }
    
    // STEP 2: Now navigate to Meta Business Suite Composer with active session
    logMessage('INFO', '[Puppeteer] Navigating to Meta Business Suite Composer...');
    await page.goto('https://business.facebook.com/latest/composer', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    // If we still land on the landing page, try clicking Continue with Facebook now that we're logged in
    const stillOnLanding = await page.evaluate(() => {
      return document.body.innerText.toLowerCase().includes('get started with business tools') ||
             document.body.innerText.toLowerCase().includes('log in to business tools') ||
             document.body.innerText.toLowerCase().includes('continue with facebook');
    }) || page.url().includes('loginpage') || page.url().includes('login_page');
    
    if (stillOnLanding) {
      logMessage('INFO', '[Puppeteer] Landing page detected after login. Attempting to bypass...');
      
      // Debug: Log all interactive elements on the page
      const pageDebug = await page.evaluate(() => {
        const info = { links: [], buttons: [], clickable: [] };
        document.querySelectorAll('a').forEach(a => {
          info.links.push({ text: a.textContent.trim().substring(0, 60), href: a.href ? a.href.substring(0, 100) : 'none', tag: a.tagName });
        });
        document.querySelectorAll('[role="button"], button').forEach(b => {
          info.buttons.push({ text: b.textContent.trim().substring(0, 60), tag: b.tagName, role: b.getAttribute('role') });
        });
        return info;
      });
      logMessage('INFO', `[Puppeteer] Page has ${pageDebug.links.length} links, ${pageDebug.buttons.length} buttons`);
      pageDebug.links.forEach((l, i) => logMessage('INFO', `[Puppeteer] Link[${i}]: "${l.text}" -> ${l.href}`));
      pageDebug.buttons.forEach((b, i) => logMessage('INFO', `[Puppeteer] Button[${i}]: "${b.text}" (${b.tag}, role=${b.role})`));
      
      // Strategy 1: Find the element containing "Continue with Facebook" and force-click it via JS
      const clickedViaJS = await page.evaluate(() => {
        // Find ANY element containing the exact text
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent.trim().toLowerCase();
          const directText = Array.from(node.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent.trim())
            .join('');
          
          if (directText.toLowerCase().includes('continue with facebook') || 
              (text === 'continue with facebook' && node.children.length <= 2)) {
            // Found the button/link element - dispatch a real click event
            node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            return { success: true, tag: node.tagName, text: directText || text.substring(0, 40) };
          }
        }
        return { success: false };
      });
      
      if (clickedViaJS.success) {
        logMessage('INFO', `[Puppeteer] JS click dispatched on ${clickedViaJS.tag}: "${clickedViaJS.text}"`);
        await new Promise(r => setTimeout(r, 5000));
      }
      
      // Check if we navigated away
      let currentUrl = page.url();
      if (currentUrl.includes('loginpage') || currentUrl.includes('login_page')) {
        logMessage('INFO', '[Puppeteer] JS click did not navigate. Trying mouse click at button coordinates...');
        
        // Strategy 2: Use mouse click at the exact coordinates of "Continue with Facebook"
        // Based on the 1280x900 viewport, the button is in the right panel
        // The button center is approximately at x=1050, y=348
        await page.mouse.click(1050, 348);
        await new Promise(r => setTimeout(r, 5000));
        
        currentUrl = page.url();
      }
      
      if (currentUrl.includes('loginpage') || currentUrl.includes('login_page')) {
        logMessage('INFO', '[Puppeteer] Mouse click did not navigate. Trying to find and use button href...');
        
        // Strategy 3: Find ANY clickable element with facebook in its link and navigate
        const fbHref = await page.evaluate(() => {
          const allElements = document.querySelectorAll('a, [role="link"]');
          for (const el of allElements) {
            if (el.href && el.textContent.toLowerCase().includes('facebook')) {
              return el.href;
            }
          }
          // Check onclick attributes
          const allClickable = document.querySelectorAll('[onclick], [data-href]');
          for (const el of allClickable) {
            if (el.textContent.toLowerCase().includes('facebook')) {
              return el.getAttribute('onclick') || el.getAttribute('data-href');
            }
          }
          return null;
        });
        
        if (fbHref && fbHref.startsWith('http')) {
          logMessage('INFO', `[Puppeteer] Found href: ${fbHref.substring(0, 100)}`);
          await page.goto(fbHref, { waitUntil: 'networkidle2', timeout: 30000 });
          await new Promise(r => setTimeout(r, 5000));
        }
      }
      
      // Log where we are now
      logMessage('INFO', `[Puppeteer] Post-bypass URL: ${page.url()}`);
      
      // Handle secondary login if needed
      const needsLoginAgain = await page.evaluate(() => {
        return !!(document.getElementById('email') || document.querySelector("input[name='email']"));
      });
      
      if (needsLoginAgain) {
        logMessage('INFO', '[Puppeteer] Secondary login required. Re-entering credentials...');
        const emailField2 = await page.$('#email') || await page.$("input[name='email']");
        if (emailField2) {
          await emailField2.click({ clickCount: 3 });
          await emailField2.type(facebookEmail, { delay: 50 });
        }
        const passField2 = await page.$('#pass') || await page.$("input[name='pass']");
        if (passField2) {
          await passField2.click({ clickCount: 3 });
          await passField2.type(facebookPassword, { delay: 50 });
        }
        await Promise.all([
          page.keyboard.press('Enter'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
        ]);
        logMessage('INFO', `[Puppeteer] Post re-login URL: ${page.url()}`);
        await new Promise(r => setTimeout(r, 3000));
      }
      
      // Final check - if still not on composer, navigate directly
      if (!page.url().includes('composer')) {
        logMessage('INFO', '[Puppeteer] Navigating directly to composer...');
        await page.goto('https://business.facebook.com/latest/composer', { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));
      }
    }
    
    logMessage('INFO', `[Puppeteer] Current page URL: ${page.url()}`);

    // 3. Select Target Accounts (Facebook Page & Instagram Profile)
    logMessage('INFO', '[Puppeteer] Configuring target accounts placements...');
    
    // Find the placement selector dropdown button (typically shows "Post to")
    await page.waitForSelector('[role="textbox"]', { timeout: 30000 });
    
    // Click placement dropdown via DOM
    await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('[role="combobox"], [role="button"], button, div, span'));
      const trigger = items.find(el => {
        const txt = el.textContent.trim().toLowerCase();
        return txt.includes('post to') || txt.includes('share to');
      });
      if (trigger) trigger.click();
    });
    await new Promise(r => setTimeout(r, 2000)); // wait for dropdown list to expand

    // Set checkboxes based on settings
    await page.evaluate((pubFB, pubIG) => {
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      checkboxes.forEach(cb => {
        const container = cb.closest('label') || cb.parentElement;
        const text = container ? container.textContent.toLowerCase() : '';
        if (text.includes('facebook') || text.includes('page')) {
          if (cb.checked !== pubFB) cb.click();
        }
        if (text.includes('instagram') || text.includes('business')) {
          if (cb.checked !== pubIG) cb.click();
        }
      });
    }, publishToFacebook, publishToInstagram);

    // Click outside dropdown to close it
    await page.click('body');
    await new Promise(r => setTimeout(r, 1000));

    // 4. Enter Caption Text
    logMessage('INFO', '[Puppeteer] Entering caption...');
    const editorSelector = 'div[contenteditable="true"], textarea[role="textbox"]';
    await page.waitForSelector(editorSelector, { timeout: 30000 });
    await page.focus(editorSelector);
    
    // Select all and clear
    await page.keyboard.down('Control');
    await page.keyboard.press('A');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    
    // Input Caption
    await page.keyboard.type(caption, { delay: 10 });
    await new Promise(r => setTimeout(r, 1000));

    // 5. Upload Media Files
    logMessage('INFO', `[Puppeteer] Uploading ${mediaFiles.length} media file(s)...`);
    const fileInput = await page.waitForSelector('input[type="file"]', { timeout: 30000 });
    
    const absolutePaths = mediaFiles.map(file => path.join(imagesDir, file));
    await fileInput.uploadFile(...absolutePaths);

    // Wait for file upload process
    logMessage('INFO', '[Puppeteer] File uploaded. Waiting for processing to finish (15s)...');
    await new Promise(r => setTimeout(r, 15000));

    // 6. Click Publish button via DOM click
    logMessage('INFO', '[Puppeteer] Locating Publish/Share button...');
    const publishClicked = await page.evaluate(() => {
      const elementsList = Array.from(document.querySelectorAll('button, div[role="button"], span[role="button"]'));
      const btn = elementsList.find(el => {
        const text = el.textContent.trim().toLowerCase();
        return text === 'publish' || text === 'share' || text === 'post';
      });
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (publishClicked) {
      logMessage('INFO', '[Puppeteer] Publish button clicked. Processing (10s)...');
      await new Promise(r => setTimeout(r, 10000));
    } else {
      // Fallback: try keyboard shortcut Ctrl+Enter which many composers support
      logMessage('INFO', '[Puppeteer] Publish button not found. Trying Ctrl+Enter...');
      await page.keyboard.down('Control');
      await page.keyboard.press('Enter');
      await page.keyboard.up('Control');
      await new Promise(r => setTimeout(r, 10000));
    }

    logMessage('SUCCESS', '[Puppeteer] Content published successfully!');
    await browser.close();
    return { success: true };
  } catch (err) {
    logMessage('ERROR', `[Puppeteer] Automator failed: ${err.message}`);
    // Save diagnostic screenshot of browser state for user inspection
    try {
      const errScreenPath = path.join(imagesDir, `error_screen_${postId}.png`);
      await page.screenshot({ path: errScreenPath });
      logMessage('INFO', `[Puppeteer] Saved diagnostic screenshot to: ${errScreenPath}`);
    } catch (e) {}
    
    await browser.close();
    throw err;
  }
}

// Helper to temporarily host a file publicly for Instagram API (bypassing localtunnel splash screen)
async function getPublicUrlForMedia(file) {
  const localFilePath = path.join(imagesDir, file);
  
  // On Render, serve files directly from the public URL
  if (process.env.RENDER_EXTERNAL_URL) {
    const renderUrl = `${process.env.RENDER_EXTERNAL_URL}/images/${encodeURIComponent(file)}`;
    logMessage('INFO', `[Meta API] Using Render public URL: ${renderUrl}`);
    return renderUrl;
  }

  // Try Litterbox (catbox temporary hosting - 1 hour expiry)
  try {
    logMessage('INFO', `[Meta API] Uploading ${file} to Litterbox (temp hosting)...`);
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileBlob = new Blob([fileBuffer]);
    
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('time', '1h');
    formData.append('fileToUpload', fileBlob, file);
    
    const response = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: formData
    });
    const url = await response.text();
    
    if (url && url.startsWith('https://')) {
      logMessage('INFO', `[Meta API] Litterbox URL generated: ${url.trim()}`);
      return url.trim();
    } else {
      logMessage('WARNING', `[Meta API] Litterbox response was not a URL: ${url}`);
    }
  } catch (e) {
    logMessage('WARNING', `[Meta API] Litterbox upload failed: ${e.message}`);
  }

  // Try 0x0.st as secondary fallback
  try {
    logMessage('INFO', `[Meta API] Trying 0x0.st upload for ${file}...`);
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileBlob = new Blob([fileBuffer]);
    
    const formData = new FormData();
    formData.append('file', fileBlob, file);
    
    const response = await fetch('https://0x0.st', {
      method: 'POST',
      body: formData
    });
    const url = await response.text();
    
    if (url && url.startsWith('https://')) {
      logMessage('INFO', `[Meta API] 0x0.st URL generated: ${url.trim()}`);
      return url.trim();
    } else {
      logMessage('WARNING', `[Meta API] 0x0.st response was not a URL: ${url}`);
    }
  } catch (e) {
    logMessage('WARNING', `[Meta API] 0x0.st upload failed: ${e.message}`);
  }
  
  // Final fallback to localtunnel url
  const hostUrl = tunnelUrl || `http://localhost:${PORT}`;
  logMessage('WARNING', `[Meta API] All upload services failed. Using fallback: ${hostUrl}/images/${file}`);
  return `${hostUrl}/images/${file}`;
}

// Meta Graph API Posting Engine
async function publishWithMetaApi(postRow) {
  const config = loadConfig();
  const { facebookPageId, instagramBusinessAccountId, metaAccessToken, publishToFacebook, publishToInstagram } = config;

  if (!metaAccessToken) {
    throw new Error('Meta Access Token is not configured in Settings.');
  }

  const postId = postRow._id;
  const imageKey = (postRow.media || postRow.image || '').trim();
  const type = (postRow.type || 'Post').trim();
  const caption = postRow.caption || '';

  logMessage('INFO', `[Meta API] Starting posting workflow for: ${imageKey} [Type: ${type}]`);

  const mediaFiles = type.toLowerCase() === 'carousel' 
    ? imageKey.split(',').map(f => f.trim()).filter(Boolean)
    : [imageKey];

  // 1. Verify files exist locally
  for (const file of mediaFiles) {
    const localFilePath = path.join(imagesDir, file);
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`Media file not found: ${localFilePath}`);
    }
  }

  // Ensure tunnel is running as a fallback if we are publishing to Instagram
  if (publishToInstagram && !tunnelUrl) {
    logMessage('INFO', '[Meta API] Exposing tunnel as a fallback...');
    try {
      await startTunnel();
    } catch (e) {
      logMessage('ERROR', `[Meta API] Failed to start local tunnel: ${e.message}`);
    }
  }

  const publicUrls = [];
  if (publishToInstagram) {
    for (const file of mediaFiles) {
      const url = await getPublicUrlForMedia(file);
      publicUrls.push(url);
    }
  }

  let fbPostId = null;
  let igMediaId = null;

  // --- 1. FACEBOOK PAGE POSTING ---
  if (publishToFacebook) {
    if (!facebookPageId) {
      throw new Error('Facebook Page ID is not configured in Settings.');
    }
    
    logMessage('INFO', `[Meta API] Publishing to Facebook Page ID: ${facebookPageId}...`);
    
    try {
      if (type.toLowerCase() === 'post') {
        // Upload photo directly via multipart form data
        const localFilePath = path.join(imagesDir, mediaFiles[0]);
        const fileBuffer = fs.readFileSync(localFilePath);
        const fileBlob = new Blob([fileBuffer]);
        
        const formData = new FormData();
        formData.append('source', fileBlob, mediaFiles[0]);
        formData.append('message', caption);
        formData.append('access_token', metaAccessToken);
        
        const response = await fetch(`https://graph.facebook.com/v20.0/${facebookPageId}/photos`, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
        fbPostId = result.post_id || result.id;
        logMessage('SUCCESS', `[Meta API] Facebook single photo post successful! ID: ${fbPostId}`);
        
      } else if (type.toLowerCase() === 'reel') {
        // Upload video directly via multipart form data
        const localFilePath = path.join(imagesDir, mediaFiles[0]);
        const fileBuffer = fs.readFileSync(localFilePath);
        const fileBlob = new Blob([fileBuffer]);
        
        const formData = new FormData();
        formData.append('source', fileBlob, mediaFiles[0]);
        formData.append('description', caption);
        formData.append('access_token', metaAccessToken);
        
        const response = await fetch(`https://graph.facebook.com/v20.0/${facebookPageId}/videos`, {
          method: 'POST',
          body: formData
        });
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
        fbPostId = result.id;
        logMessage('SUCCESS', `[Meta API] Facebook video/reel post successful! ID: ${fbPostId}`);
        
      } else if (type.toLowerCase() === 'carousel') {
        // Upload multi-photos as unpublished and then bundle them into a single post
        const attachedMedia = [];
        for (const file of mediaFiles) {
          const localFilePath = path.join(imagesDir, file);
          const fileBuffer = fs.readFileSync(localFilePath);
          const fileBlob = new Blob([fileBuffer]);
          
          const formData = new FormData();
          formData.append('source', fileBlob, file);
          formData.append('published', 'false');
          formData.append('access_token', metaAccessToken);
          
          const response = await fetch(`https://graph.facebook.com/v20.0/${facebookPageId}/photos`, {
            method: 'POST',
            body: formData
          });
          const result = await response.json();
          
          if (result.error) {
            throw new Error(`Failed to upload item (${file}): ${result.error.message}`);
          }
          attachedMedia.push({ media_fbid: result.id });
        }
        
        // Publish the combined post
        const response = await fetch(`https://graph.facebook.com/v20.0/${facebookPageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: caption,
            attached_media: attachedMedia,
            access_token: metaAccessToken
          })
        });
        const result = await response.json();
        
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
        fbPostId = result.id;
        logMessage('SUCCESS', `[Meta API] Facebook carousel post successful! ID: ${fbPostId}`);
      }
    } catch (fbErr) {
      logMessage('ERROR', `[Meta API] Facebook publishing failed: ${fbErr.message}`);
      throw new Error(`Facebook error: ${fbErr.message}`);
    }
  }

  // --- 2. INSTAGRAM BUSINESS ACCOUNT POSTING ---
  if (publishToInstagram) {
    let targetIgAccountId = instagramBusinessAccountId;
    
    // Auto-discover Instagram ID if empty but Facebook Page ID is provided
    if (!targetIgAccountId && facebookPageId) {
      logMessage('INFO', '[Meta API] Instagram account ID is empty. Fetching from Facebook Page...');
      try {
        const response = await fetch(`https://graph.facebook.com/v20.0/${facebookPageId}?fields=instagram_business_account&access_token=${metaAccessToken}`);
        const result = await response.json();
        if (result.instagram_business_account && result.instagram_business_account.id) {
          targetIgAccountId = result.instagram_business_account.id;
          logMessage('INFO', `[Meta API] Discovered linked Instagram ID: ${targetIgAccountId}`);
        } else {
          throw new Error('No Instagram Business Account linked to this Facebook Page.');
        }
      } catch (err) {
        throw new Error(`Instagram auto-discovery failed: ${err.message}`);
      }
    }
    
    if (!targetIgAccountId) {
      throw new Error('Instagram Business Account ID is not configured in Settings.');
    }
    
    logMessage('INFO', `[Meta API] Publishing to Instagram Business Account: ${targetIgAccountId}...`);
    
    try {
      let containerId = null;
      
      if (type.toLowerCase() === 'post') {
        // Step A: Create container
        const response = await fetch(`https://graph.facebook.com/v20.0/${targetIgAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: publicUrls[0],
            caption: caption,
            access_token: metaAccessToken
          })
        });
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
        containerId = result.id;
        
      } else if (type.toLowerCase() === 'reel') {
        // Step A: Create Reel container
        const response = await fetch(`https://graph.facebook.com/v20.0/${targetIgAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'REELS',
            video_url: publicUrls[0],
            caption: caption,
            access_token: metaAccessToken
          })
        });
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
        containerId = result.id;
        
      } else if (type.toLowerCase() === 'carousel') {
        // Step A: Create item containers
        const itemIds = [];
        for (const url of publicUrls) {
          const response = await fetch(`https://graph.facebook.com/v20.0/${targetIgAccountId}/media`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: url,
              is_carousel_item: true,
              access_token: metaAccessToken
            })
          });
          const result = await response.json();
          if (result.error) {
            throw new Error(`Failed to create carousel item container (${url}): ${result.error.message}`);
          }
          itemIds.push(result.id);
        }
        
        // Step B: Create carousel container
        const response = await fetch(`https://graph.facebook.com/v20.0/${targetIgAccountId}/media`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: itemIds,
            caption: caption,
            access_token: metaAccessToken
          })
        });
        const result = await response.json();
        if (result.error) {
          throw new Error(result.error.message || JSON.stringify(result.error));
        }
        containerId = result.id;
      }
      
      // Step B: Poll status for media/video processing
      logMessage('INFO', `[Meta API] Waiting for Instagram container processing (ID: ${containerId})...`);
      let isReady = false;
      let checkCount = 0;
      const maxChecks = 15;
      
      while (!isReady && checkCount < maxChecks) {
        await new Promise(r => setTimeout(r, 6000));
        const checkResponse = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${metaAccessToken}`);
        const checkResult = await checkResponse.json();
        
        if (checkResult.status_code) {
          logMessage('INFO', `[Meta API] Instagram processing status: ${checkResult.status_code}`);
          if (checkResult.status_code === 'FINISHED') {
            isReady = true;
          } else if (checkResult.status_code === 'ERROR') {
            throw new Error(`Instagram processing error: ${checkResult.status || 'Unknown error'}`);
          }
        } else {
          // If status_code is not present, it's typically an image post which is ready immediately
          isReady = true;
        }
        checkCount++;
      }
      
      if (!isReady) {
        throw new Error('Timeout waiting for Instagram media container processing.');
      }
      
      // Step C: Publish container
      logMessage('INFO', `[Meta API] Publishing Instagram post (Container ID: ${containerId})...`);
      const responsePublish = await fetch(`https://graph.facebook.com/v20.0/${targetIgAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: metaAccessToken
        })
      });
      const resultPublish = await responsePublish.json();
      if (resultPublish.error) {
        throw new Error(resultPublish.error.message || JSON.stringify(resultPublish.error));
      }
      igMediaId = resultPublish.id;
      logMessage('SUCCESS', `[Meta API] Instagram post successful! ID: ${igMediaId}`);
      
    } catch (igErr) {
      logMessage('ERROR', `[Meta API] Instagram publishing failed: ${igErr.message}`);
      throw new Error(`Instagram error: ${igErr.message}`);
    }
  }

  return { success: true, fbPostId, igMediaId };
}

// Update DB Post Status helper
async function updatePostStatus(postId, status, errorDetails = null, results = null) {
  const updateData = {
    status: status,
    details: errorDetails ? { error: errorDetails, timestamp: new Date().toISOString(), partialResults: results } : results
  };

  if (isMongoConnected) {
    try {
      await Post.findByIdAndUpdate(postId, updateData);
    } catch (e) {
      logMessage('ERROR', `Failed to update Mongo status: ${e.message}`);
    }
  } else {
    const localDb = loadLocalDb();
    const idx = localDb.findIndex(p => p._id === postId);
    if (idx !== -1) {
      localDb[idx].status = status;
      localDb[idx].details = updateData.details;
      saveLocalDb(localDb);
    }
  }
}

// Orchestrator publishing worker
async function executePublish(postRow, bypassDuplicateCheck = false) {
  const postId = postRow._id;
  const imageKey = (postRow.media || postRow.image || '').trim();
  const type = (postRow.type || 'Post').trim();
  const dateKey = (postRow.date || '').trim();
  const timeKey = (postRow.time || '').trim();
  
  if (!imageKey) {
    logMessage('WARNING', 'Skipping row with missing media name.');
    return;
  }

  logMessage('INFO', `Starting posting workflow for post: ${imageKey} [Type: ${type}] (${dateKey} ${timeKey})`);
  
  try {
    const apiResult = await publishWithMetaApi(postRow);
    await updatePostStatus(postId, 'Published', null, { publishedVia: 'Meta Graph API', apiResult });
    logMessage('SUCCESS', `Post ID ${postId} successfully published!`);
  } catch (err) {
    logMessage('ERROR', `Publishing workflow failed for post ID ${postId}: ${err.message}`);
    await updatePostStatus(postId, 'Failed', err.message);
  }
}

// Background scheduler tick
async function checkScheduleTick(force = false) {
  const config = loadConfig();
  if (!config.schedulerActive && !force) {
    return;
  }

  logMessage('INFO', 'Scheduler checking posting queue from database...');
  
  try {
    let posts = [];
    if (isMongoConnected) {
      posts = await Post.find({ status: { $ne: 'Published' } }).sort({ scheduledDate: 1 });
    } else {
      const localDb = loadLocalDb();
      posts = localDb.filter(p => p.status !== 'Published');
      posts.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    }

    if (posts.length === 0) {
      logMessage('INFO', 'No pending posts found in database.');
      return;
    }

    const now = getNowInTimezone(config.timezone);
    logMessage('INFO', `Current clock time in configured timezone: ${now.toString()}`);

    let pendingCount = 0;
    
    for (const post of posts) {
      if (post.status === 'Published' || (post.status === 'Failed' && !force)) {
        continue;
      }

      const postDate = new Date(post.scheduledDate);
      if (isNaN(postDate.getTime())) {
        logMessage('WARNING', `Could not parse scheduledDate for post ID: ${post._id}`);
        continue;
      }

      // Check if scheduled time has passed
      if (postDate <= now) {
        logMessage('INFO', `Triggering scheduled post: ${post.media.join(', ')} (Scheduled: ${post.date} ${post.time})`);
        
        const postRow = {
          _id: post._id.toString(),
          media: post.media.join(', '),
          type: post.type,
          caption: post.caption,
          date: post.date,
          time: post.time
        };
        await executePublish(postRow);
      } else {
        pendingCount++;
      }
    }
    
    logMessage('INFO', `Scheduler tick completed. Remaining pending posts: ${pendingCount}`);
  } catch (err) {
    logMessage('ERROR', `Scheduler tick failed: ${err.message}`);
  }
}

// Background loop (runs every 60 seconds)
setInterval(checkScheduleTick, 60000);

// API Endpoints

// Lightweight ping endpoint for keep-alive services (cron-job.org)
app.get('/ping', (req, res) => {
  res.json({ ok: true });
});

// GET configs
app.get('/api/config', (req, res) => {
  res.json({
    config: loadConfig(),
    tunnelUrl: tunnelUrl,
    imagesFolderExists: fs.existsSync(imagesDir),
    isMongoConnected: isMongoConnected
  });
});

// POST configs
app.post('/api/config', async (req, res) => {
  const currentConfig = loadConfig();
  const newConfig = { ...currentConfig, ...req.body };
  saveConfig(newConfig);

  logMessage('INFO', 'Configuration settings updated.');

  // Handle DB Reconnect if URI changes
  if (newConfig.mongoUri !== currentConfig.mongoUri) {
    logMessage('INFO', 'MongoDB URI changed. Attempting database reconnection...');
    try {
      await mongoose.disconnect();
    } catch (e) {}
    await connectDb();
  }

  // React to scheduler change
  if (newConfig.schedulerActive && !currentConfig.schedulerActive) {
    logMessage('INFO', 'Scheduler activated by user.');
    if (newConfig.useLocalTunnel) {
      await startTunnel();
    }
  } else if (!newConfig.schedulerActive && currentConfig.schedulerActive) {
    logMessage('INFO', 'Scheduler deactivated by user.');
    await stopTunnel();
  }

  // React to tunnel config toggle
  if (newConfig.useLocalTunnel !== currentConfig.useLocalTunnel) {
    if (newConfig.useLocalTunnel && newConfig.schedulerActive) {
      await startTunnel();
    } else {
      await stopTunnel();
    }
  }

  res.json({ success: true, config: loadConfig(), tunnelUrl, isMongoConnected });
});

// GET posting queue with combined status
app.get('/api/posts', async (req, res) => {
  try {
    let posts = [];
    if (isMongoConnected) {
      posts = await Post.find().sort({ scheduledDate: 1 });
    } else {
      posts = loadLocalDb();
      posts.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    }

    // Expose folder media files to UI (images and videos)
    let availableFiles = [];
    if (fs.existsSync(imagesDir)) {
      availableFiles = fs.readdirSync(imagesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.mp4', '.mov', '.avi'].includes(ext);
      });
    }

    const formattedPosts = posts.map(post => {
      const mediaStr = post.media.join(', ');
      
      // Determine if media is available
      let isMediaAvailable = false;
      if (post.type.toLowerCase() === 'carousel') {
        isMediaAvailable = post.media.length > 0 && post.media.every(f => availableFiles.includes(f));
      } else {
        isMediaAvailable = availableFiles.includes(post.media[0]);
      }

      let scheduledDateISO = null;
      if (post.scheduledDate) {
        const d = new Date(post.scheduledDate);
        if (!isNaN(d.getTime())) {
          scheduledDateISO = d.toISOString();
        }
      }

      return {
        _id: post._id.toString(),
        media: post.media,
        type: post.type,
        caption: post.caption || '',
        date: post.date,
        time: post.time,
        scheduledDate: scheduledDateISO,
        status: post.status,
        details: post.details,
        isImageAvailable: isMediaAvailable // Compatibility field
      };
    });

    res.json({ posts: formattedPosts, availableImages: availableFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create draft post directly with uploaded mediaFiles
app.post('/api/upload-media', upload.array('mediaFiles'), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No media files uploaded.' });
  }

  try {
    const files = req.files.map(f => f.filename);
    
    // Auto-detect post type based on file counts/extensions
    let type = 'Post';
    const firstExt = path.extname(files[0]).toLowerCase();
    
    if (files.length > 1) {
      type = 'Carousel';
    } else if (['.mp4', '.mov', '.avi', '.mkv'].includes(firstExt)) {
      type = 'Reel';
    }

    // Calculate next prefilled date-time schedule slot
    const slot = await getNextScheduleSlot();

    const postData = {
      media: files,
      type: type,
      caption: '',
      date: slot.date,
      time: slot.time,
      scheduledDate: slot.scheduledDate,
      status: 'Pending',
      details: null
    };

    let newPost = null;
    if (isMongoConnected) {
      const dbPost = new Post(postData);
      await dbPost.save();
      newPost = dbPost.toObject();
    } else {
      postData._id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
      const localDb = loadLocalDb();
      localDb.push(postData);
      saveLocalDb(localDb);
      newPost = postData;
    }

    logMessage('INFO', `Created new draft post ID: ${newPost._id} with ${files.length} file(s) [Type: ${type}]`);
    res.json({ success: true, post: newPost });
  } catch (err) {
    logMessage('ERROR', `Failed to create draft post: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST upload only (does not create post)
app.post('/api/upload-raw', upload.array('mediaFiles'), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No media files uploaded.' });
  }
  const filenames = req.files.map(f => f.filename);
  res.json({ success: true, filenames });
});

// PUT update post details
app.put('/api/posts/:id', async (req, res) => {
  const id = req.params.id;
  const { type, caption, media, date, time } = req.body;
  
  try {
    // If date/time updated, recalculate scheduledDate
    let scheduledDate = undefined;
    if (date && time) {
      scheduledDate = parseDateTime(date, time);
    }

    const updateData = {};
    if (type !== undefined) updateData.type = type;
    if (caption !== undefined) updateData.caption = caption;
    if (media !== undefined) updateData.media = media;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (scheduledDate) updateData.scheduledDate = scheduledDate;

    // Reset status back to pending if they changed details
    updateData.status = 'Pending';
    updateData.details = null;

    let updatedPost = null;
    if (isMongoConnected) {
      updatedPost = await Post.findByIdAndUpdate(id, updateData, { new: true });
    } else {
      const localDb = loadLocalDb();
      const idx = localDb.findIndex(p => p._id === id);
      if (idx !== -1) {
        localDb[idx] = { ...localDb[idx], ...updateData };
        saveLocalDb(localDb);
        updatedPost = localDb[idx];
      }
    }

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    res.json({ success: true, post: updatedPost });
  } catch (err) {
    logMessage('ERROR', `Failed to update post ID ${id}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// DELETE remove post
app.delete('/api/posts/:id', async (req, res) => {
  const id = req.params.id;
  try {
    let success = false;
    if (isMongoConnected) {
      const result = await Post.findByIdAndDelete(id);
      success = !!result;
    } else {
      const localDb = loadLocalDb();
      const startLen = localDb.length;
      const filtered = localDb.filter(p => p._id !== id);
      saveLocalDb(filtered);
      success = filtered.length < startLen;
    }

    if (!success) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    logMessage('INFO', `Deleted post ID: ${id}`);
    res.json({ success: true });
  } catch (err) {
    logMessage('ERROR', `Failed to delete post ID ${id}: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET logs
app.get('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(logFilePath)) {
      const content = fs.readFileSync(logFilePath, 'utf8');
      res.json({ logs: content });
    } else {
      res.json({ logs: '[SYSTEM] No logs available yet.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST clear logs
app.post('/api/clear-logs', (req, res) => {
  try {
    fs.writeFileSync(logFilePath, '', 'utf8');
    logMessage('INFO', 'Logs cleared by user.');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST clear statuses (resets posting queue statuses)
app.post('/api/clear-status', async (req, res) => {
  try {
    if (isMongoConnected) {
      await Post.updateMany({}, { status: 'Pending', details: null });
    } else {
      const localDb = loadLocalDb();
      localDb.forEach(p => {
        p.status = 'Pending';
        p.details = null;
      });
      saveLocalDb(localDb);
    }
    logMessage('INFO', 'Posting status history reset in database by user.');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST trigger scheduler tick manually
app.post('/api/trigger-sync', async (req, res) => {
  logMessage('INFO', 'Manual sync triggered by user.');
  try {
    await checkScheduleTick(true);
    res.json({ success: true, message: 'Sync completed.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST publish post now (ignores scheduled time and status DB check)
app.post('/api/publish-now', async (req, res) => {
  const { postId } = req.body;
  if (!postId) {
    return res.status(400).json({ error: 'Post ID is required.' });
  }

  logMessage('INFO', `User clicked "Publish Now" for post ID: ${postId}. Bypassing scheduling.`);
  
  try {
    let post = null;
    if (isMongoConnected) {
      post = await Post.findById(postId);
    } else {
      const localDb = loadLocalDb();
      post = localDb.find(p => p._id === postId);
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const postRow = {
      _id: post._id.toString(),
      media: post.media.join(', '),
      type: post.type,
      caption: post.caption,
      date: post.date,
      time: post.time
    };

    await executePublish(postRow, true);
    res.json({ success: true, message: 'Publish command executed. Check logs for details.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST import spreadsheet schedule into database
app.post('/api/import-schedule', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  try {
    const rows = await readSchedule();
    logMessage('INFO', `Importing ${rows.length} rows from spreadsheet into database...`);

    const importedPosts = [];
    
    for (const row of rows) {
      const media = (row.media || row.image || '').trim();
      const type = (row.type || 'Post').trim();
      const date = row.date || '';
      const time = row.time || '';
      const caption = row.caption || '';

      if (!media) continue;

      const mediaFiles = media.split(',').map(f => f.trim()).filter(Boolean);
      const scheduledDate = parseDateTime(date, time) || new Date();

      const postData = {
        media: mediaFiles,
        type: type,
        caption: caption,
        date: date,
        time: time,
        scheduledDate: scheduledDate,
        status: 'Pending',
        details: null
      };

      if (isMongoConnected) {
        const dbPost = new Post(postData);
        await dbPost.save();
        importedPosts.push(dbPost.toObject());
      } else {
        postData._id = Date.now().toString() + '_' + Math.random().toString(36).substr(2, 5);
        const localDb = loadLocalDb();
        localDb.push(postData);
        saveLocalDb(localDb);
        importedPosts.push(postData);
      }
    }

    logMessage('INFO', `Successfully imported ${importedPosts.length} posts into database.`);
    res.json({ success: true, count: importedPosts.length });
  } catch (err) {
    logMessage('ERROR', `Failed to import spreadsheet schedule: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Start the server & connect DB
app.listen(PORT, async () => {
  logMessage('INFO', `SocialPost Automation Server running on http://localhost:3000`);
  
  // Connect to MongoDB
  await connectDb();

  // Auto-start tunnel on start if config demands it
  const config = loadConfig();
  if (config.schedulerActive && config.useLocalTunnel) {
    await startTunnel();
  }
});
