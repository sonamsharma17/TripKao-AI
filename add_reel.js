/**
 * Script to schedule the Reel in MongoDB
 * Date: 17 Sep 2026 12:00 PM IST
 */

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

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB!');

  const scheduledDate = new Date(Date.UTC(2026, 8, 17, 6, 30, 0)); // 17 Sep 2026 12:00 PM IST = 06:30 AM UTC
  
  const caption = `Sleeping in, having your morning tea, having dinner with family, or simply taking time off should not come at the cost of losing high-ticket travel clients. In the travel business, inquiries do not stop just because you stepped away from your desk. In fact, most high-intent travelers browse and message late at night or during off-hours, and waiting hours for a response usually means losing them to a faster competitor or an online booking platform.

With TripKaro AI, your agency stays actively selling 24/7 without requiring you to stay glued to your phone screen all day. Whether you are asleep, enjoying your morning routine, or traveling yourself, your automated sales agent instantly engages incoming leads within 2 seconds. It qualifies traveler preferences, shares customized interactive itineraries, handles common queries, and secures advance deposits directly inside WhatsApp and Instagram.

You get to run your agency on your terms while your sales pipeline operates continuously in the background. Experience true freedom and consistent booking growth without the operational burnout. See how it works at https://www.tripkaroai.tech/`;

  const reel = new Post({
    media: ['VN20260819_003756.mp4'],
    type: 'Reel',
    caption: caption,
    date: '17 Sep 2026',
    time: '12:00 PM',
    scheduledDate: scheduledDate,
    status: 'Pending',
    details: null
  });

  await reel.save();
  console.log('✅ Reel successfully scheduled for 17 Sep 2026 12:00 PM!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
