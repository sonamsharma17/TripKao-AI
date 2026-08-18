/**
 * Script to copy carousel folders with unique names and schedule them in MongoDB
 * Starting from 14 Sep 2026 12:00 PM IST
 */

const fs = require('fs');
const path = require('path');
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://sonam:Sonamji%4099266@cluster0.acvhq4s.mongodb.net/tripkaroai?retryWrites=true&w=majority';

const PostSchema = new mongoose.Schema({
  media: [String],
  type: { type: String, default: 'Post' },
  caption: String,
  date: String,
  time: String,
  scheduledDate: Date,
  status: { type: String, default: 'Pending' },
  details: mongoose.Schema.Types.Mixed
});
const Post = mongoose.model('Post', PostSchema);

const toUploadDir = path.join(__dirname, 'to_upload');
const imagesDir = path.join(__dirname, 'posts_images');

const CAROUSEL_FOLDERS = [
  { folder: 'coursel 1 - Copy', id: 'carousel_01', title: 'Carousel 1: Midnight Inquiries (The 24/7 Autopilot)', caption: `Carousel 1: Midnight Inquiries (The 24/7 Autopilot)\n40% of high-budget travelers plan holidays late at night, but manual agencies only reply the next morning. By then, the client has already booked with an OTA or a competitor. Swipe through to see how TripKaro AI qualifies midnight inquiries, presents tailored packages, and locks advance deposits while your team sleeps. Put your agency sales on 24/7 autopilot: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (2)', id: 'carousel_02', title: 'Carousel 2: The PDF Itinerary Trap', caption: `Carousel 2: The PDF Itinerary Trap\nSpending 2 hours crafting custom PDF itineraries only for clients to copy the hotels and book online themselves is lost revenue. Swipe through to discover why static brochures fail and how dynamic, interactive in-chat proposals protect your research, lock the lead, and collect advance deposits in seconds. Stop giving away free travel plans: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (2) - Copy', id: 'carousel_03', title: 'Carousel 3: The Speed Divide (Manual vs AI Split Screen)', caption: `Carousel 3: The Speed Divide (Manual vs AI Split Screen)\nSame marketing budget, two completely different sales outcomes. Swipe through this side-by-side comparison to see how manual 4-hour DM delays cause leads to go cold, while 2-second autonomous AI responses capture 8x more paid bookings from the exact same ad spend. Upgrade your sales velocity: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (3)', id: 'carousel_04', title: 'Carousel 4: The 3 AM Price Shopper (Dark Mode UI Flow)', caption: `Carousel 4: The 3 AM Price Shopper (Dark Mode UI Flow)\nWhat happens when a ₹3 Lakh Dubai inquiry lands in your DMs at 3:14 AM? Swipe through to see the exact dark-mode chat flow—from instant qualification and dynamic package rendering to a confirmed advance deposit in under 3 minutes. Turn late-night inquiries into paid bookings: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (3) - Copy', id: 'carousel_05', title: 'Carousel 5: The 300-Hour Proposal Drain (Agency Audit)', caption: `Carousel 5: The 300-Hour Proposal Drain (Agency Audit)\nIs your sales team functioning as an agency or a free itinerary factory? Swipe through this operational audit to see how spending 300 hours on manual quotes hurts conversions, and how automated dynamic curation allows you to close 5x more packages with zero extra hiring. Scale your agency revenue: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (4) - Copy', id: 'carousel_06', title: 'Carousel 6: The 5-Minute Window (Minimal Red Beach Edition)', caption: `Carousel 6: The 5-Minute Window (Minimal Red Beach Edition)\nHigh-intent travelers wait 5 minutes; manual sales teams reply in 3 hours. That response gap is where your direct revenue disappears. Swipe through to see the seamless 3-step shift from instant inquiry to secured deposit with TripKaro AI. Automate your sales pipeline today: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (5) - Copy', id: 'carousel_07', title: 'Carousel 7: Direct Booking vs OTA Tax', caption: `Carousel 7: Direct Booking vs OTA Tax\nStop handing 20% of your margins to online booking portals. Swipe through to see how instant, interactive WhatsApp checkout keeps 100% of the commission with your travel agency. Own your guest relationships and protect your profits: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (6) - Copy', id: 'carousel_08', title: 'Carousel 8: The Viral Lead Tsunami (Handling 500+ DMs)', caption: `Carousel 8: The Viral Lead Tsunami (Handling 500+ DMs)\nWhen your Instagram Reel blows up with 500+ comments, manual DM replies collapse under the volume. Swipe through to see how TripKaro AI autonomously engages every single commenter in 2 seconds, turning viral buzz into paid deposits: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (6) - Copy - Copy', id: 'carousel_09', title: 'Carousel 9: The Ghosting Antidote (Behavioral Re-engagement)', caption: `Carousel 9: The Ghosting Antidote (Behavioral Re-engagement)\n80% of travel leads who say "will let you know" never confirm because manual follow-ups arrive too late. Swipe through to see how intelligent behavioral nudges revive cold inquiries and turn abandoned chats into locked bookings: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (6) - Copy - Copy - Copy', id: 'carousel_10', title: 'Carousel 10: The High-Ticket Closer (Luxury Travel Flow)', caption: `Carousel 10: The High-Ticket Closer (Luxury Travel Flow)\nHigh-net-worth travelers expect bespoke luxury service with zero friction. Swipe through to experience how TripKaro AI curates ultra-custom itineraries, negotiates dates dynamically, and captures premium deposits in minutes: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (7) - Copy - Copy', id: 'carousel_11', title: 'Carousel 11: Scaling Without Burnout (Headcount vs AI)', caption: `Carousel 11: Scaling Without Burnout (Headcount vs AI)\nPeak travel seasons shouldn't mean panic hiring, overtime, and exhausted sales reps. Swipe through to see how autonomous AI infrastructure scales your booking capacity by 10x without adding a single rupee to your fixed payroll: https://www.tripkaroai.tech/` },
  { folder: 'coursel 1 - Copy (7) - Copy - Copy - Copy', id: 'carousel_12', title: 'Carousel 12: The End-to-End Travel Sales Machine', caption: `Carousel 12: The End-to-End Travel Sales Machine\nFrom the very first "Price?" comment on social media to a verified deposit settlement in your bank account—swipe through to see the complete automated sales funnel powered by TripKaro AI. Build a 24/7 revenue engine: https://www.tripkaroai.tech/` }
];

// Slots in order: 09:00 AM, 12:00 PM, 05:00 PM, 07:00 PM
const SLOTS = [
  { time: '09:00 AM', utcHour: 3, utcMinute: 30 },
  { time: '12:00 PM', utcHour: 6, utcMinute: 30 },
  { time: '05:00 PM', utcHour: 11, utcMinute: 30 },
  { time: '07:00 PM', utcHour: 13, utcMinute: 30 }
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Schedule sequence starting after 14 Sep 09:00 AM (which was slot index 0)
// So carousel 0 gets 14 Sep 12:00 PM (slot 1), carousel 1 gets 14 Sep 05:00 PM (slot 2), etc.
function getCarouselSchedule(index) {
  // Start from slot offset 1 on 14 Sep 2026
  const totalSlotOffset = 1 + index;
  const dayOffset = Math.floor(totalSlotOffset / 4);
  const slotIndex = totalSlotOffset % 4;
  const slot = SLOTS[slotIndex];

  const startDate = new Date(Date.UTC(2026, 8, 14, slot.utcHour, slot.utcMinute, 0)); // Sep 14 2026
  startDate.setUTCDate(startDate.getUTCDate() + dayOffset);

  const istDate = new Date(startDate.getTime() + 5.5 * 60 * 60 * 1000);
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  const month = MONTHS[istDate.getUTCMonth()];
  const year = istDate.getUTCFullYear();

  return {
    date: `${day} ${month} ${year}`,
    time: slot.time,
    scheduledDate: startDate
  };
}

async function main() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);
  console.log('Connected!');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  let inserted = 0;

  for (let i = 0; i < CAROUSEL_FOLDERS.length; i++) {
    const item = CAROUSEL_FOLDERS[i];
    const srcFolder = path.join(toUploadDir, item.folder);

    if (!fs.existsSync(srcFolder)) {
      console.warn(`Folder not found: ${srcFolder}`);
      continue;
    }

    // Read and sort images 1.png to 5.png
    const files = fs.readdirSync(srcFolder)
      .filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg'))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

    const targetFileNames = [];
    for (let fIdx = 0; fIdx < files.length; fIdx++) {
      const srcFile = path.join(srcFolder, files[fIdx]);
      const ext = path.extname(files[fIdx]);
      const targetName = `${item.id}_${fIdx + 1}${ext}`;
      const targetPath = path.join(imagesDir, targetName);

      fs.copyFileSync(srcFile, targetPath);
      targetFileNames.push(targetName);
    }

    const schedule = getCarouselSchedule(i);

    // Save to DB
    const post = new Post({
      media: targetFileNames,
      type: 'Carousel',
      caption: item.caption,
      date: schedule.date,
      time: schedule.time,
      scheduledDate: schedule.scheduledDate,
      status: 'Pending',
      details: null
    });

    await post.save();
    inserted++;
    console.log(`[Carousel ${inserted}/12] ${schedule.date} ${schedule.time} -> ${targetFileNames.join(', ')}`);
  }

  console.log(`\n✅ Done! Inserted ${inserted} Carousel posts into MongoDB.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
