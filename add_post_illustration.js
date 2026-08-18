/**
 * Script to schedule the comparison illustration post
 * Date: 17 Sep 2026 05:00 PM IST
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

  // 17 Sep 2026 05:00 PM IST = 11:30 AM UTC
  const scheduledDate = new Date(Date.UTC(2026, 8, 17, 11, 30, 0));
  
  const caption = `Seeing your hard-earned leads walk away and book with a competitor hurts, especially when you spent your marketing budget and effort to attract them in the first place. The truth is, high-value travelers do not wait around for manual email replies, late morning follow-ups, or 10-page static PDF brochures that take hours to draft. Every minute of delay gives them an opportunity to take your recommendations, search online, and book elsewhere.

While manual agencies stay buried under unread DMs and administrative chaos, modern travel agencies are scaling effortlessly with TripKaro AI. The system engages every traveler within 2 seconds, understands their budget and destination preferences, delivers interactive personalized itineraries, and secures advance deposits directly inside WhatsApp and Instagram around the clock.

Stop letting slow response times drain your margins and steal your best bookings. Turn your inquiries into confirmed revenue on autopilot. Explore how at https://www.tripkaroai.tech/`;

  const post = new Post({
    media: ['Gemini_Generated_Image_97p6s897p6s897p6.png'],
    type: 'Post',
    caption: caption,
    date: '17 Sep 2026',
    time: '05:00 PM',
    scheduledDate: scheduledDate,
    status: 'Pending',
    details: null
  });

  await post.save();
  console.log('✅ Illustration post successfully scheduled for 17 Sep 2026 05:00 PM!');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
