/**
 * Script to schedule reel1.mp4 in MongoDB
 * Date: 17 Sep 2026 07:00 PM IST
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

  // 17 Sep 2026 07:00 PM IST = 01:30 PM UTC
  const scheduledDate = new Date(Date.UTC(2026, 8, 17, 13, 30, 0));
  
  const caption = `Every second of delay between an inquiry and a reply is costing your travel agency high-ticket bookings. High-intent travelers do not wait hours for manual quotes; they move on to the fastest responder.
TripKaro AI acts as your autonomous sales engine on WhatsApp and Instagram, engaging leads within 2 seconds, delivering dynamic custom itineraries, and securing advance deposits 24/7.
Test the live AI yourself right now:
Instagram Demo: https://instagram.com/tripkaroaidemo
We are offering a 1-day free trial on your own accounts to let you experience the conversion boost firsthand.
Get started: https://www.tripkaroai.tech/`;

  const reel = new Post({
    media: ['reel1.mp4'],
    type: 'Reel',
    caption: caption,
    date: '17 Sep 2026',
    time: '07:00 PM',
    scheduledDate: scheduledDate,
    status: 'Pending',
    details: null
  });

  await reel.save();
  console.log('✅ Reel (reel1.mp4) successfully scheduled for 17 Sep 2026 07:00 PM!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
