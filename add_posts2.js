/**
 * Migration script: Add posts2 images to MongoDB
 * Starting from 19 Aug 2026, 4 posts/day at 9:00 AM, 12:00 PM, 5:00 PM, 7:00 PM IST
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

// 105 images in alphabetical order mapped to captions
const IMAGE_CAPTION_MAP = [
  // 1 - "Sent you a DM kills your Instagram sales" -> Post 69
  { file: 'Gemini_Generated_Image_12owee12owee12ow.png', caption: `Turn social media comments into real paying clients. Getting hundreds of comments on a promotional Reel is great, but manually DMing each person is nearly impossible. TripKaro AI automatically responds to every comment, opens a private DM, and qualifies the traveler on the spot. Convert your social buzz into real revenue: https://www.tripkaroai.tech/` },
  // 2 - "Stop letting leads wander off. Direct them straight to checkout." -> Post 86
  { file: 'Gemini_Generated_Image_1ydjt71ydjt71ydj.png', caption: `The easiest way to double your travel agency's revenue is to stop losing the leads you already have. You do not always need more traffic; you need a tighter sales net that catches every inquiry. TripKaro AI ensures zero abandoned chats and zero missed opportunities. Plug the leaks in your sales funnel: https://www.tripkaroai.tech/` },
  // 3 - "Every conversation engineered to close. Your top-performing sales agent is 100% code." -> Post 12
  { file: 'Gemini_Generated_Image_21px8121px8121px.png', caption: `Rule-based chatbots frustrate premium travelers with robotic, dead-end menus. TripKaro AI understands complex travel context, natural language, and budget nuances. It can negotiate dates, handle dynamic objections, and cross-sell experiences—all while maintaining your brand's sophisticated voice. Stop settling for a simple FAQ bot; deploy an autonomous sales agent trained specifically to close bookings. Experience the difference: https://www.tripkaroai.tech/` },
  // 4 - "Turn inquiry noise into instant clarity. The autonomous AI agent closing direct bookings." -> Post 33
  { file: 'Gemini_Generated_Image_2l1fiu2l1fiu2l1f.png', caption: `Is your sales team overwhelmed by generic "Price?" inquiries? Relying on manual filtering wastes valuable time that should be spent closing high-value deals. TripKaro AI instantly qualifies every lead, handling the basic budgeting and date questions autonomously. Let your human agents focus on the final negotiation, not the initial sort. Optimize your team's efficiency: https://www.tripkaroai.tech/` },
  // 5 - "Flawless guest journeys look simple. Behind the scenes, it's pure precision." -> Post 85
  { file: 'Gemini_Generated_Image_39nwfg39nwfg39nw.png', caption: `Eliminate human error in pricing and package details. In the rush of managing dozens of chats, manual agents often quote wrong rates or miss critical inclusions. TripKaro AI pulls from accurate, live data to deliver flawless proposals every time. Protect your brand reputation and bottom line: https://www.tripkaroai.tech/` },
  // 6 - "Response Capacity: 40 Chats Manual | 10,000+ Chats TripKaro AI" -> Post 17
  { file: 'Gemini_Generated_Image_3jgf7d3jgf7d3jgf.png', caption: `Can your agency handle 300 simultaneous inquiries right now? If not, you are losing money. A high-budget ad campaign without instant, scalable response infrastructure is just wasted spend. While manual operators struggle with concurrency, TripKaro AI effortlessly manages thousands of high-quality sales conversations at scale, ensuring every lead receives instant engagement. Build a truly scalable travel business. Request a demo at https://www.tripkaroai.tech/` },
  // 7 - "They were one reply away from booking. Never let them dissolve into the void." -> Post 81
  { file: 'Gemini_Generated_Image_4caaqy4caaqy4caa.png', caption: `The hidden drain of manual follow-ups. Travel agents spend hours chasing leads who said "will check with family" and then went silent. TripKaro AI tracks traveler behavior and sends intelligent, well-timed nudges that revive interest and secure the booking. Automate your follow-up pipeline today: https://www.tripkaroai.tech/` },
  // 8 - "Delayed responses kill high-ticket bookings." -> Post 5
  { file: 'Gemini_Generated_Image_4e3ei04e3ei04e3e.png', caption: `High-value travel leads go cold in under 5 minutes. Speed is the ultimate luxury in travel sales. Manual sales pipelines create barriers that delay commitment. High-intent travelers book with the agency that replies first and replies intelligently. TripKaro AI qualifies and converts before competitors even say hello. Book a demo at https://www.tripkaroai.tech/` },
  // 9 - Post 1
  { file: 'Gemini_Generated_Image_4frhok4frhok4frh.png', caption: `Your team replies to DMs in 3 hours. Your high-value leads wait 5 minutes. High-intent travelers book with who replies first. While you check flights manually, they book with a competitor or an OTA. TripKaro AI ensures an instant, intelligent response at 3:14 AM. Stop losing late-night revenue. Automate your sales pipeline today. Click to learn more: https://www.tripkaroai.tech/` },
  // 10 - Post 10
  { file: 'Gemini_Generated_Image_4oxzr34oxzr34oxz.png', caption: `Handle 500 simultaneous inquiries with zero team intervention. When that viral post creates a massive flood of comments, can your team handle it manually? Travel scale requires instant multi-lead concurrency. TripKaro AI effortlessly manages individualized conversations at scale, ensuring no lead goes cold. Automate today at https://www.tripkaroai.tech/` },
  // 11 - Post 11
  { file: 'Gemini_Generated_Image_546avp546avp546a.png', caption: `Your competitors aren't working harder; they are just working faster. In the luxury travel sector, speed defines the service standard. A 4-hour delay in responding to a direct message signals that you are too busy or too manual for a premium client. TripKaro AI ensures every inquiry gets a bespoke, high-quality reply in 2 seconds, not hours. Don't just compete on price; compete on conversion velocity. Join the automated standard at https://www.tripkaroai.tech/` },
  // 12 - Post 22
  { file: 'Gemini_Generated_Image_5m51ky5m51ky5m51.png', caption: `Scale your travel agency headcount, not your team's workload. Hiring extra sales reps to manage high-volume DMs is a costly scaling model that increases overhead and human error. TripKaro AI acts as an infinite sales multiplier, managing thousands of complex sales conversations instantly. Reclaim your operating margin and let your existing human team focus on relationship building, not administrative chat tasks. Optimize your headcount spend: https://www.tripkaroai.tech/` },
  // 13 - Post 20
  { file: 'Gemini_Generated_Image_72otgm72otgm72ot.png', caption: `Is your travel agency operational 24/7/365? 40% of high-intent inquiries arrive outside of regular business hours. An automated "We are currently closed" message is a signal for the traveler to book elsewhere. Deploy TripKaro AI as your autonomous night shift, capable of handling complex itinerary sales and securing deposits while your team sleeps. Get 24/7 revenue potential without the headcount cost. Learn how: https://www.tripkaroai.tech/` },
  // 14 - Post 23
  { file: 'Gemini_Generated_Image_78s96778s96778s9.png', caption: `You didn't build a luxury brand to split 20% of your revenue with OTAs. But if you reply too late to an Instagram DM, you are practically giving that client a discount code for Agoda. Instant Direct Bookings are the primary defense against OTA dependency. TripKaro AI ensures every inquiry gets a high-end, individualized DM in 2 seconds, retaining direct control of the reservation. Protect your direct margin: https://www.tripkaroai.tech/` },
  // 15 - Post 2
  { file: 'Gemini_Generated_Image_7bkizz7bkizz7bki.png', caption: `Static proposal PDFs are just free research for your clients. They take your hard work and book it themselves online. TripKaro AI delivers dynamic, interactive travel packages directly inside WhatsApp. Locked dates, live pricing, and instant commitment. Stop being a free travel planner. Start being a closer. Request your demo at https://www.tripkaroai.tech/` },
  // 16 - Post 14
  { file: 'Gemini_Generated_Image_7fnmwy7fnmwy7fnm.png', caption: `Your Reels are going viral, but your DMs are overwhelmed. A flood of 200 comments reading "Price?" is a massive scaling challenge if you manage it manually. Delayed responses cause leads to drop off faster than they arrived. TripKaro AI scales instantly, managing 500 simultaneous conversations with zero lag. Ensure every single comment gets a direct, individualized sales response, converting viral attention into confirmed sales. Learn how to scale seamlessly: https://www.tripkaroai.tech/` },
  // 17 - Post 7
  { file: 'Gemini_Generated_Image_7naxa97naxa97nax.png', caption: `From inquiry to paid deposit in under 60 seconds. Turn a "Price Shopper" into a paid client before their curiosity fades. TripKaro AI autonomously guides guests to selection and captures advanced deposits within WhatsApp. Locked dates, confirmed intent, and frictionless settlement. This is how high-performance agencies close. Learn how: https://www.tripkaroai.tech/` },
  // 18 - Post 8
  { file: 'Gemini_Generated_Image_81pcfm81pcfm81pc.png', caption: `The travel sales desk that never sleeps. 40% of high-budget inquiries arrive after midnight. Who is handling yours? While manual operations cause frustrated mornings, TripKaro AI is recommending itineraries and closing sales while your team rests. Scale your agency revenue on autopilot without scaling headcount. See how: https://www.tripkaroai.tech/` },
  // 19 - Post 21
  { file: 'Gemini_Generated_Image_8681ew8681ew8681.png', caption: `The "Ghosting" epidemic in travel sales. A client inquires, gets a great quote after 4 hours, and then vanishes. Why? Because the excitement died during the wait. Speed isn't just a metric; it's the psychological driver of commitment. TripKaro AI qualifies, recommends, and closes direct sales in 2 seconds, while the client is still actively engaged. Stop getting ghosted. Start getting paid. See the speed divide: https://www.tripkaroai.tech/` },
  // 20 - Post 9
  { file: 'Gemini_Generated_Image_96ohf696ohf696oh.png', caption: `The hidden cost of free proposals. Every custom itinerary your team drafts manually is a risk of lost revenue when clients book online themselves. Lock your lead before you reveal the plan. TripKaro AI delivers dynamic, locked proposals that capture deposits before disclosing specific details that can be copied. Protect your IP: https://www.tripkaroai.tech/` },
  // 21 - Post 3
  { file: 'Gemini_Generated_Image_9aojt99aojt99aoj (1).png', caption: `Your ad generated 400 inquiries but your team only replied to 30. Delayed DMs kill conversion velocity and waste your ad budget. Don't blame the ad campaign; audit your manual response process. TripKaro AI engages 100% of leads in 2 seconds. Turn viral attention into confirmed deposits. See how at https://www.tripkaroai.tech/` },
  // 22 - Post 4
  { file: 'Gemini_Generated_Image_9aojt99aojt99aoj.png', caption: `Why pay a 20% commission tax to OTAs? You did the Reels and won the relationship. Slow manual DMs drive direct traffic to OTAs for faster booking. TripKaro AI gives you instant direct DMs, keeping guests with you. Own the client relationship and keep 100% direct margins. Automate to protect your profit: https://www.tripkaroai.tech/` },
  // 23 - Post 6
  { file: 'Gemini_Generated_Image_9jcbs99jcbs99jcb.png', caption: `Is your team spending 300 hours a month drafting free quotes? That is a free itinerary factory, not a scalable travel agency. Shift from manual volume work to high-value conversion focus. TripKaro AI builds tailored tour packages and quotes in 5 seconds. Save 100+ hours monthly and scale your productivity: https://www.tripkaroai.tech/` },
  // 24 - Post 51
  { file: 'Gemini_Generated_Image_a1ya8qa1ya8qa1ya.png', caption: `The luxury of instant gratification. High-end clients value their time above all else. Waiting hours for a simple itinerary quote feels like a dated service model to them. TripKaro AI provides the premium experience they expect—intelligent, personalized, and instantaneous. Elevate your agency's service standard to match your luxury offerings. Provide instant luxury: https://www.tripkaroai.tech/` },
  // 25 - Post 52
  { file: 'Gemini_Generated_Image_aec3qzaec3qzaec3.png', caption: `Own the entire customer journey, not just the inspiration phase. You did the hard work of creating a desire for a destination through your marketing. Don't hand the final booking over to an OTA because your response was too slow. TripKaro AI bridges the gap between inspiration and confirmation, securing direct bookings instantly within the DM. Retain full control: https://www.tripkaroai.tech/` },
  // 26 - Post 53
  { file: 'Gemini_Generated_Image_amd5cmamd5cmamd5.png', caption: `Stop wasting skilled human talent on unskilled sorting tasks. If your experienced sales agents are spending their mornings clearing out "price check" DMs, you are mismanaging your resources. TripKaro AI filters and qualifies every inquiry autonomously, delivering only high-intent, ready-to-book leads to your team. Focus on closing, not sorting. Optimize your talent at https://www.tripkaroai.tech/` },
  // 27 - Post 54
  { file: 'Gemini_Generated_Image_aokiycaokiycaoki.png', caption: `The psychology of the sales friction point. Every time a client has to leave a chat app to fill a form, send an email, or make a call, you lose a percentage of them. TripKaro AI keeps the entire sales process—from initial greeting to deposit payment—inside the messaging app. This is the definition of frictionless sales velocity. Remove the friction at https://www.tripkaroai.tech/` },
  // 28 - Post 55
  { file: 'Gemini_Generated_Image_auxi5aauxi5aauxi.png', caption: `Scale your agency profits, not your operating expenses. Traditional scaling means hiring more people, which increases your overhead and managerial complexity. TripKaro AI allows you to handle 10x the inquiry volume without adding a single dollar to your fixed headcount cost. Achieve scalable growth that actually improves your bottom line. Invest in efficiency: https://www.tripkaroai.tech/` },
  // 29 - Post 56
  { file: 'Gemini_Generated_Image_aypzs0aypzs0aypz.png', caption: `Turn your travel itineraries into interactive conversion tools. A PDF is a passive document; a TripKaro AI dynamic proposal is an active closing agent. Our system delivers tailored travel packages directly in-chat that allow clients to view options and pay deposits instantly. Stop hoping they like the PDF. Start securing the commitment. Upgrade your proposals: https://www.tripkaroai.tech/` },
  // 30 - Post 57
  { file: 'Gemini_Generated_Image_b33xfyb33xfyb33x.png', caption: `Your physical office has hours, but your digital agency shouldn't. Travel is a global industry, and purchasing intent doesn't stick to a 9-to-5 schedule. TripKaro AI gives you a dedicated, intelligent sales presence 24/7, capable of managing complex itinerary inquiries and collecting deposits while your team is offline. Get around-the-clock revenue potential at https://www.tripkaroai.tech/` },
  // 31 - Post 58
  { file: 'Gemini_Generated_Image_b6ewehb6ewehb6ew.png', caption: `Capture the holiday impulse before logic takes over. The decision to book a luxury trip is often emotional, driven by the immediate desire for an experience. Relying on a manual sales process gives the client time to cool off and start price shopping on OTAs. TripKaro AI strikes while the emotion is peak, securing the deposit in minutes. Lock in the impulse booking: https://www.tripkaroai.tech/` },
  // 32 - Post 59
  { file: 'Gemini_Generated_Image_brjehabrjehabrje.png', caption: `Don't let your marketing success crush your sales team. A viral post with 400 comments is a huge win, until your manual response process collapses under the load. TripKaro AI scales instantly, ensuring every single "Price?" or "Details?" comment receives an immediate, individualized direct message that qualifies the lead. Convert the viral wave into paid bookings. Master the momentum: https://www.tripkaroai.tech/` },
  // 33 - Post 60
  { file: 'Gemini_Generated_Image_bwmtnnbwmtnnbwmt.png', caption: `True agency scalability is built on automation infrastructure, not employee exhaustion. If high-inquiry season means late nights and stress for your team, your process is not scalable. TripKaro AI handles the heavy, repetitive lifting of lead qualification and itinerary presentation, allowing your agency to grow effortlessly. Build a business that scales smoothly. See how: https://www.tripkaroai.tech/` },
  // 34 - Post 61
  { file: 'Gemini_Generated_Image_c7hsc2c7hsc2c7hs.png', caption: `First impressions in sales are measured in seconds, not hours. When a traveler reaches out on Instagram or WhatsApp, their intent is at an all-time high. A delayed response makes your brand look unorganized and pushes them straight to competitors. TripKaro AI engages instantly with personalized details, setting a high standard of responsiveness right away. Win the first impression: https://www.tripkaroai.tech/` },
  // 35 - Post 62
  { file: 'Gemini_Generated_Image_cazc8gcazc8gcazc.png', caption: `Direct bookings don't happen by chance; they happen by convenience. If booking directly with your agency is harder or slower than tapping a few buttons on an OTA, you will always lose the sale. TripKaro AI removes the friction by delivering instant itineraries and booking links right in the chat. Make direct booking the easiest choice: https://www.tripkaroai.tech/` },
  // 36 - Post 63
  { file: 'Gemini_Generated_Image_cdott6cdott6cdot.png', caption: `Stop letting unqualified leads drain your best sales reps. When agents spend half their day answering basic questions for window shoppers, they have less energy for real, high-budget buyers. TripKaro AI qualifies leads instantly, gathers budget and date preferences, and hands over hot prospects ready to close. Protect your team's energy: https://www.tripkaroai.tech/` },
  // 37 - Post 64
  { file: 'Gemini_Generated_Image_crrvngcrrvngcrrv.png', caption: `The cost of a manual sales funnel is higher than you think. Every hour spent manually drafting routine itineraries, sending follow-up texts, and updating pricing is time not spent on strategic growth. TripKaro AI automates these repetitive workflows in seconds. Reclaim your agency's productive hours today: https://www.tripkaroai.tech/` },
  // 38 - Post 65
  { file: 'Gemini_Generated_Image_cw9mfncw9mfncw9m.png', caption: `Scale your booking capacity without increasing your overhead. Expanding your sales team every time travel demand peaks is expensive and unsustainable. TripKaro AI gives your agency infinite bandwidth, easily handling hundreds of inquiries simultaneously with consistent quality. Build a lean, highly profitable agency: https://www.tripkaroai.tech/` },
  // 39 - Post 66
  { file: 'Gemini_Generated_Image_d4fy6vd4fy6vd4fy.png', caption: `Your itinerary proposals should close deals, not just share information. Static brochures leave all the decision-making effort on the client. TripKaro AI generates dynamic, interactive proposals that guide the traveler through package options and direct deposit checkout. Turn your quotes into instant revenue: https://www.tripkaroai.tech/` },
  // 40 - Post 67
  { file: 'Gemini_Generated_Image_dn19nddn19nddn19.png', caption: `A global audience requires a 24/7 sales engine. If an international traveler or a late-night planner DMs your agency after hours, an automated "we will get back to you" response usually means a lost sale. TripKaro AI keeps your storefront open around the clock, answering queries and locking in deposits while you sleep. Never miss a midnight booking: https://www.tripkaroai.tech/` },
  // 41 - Post 68
  { file: 'Gemini_Generated_Image_dqdqeddqdqeddqdq (1).png', caption: `Travel planning is emotional, but comparison shopping is logical. The longer a lead waits for a quote, the more time they have to second-guess and search for cheaper alternatives online. TripKaro AI delivers tailored packages instantly, closing the booking while excitement is at its highest. Capture the buying mood: https://www.tripkaroai.tech/` },
  // 42 - Post 70
  { file: 'Gemini_Generated_Image_dqdqeddqdqeddqdq.png', caption: `Sustainable growth comes from better systems, not longer working hours. If busy travel seasons bring operational chaos and burned-out staff, your agency needs automated infrastructure. TripKaro AI takes over lead qualification and initial packaging so your team can focus on delivering great travel experiences. Upgrade your agency workflow: https://www.tripkaroai.tech/` },
  // 43 - Post 71
  { file: 'Gemini_Generated_Image_ejm5m5ejm5m5ejm5.png', caption: `Speed is the ultimate competitive moat in travel sales. While other agencies are still reading an incoming DM, TripKaro AI has already qualified the traveler, checked availability, and delivered a tailored proposal. Win the deal before your competitors even open the app. Step up your response speed: https://www.tripkaroai.tech/` },
  // 44 - Post 72
  { file: 'Gemini_Generated_Image_ex5jnbex5jnbex5j.png', caption: `Stop treating your social media like a billboard and start treating it like a checkout counter. Every Reel, post, and story is an entry point for sales. If you don't have an automated system to capture incoming inquiries instantly, you're leaving money on the table. Turn your social traffic into paid bookings with TripKaro AI: https://www.tripkaroai.tech/` },
  // 45 - Post 73
  { file: 'Gemini_Generated_Image_f2b7sif2b7sif2b7.png', caption: `No more manual data entry or repetitive itinerary copying. TripKaro AI generates personalized holiday packages with live pricing and dynamic details in under 5 seconds. Let your team step away from routine drafting and focus entirely on relationship building and high-ticket sales. Reclaim your agency's productive hours: https://www.tripkaroai.tech/` },
  // 46 - Post 74
  { file: 'Gemini_Generated_Image_f8l2cqf8l2cqf8l2.png', caption: `The danger of the slow quote. When a client asks for a quote and has to wait 24 hours, their excitement drops by half. TripKaro AI delivers complete, visually compelling travel options within seconds of the initial inquiry, locking in commitment while interest is at its peak. Close deals in the moment: https://www.tripkaroai.tech/` },
  // 47 - Post 75
  { file: 'Gemini_Generated_Image_fa4v5ufa4v5ufa4v.png', caption: `Handle peak travel seasons with zero extra hiring. Demand surges shouldn't force you into panic hiring or endless overtime. TripKaro AI manages infinite concurrent inquiries effortlessly, giving every traveler a dedicated, instant consultation. Scale your revenue smoothly during peak season: https://www.tripkaroai.tech/` },
  // 48 - Post 76
  { file: 'Gemini_Generated_Image_fc5ttofc5ttofc5t.png', caption: `Protect your agency's profit margins on every single booking. When direct booking feels slow or confusing, travelers naturally drift toward OTAs where you lose a hefty percentage in platform fees. TripKaro AI keeps the entire journey direct, seamless, and frictionless inside WhatsApp and Instagram. Keep 100% of your earnings: https://www.tripkaroai.tech/` },
  // 49 - Post 77
  { file: 'Gemini_Generated_Image_fso4d5fso4d5fso4.png', caption: `Travelers don't shop by office hours anymore. Late-night browsing, early morning planning, and weekend inquiries make up a massive slice of holiday bookings. TripKaro AI ensures your agency is fully active and closing sales 24/7/365. Keep your sales engine running non-stop: https://www.tripkaroai.tech/` },
  // 50 - Post 78
  { file: 'Gemini_Generated_Image_fz9oc6fz9oc6fz9o.png', caption: `Automate your lead qualification so your sales agents only talk to serious buyers. Window shoppers and vague inquiries eat up hours of valuable human time. TripKaro AI filters intent, captures dates, sets budget expectations, and routes ready-to-pay clients straight to your desk. Work smarter with qualified leads: https://www.tripkaroai.tech/` },
  // 51 - Post 79
  { file: 'Gemini_Generated_Image_fzieiffzieiffzie.png', caption: `Turn viral engagement into confirmed cash flow. A Reel getting 500 comments like "Price?" or "Share details" is an amazing opportunity, but only if you reply immediately. TripKaro AI contacts every commenter individually in seconds, turning likes and comments into paying guests. Monetize your viral reach: https://www.tripkaroai.tech/` },
  // 52 - Post 80
  { file: 'Gemini_Generated_Image_g2ysjg2ysjg2ysjg.png', caption: `Build a travel agency that runs on systems, not human burnout. Real business growth happens when your operations can handle double the volume without doubling your workload. TripKaro AI provides the autonomous sales foundation your travel business needs to scale effortlessly. Build your automated pipeline today: https://www.tripkaroai.tech/` },
  // 53 - Post 82
  { file: 'Gemini_Generated_Image_g8zcc6g8zcc6g8zc.png', caption: `Stop letting high-value clients slip through the cracks during weekends. Saturday and Sunday are peak travel planning days, but most sales teams are off duty. TripKaro AI works through every weekend, answering itinerary questions and locking down deposits without delay. Keep your business earning 7 days a week: https://www.tripkaroai.tech/` },
  // 54 - Post 83
  { file: 'Gemini_Generated_Image_g997v4g997v4g997.png', caption: `A personalized travel recommendation beats a generic flyer every single time. TripKaro AI listens to what the traveler actually wants—whether it is a beachfront villa or a mountain trek—and curates the exact matching package in real time. Give every traveler a custom VIP experience: https://www.tripkaroai.tech/` },
  // 55 - Post 84
  { file: 'Gemini_Generated_Image_gah610gah610gah6.png', caption: `Ad spend without instant lead capture is just lost money. If your Meta or Google ads bring travelers to your WhatsApp and they wait 2 hours for a response, your cost-per-acquisition skyrockets. TripKaro AI engages ad leads within 2 seconds, maximizing the return on every marketing rupee. Supercharge your ad conversions: https://www.tripkaroai.tech/` },
  // 56 - Post 91
  { file: 'Gemini_Generated_Image_h37mfbh37mfbh37m.png', caption: `Your ad campaigns bring the traffic, but speed closes the sale. Every second of delay between an ad click and a real response lowers conversion rates drastically. TripKaro AI bridges that gap by providing an instant, personalized sales consultation the moment a lead enters your inbox. Maximize your return on ad spend today: https://www.tripkaroai.tech/` },
  // 57 - Post 92
  { file: 'Gemini_Generated_Image_halyoehalyoehaly.png', caption: `Customer loyalty begins with exceptional responsiveness. When a traveler receives detailed, tailored holiday recommendations within seconds of asking, their confidence in your agency skyrockets. TripKaro AI sets the highest standard of customer care from the very first interaction. Deliver a standout travel booking experience: https://www.tripkaroai.tech/` },
  // 58 - Post 93
  { file: 'Gemini_Generated_Image_huhilehuhilehuhi.png', caption: `Stop losing clients to endless back-and-forth messaging. Traditional sales chats take hours just to narrow down dates, headcounts, and destinations. TripKaro AI streamlines discovery into a smooth, interactive 2-minute conversation that leads directly to checkout. Speed up your sales cycle effortlessly: https://www.tripkaroai.tech/` },
  // 59 - Post 94
  { file: 'Gemini_Generated_Image_iao4riao4riao4ri.png', caption: `Eliminate the Monday morning inquiry backlog. Weekend inquiries pile up into an unmanageable list of unread chats by Monday, forcing your team to play catch-up while leads grow cold. TripKaro AI handles and closes weekend inquiries in real time, keeping your inbox clean and profitable. Start every week ahead of the game: https://www.tripkaroai.tech/` },
  // 60 - Post 95
  { file: 'Gemini_Generated_Image_iy46obiy46obiy46.png', caption: `Dynamic package customization at scale. Travelers today expect itineraries tailored to their exact preferences, not rigid off-the-shelf packages. TripKaro AI instantly adjusts hotels, activities, and schedules based on client feedback right inside the chat. Offer personalized luxury travel without manual drafting: https://www.tripkaroai.tech/` },
  // 61 - Post 96
  { file: 'Gemini_Generated_Image_j69mvhj69mvhj69m.png', caption: `Protect your brand reputation during peak season rushes. When inquiry volumes spike, response quality often drops, leading to frustrated prospects and negative feedback. TripKaro AI maintains flawless tone, accuracy, and speed whether handling 1 lead or 1,000. Keep your service consistent year-round: https://www.tripkaroai.tech/` },
  // 62 - Post 97
  { file: 'Gemini_Generated_Image_jijr3pjijr3pjijr (1).png', caption: `Turn casual holiday dreamers into committed travelers. Many leads reach out with vague ideas and drop off before deciding. TripKaro AI asks the right guiding questions, recommends inspiring options, and presents an easy booking link before their enthusiasm fades. Guide prospects from inspiration to confirmation: https://www.tripkaroai.tech/` },
  // 63 - Post 98
  { file: 'Gemini_Generated_Image_jijr3pjijr3pjijr.png', caption: `Cut administrative overhead and focus on agency growth. Manual booking workflows, repetitive quote calculations, and status updates consume valuable agency hours. TripKaro AI takes over the operational heavy lifting, freeing you to focus on marketing, partnerships, and high-ticket clients. Build an efficient, modern travel business: https://www.tripkaroai.tech/` },
  // 64 - Post 99
  { file: 'Gemini_Generated_Image_kftibtkftibtkfti.png', caption: `The modern traveler expects modern booking tools. If your sales process still relies on email attachments and manual bank transfer instructions, you are losing tech-savvy buyers. TripKaro AI brings the entire consultation, itinerary preview, and deposit collection into a unified, mobile-first workflow. Modernize your agency's checkout process: https://www.tripkaroai.tech/` },
  // 65 - Post 100
  { file: 'Gemini_Generated_Image_kgjr4jkgjr4jkgjr.png', caption: `Complete sales automation for travel agencies is finally here. From the first social media comment to the verified booking deposit, TripKaro AI powers an end-to-end sales engine that runs 24/7. Stop leaving your revenue to chance and start scaling with intelligent automation today. Explore the future of travel sales: https://www.tripkaroai.tech/` },
  // 66 - Post 41
  { file: 'Gemini_Generated_Image_ktomxnktomxnktom.png', caption: `The speed of trust. In direct sales, a slow response signals poor service. When a luxury traveler DMs you, they expect an immediate, premium interaction. A 3-hour delay erodes trust before the conversation even starts. TripKaro AI provides instant, intelligent engagement, setting a gold standard of service from the very first second. Build trust instantly. See how: https://www.tripkaroai.tech/` },
  // 67 - Post 42
  { file: 'Gemini_Generated_Image_lc30ilc30ilc30il.png', caption: `Stop letting OTAs poach your hard-earned leads. You did the marketing to attract them, don't let a slow reply drive them to book elsewhere. OTAs win on speed; you must win on personalized speed. TripKaro AI combines instant response with intelligent itinerary curation, keeping the booking—and the full margin—direct. Protect your business. Get direct at https://www.tripkaroai.tech/` },
  // 68 - Post 43
  { file: 'Gemini_Generated_Image_lvrxkzlvrxkzlvrx.png', caption: `Is your sales team stuck in FAQ hell? Answering the same questions about visa requirements, best times to visit, or basic package inclusions drains productivity. TripKaro AI handles the routine inquiries autonomously, providing instant, accurate information. Free your human agents to focus on high-value sales negotiation and complex relationship building. Optimize your workforce: https://www.tripkaroai.tech/` },
  // 69 - Post 44
  { file: 'Gemini_Generated_Image_m9avp6m9avp6m9av.png', caption: `The direct booking friction gap. A traveler is excited to book right now, but you require them to call during business hours or fill out a long contact form. Every step is friction that increases the chance they will abandon the purchase. TripKaro AI allows travelers to go from inquiry to deposit within the chat app, in minutes. Close the gap. Secure the sale: https://www.tripkaroai.tech/` },
  // 70 - Post 45
  { file: 'Gemini_Generated_Image_mgb1n6mgb1n6mgb1.png', caption: `Don't scale your headcount; multiply your productivity. Hiring more agents to manage chat volume increases overhead and management complexity. TripKaro AI acts as an infinite force multiplier for your existing team. It handles the initial 80% of lead engagement and qualification, allowing your current agents to close 5x more deals. Scale smarter, not larger: https://www.tripkaroai.tech/` },
  // 71 - Post 46
  { file: 'Gemini_Generated_Image_nif8jwnif8jwnif8.png', caption: `Stop sending PDFs; start sending locked purchasing experiences. Static brochures are easily ignored or used for comparison shopping. TripKaro AI delivers interactive proposals directly in the DM, requiring an initial deposit to unlock full itinerary details. Turn your proposals into active sales tools that capture commitment, not just passive documents that encourage delay. Lock the booking: https://www.tripkaroai.tech/` },
  // 72 - Post 47
  { file: 'Gemini_Generated_Image_np5a4jnp5a4jnp5a.png', caption: `Your agency might be closed, but the travel market is always open. Travelers in different time zones or late-night planners don't wait for your office hours. Deploying TripKaro AI ensures you have a highly skilled "digital agent" available 24/7, ready to negotiate dates, present packages, and collect deposits. Never turn away revenue again. Get 24/7 coverage: https://www.tripkaroai.tech/` },
  // 73 - Post 48
  { file: 'Gemini_Generated_Image_o525edo525edo525.png', caption: `The window of purchasing intent is exceptionally narrow. When a client inquires about a specific luxury property, they are in the 'buying mood' right now. Relying on a manual sales process that takes hours to respond is a guaranteed way to let that intent fade. TripKaro AI responds instantly with tailored options, capturing the commitment while the desire is at its peak. Seize the moment: https://www.tripkaroai.tech/` },
  // 74 - Post 49
  { file: 'Gemini_Generated_Image_om7o5mom7o5mom7o.png', caption: `Don't let viral success become operational failure. When your post gets 500 comments, manual reply management is impossible, leading to frustrated followers and missed revenue. TripKaro AI automatically responds to every comment, sending individualized DMs that instantly qualify and engage the lead. Turn viral engagement into direct revenue infrastructure. Manage the momentum: https://www.tripkaroai.tech/` },
  // 75 - Post 50
  { file: 'Gemini_Generated_Image_p74wa6p74wa6p74w.png', caption: `True agency scalability isn't about working longer hours during peak season. It's about building a system that handles increased demand effortlessly. If your current process relies on human agents manually sorting and replying to every inquiry, you aren't scalable. TripKaro AI provides the autonomous infrastructure needed to grow your booking volume without growing your stress levels. Build a scalable future. Book a demo at https://www.tripkaroai.tech/` },
  // 76 - Post 31
  { file: 'Gemini_Generated_Image_p914r9p914r9p914.png', caption: `The high cost of low speed. In luxury travel, a lead that waits 10 minutes is already losing interest. Manual sorting and relying on human response times is costing you bookings daily. TripKaro AI eliminates the friction, engaging 100% of your inquiries in 2 seconds. Don't let your response time be the reason a client chooses a competitor. Accelerate your sales funnel: https://www.tripkaroai.tech/` },
  // 77 - Post 32
  { file: 'Gemini_Generated_Image_plyg3hplyg3hplyg.png', caption: `Stop acting as a free travel agent for OTAs. When a client finds you on Instagram but books on Expedia because you replied too late, you lose. Direct bookings require instant engagement. TripKaro AI provides the speed needed to keep the conversation—and the commission—direct. Own the customer relationship from the very first DM. Protect your margins: https://www.tripkaroai.tech/` },
  // 78 - Post 34
  { file: 'Gemini_Generated_Image_pqlkjppqlkjppqlk.png', caption: `The 'Ghosting' epidemic isn't mystery; it's physics. The excitement of planning a trip has a very short half-life. If you reply hours later, that energy is gone. TripKaro AI strikes while the iron is hot, converting curiosity into commitment within seconds. Stop wondering why leads go silent. Start closing them instantly: https://www.tripkaroai.tech/` },
  // 79 - Post 35
  { file: 'Gemini_Generated_Image_q30gxdq30gxdq30g.png', caption: `Hiring more staff to handle peak season inquiries is a high-risk scaling model. What happens when the wave passes? You're left with high overhead. TripKaro AI provides infinite scaling capacity without the fixed headcount cost. Handle 5 or 500 simultaneous inquiries with equal ease and zero lag. Scale your agency intelligently, not expensively: https://www.tripkaroai.tech/` },
  // 80 - Post 36
  { file: 'Gemini_Generated_Image_rshegkrshegkrshe.png', caption: `Your PDF itineraries are beautiful, free shopping lists for your clients. They take your hard work, research, and hotel recommendations, then book them elsewhere. Stop giving away your expertise. TripKaro AI uses interactive, dynamic proposals that require an advance deposit commitment before revealing the 'bookable' specifics. Lock the lead before you reveal the plan. Protect your IP: https://www.tripkaroai.tech/` },
  // 81 - Post 37
  { file: 'Gemini_Generated_Image_rtz7ugrtz7ugrtz7.png', caption: `40% of travel planning happens outside of 9-to-5 business hours. If your agency is 'closed', you are missing nearly half your potential revenue. An automated "We will get back to you" message is not a sales strategy; it's an invitation to browse elsewhere. TripKaro AI keeps your agency open 24/7, capable of qualifying leads and even securing deposits while you sleep. Never miss another midnight lead: https://www.tripkaroai.tech/` },
  // 82 - Post 38
  { file: 'Gemini_Generated_Image_s9reu2s9reu2s9re.png', caption: `The psychology of the snap decision. High-budget travelers often book on impulse when they see the perfect location. If they have to wait for a manual quote, the impulse fades and logic (price shopping) takes over. TripKaro AI captures that impulse instantly, providing immediate tailored recommendations and a frictionless path to deposit. Close the deal while the excitement is peak: https://www.tripkaroai.tech/` },
  // 83 - Post 39
  { file: 'Gemini_Generated_Image_sdhsxgsdhsxgsdhs.png', caption: `Viral posts are a blessing for brand awareness but a curse for manual sales teams. 300 "Details please" comments can paralyze your DMs, leading to slow responses and wasted traction. TripKaro AI handles viral volume instantly. Every single comment receives an immediate, individualized direct response, turning followers into qualified leads automatically. Master your momentum: https://www.tripkaroai.tech/` },
  // 84 - Post 40
  { file: 'Gemini_Generated_Image_sksbyrsksbyrsksb.png', caption: `Scaling a luxury travel agency is about infrastructure, not exhaustion. If high season means late nights and employee burnout, your process isn't scalable. TripKaro AI adds autonomous infrastructure to your sales team, handling the heavy lifting of lead qualification and itinerary presentation. Build a business that scales smoothly, not painfully. Request a demo to see how: https://www.tripkaroai.tech/` },
  // 85 - Post 13
  { file: 'Gemini_Generated_Image_tdaxdutdaxdutdax.png', caption: `The 'Will Let You Know' graveyard. 80% of travel inquiries that end with a client promising to 'confirm later' never return. Why? Because manual follow-ups feel either too pushy, arrive too late, or are completely forgotten. TripKaro AI tracks traveler intent and delivers timely, non-intrusive re-engagement nudges that recover abandoned bookings. Automate your follow-up sequence and turn 'maybe' into 'paid'. Scale smarter: https://www.tripkaroai.tech/` },
  // 86 - Post 18
  { file: 'Gemini_Generated_Image_uhgq0ouhgq0ouhgq.png', caption: `Locking the advance deposit is the only metric that matters in direct sales. Everything else—FAQs answered, PDFs viewed, long conversations had—is just noise. Your current manual pipeline might take 48 hours to secure a deposit commitment. TripKaro AI reduces that cycle to under 60 seconds, closing deposits in-chat before the traveler's purchasing mood fades. Own the commitment moment. See the process: https://www.tripkaroai.tech/` },
  // 87 - Post 19
  { file: 'Gemini_Generated_Image_uzvwdbuzvwdbuzvw.png', caption: `You are acting as a free travel planner for price shoppers. Your team creates excellent, custom PDFs which the client then uses as a shopping list online. Protect your intellectual property. TripKaro AI delivers dynamic proposals that only unlock specific itinerary details after an advance booking commitment is secured. Turn inquiries into paid customers, not educated shopaholics. Protect your expertise: https://www.tripkaroai.tech/` },
  // 88 - Post 26
  { file: 'Gemini_Generated_Image_vmpkkavmpkkavmpk.png', caption: `Is your travel agency operational during the 'Buying Mood'? Premium travelers plan holidays late at night, on weekends, and during holidays—when your team is resting. An automated "We are currently closed" is a closed door. TripKaro AI ensures you are always open for direct sales, offering instant qualification, date negotiation, and deposit collection at 2:45 AM. Get 24/7 direct revenue potential: https://www.tripkaroai.tech/` },
  // 89 - Post 27
  { file: 'Gemini_Generated_Image_vsmwcuvsmwcuvsmw.png', caption: `Stop sending PDFs. Start sending interactive visual proposals. Static, heavy brochures kill engagement on mobile devices. TripKaro AI delivers tailored tour packages directly in WhatsApp, featuring live date selection, dynamic pricing adjustments, and instant booking. We don't just provide quotes; we provide a high-end visual purchasing experience. Upgrade your proposal delivery: https://www.tripkaroai.tech/` },
  // 90 - Post 28
  { file: 'Gemini_Generated_Image_w9jq6jw9jq6jw9jq.png', caption: `From "How much?" to "Deposit Paid" in 60 seconds. High-performance travel agencies do not wait for the client to book; they create the path to the paid commitment. TripKaro AI autonomously qualifies traveler intent, recommends the perfect package, and captures the advanced deposit instantly in-chat. Frictionless settlement is the final step in the autonomous close. Own the commitment moment at https://www.tripkaroai.tech/` },
  // 91 - Post 29
  { file: 'Gemini_Generated_Image_wemmwqwemmwqwemm.png', caption: `Can your travel agency handle that 200-comment flood from a viral post right now? Manual operators are overwhelmed by viral attention, leading to missed opportunities and cold leads. TripKaro AI scales instantly, ensuring every single "Price?" or "Details please" comment receives an immediate, individualized direct response, turning viral traction into confirmed direct sales. Learn how to scale seamlessly: https://www.tripkaroai.tech/` },
  // 92 - Post 30
  { file: 'Gemini_Generated_Image_x2pe5ax2pe5ax2pe.png', caption: `Scaling a travel agency shouldn't mean doubling your stress. If high-volume inquiry season requires hiring temporary staff or working late nights, your scaling model is broken. TripKaro AI offers infinite, autonomous concurrency, managing thousands of complex sales conversations with perfect accuracy. Scalability is about infrastructure, not exhaustion. Build a truly scalable travel business. Request a demo: https://www.tripkaroai.tech/` },
  // 93 - Post 24
  { file: 'Gemini_Generated_Image_x2x6fnx2x6fnx2x6.png', caption: `The invisible queue in your DMs. A potential client wants to book a holiday, but they are waiting 3 hours because your human sales team is already managing 15 other complex inquiries. Delayed responses create a 'take a number' experience that frustrates premium travelers. While manual operators battle concurrency, TripKaro AI manages 500 individualized conversations simultaneously with zero lag. Build a frictionless sales funnel at https://www.tripkaroai.tech/` },
  // 94 - Post 25
  { file: 'Gemini_Generated_Image_xg9mbxg9mbxg9mbx.png', caption: `Your manual itineraries are a risk of lost revenue. Every tailored PDF quote with exact hotel names is just free research for a client to use on a booking aggregator. Stop being a free travel planner. TripKaro AI delivers dynamic, locked proposals that require a deposit before revealing the copyable itinerary specifics. Turn educated shopaholics into paid customers instantly. Learn how to protect your expertise: https://www.tripkaroai.tech/` },
  // 95 - Post 90
  { file: 'Gemini_Generated_Image_xgq36lxgq36lxgq3.png', caption: `Free your best sales agents to do what they do best—building trust and closing marquee packages. Let automated AI handle the routine filtering, introductory questions, and quote generations. Build a high-leverage travel team with TripKaro AI: https://www.tripkaroai.tech/` },
  // 96 - Post 87
  { file: 'Gemini_Generated_Image_xtweq0xtweq0xtwe.png', caption: `Deliver high-converting visual itineraries right where your clients spend their time. No one wants to download a heavy PDF on a slow mobile connection. TripKaro AI shares sleek, dynamic package previews directly inside the chat interface for effortless browsing and booking. Modernize your travel sales experience: https://www.tripkaroai.tech/` },
  // 97 - Post 88
  { file: 'Gemini_Generated_Image_xvc3d7xvc3d7xvc3.png', caption: `Transform price-sensitive inquiries into value-driven bookings. When clients ask "what is the cheapest rate?", TripKaro AI highlights luxury perks, inclusions, and unique experiences that justify a higher package value. Upgrade your average deal size automatically: https://www.tripkaroai.tech/` },
  // 98 - Post 89
  { file: 'Gemini_Generated_Image_xy3mcexy3mcexy3m.png', caption: `Scale your business across international time zones without opening remote offices. Travelers planning trips from abroad need instant answers regardless of local time differences. TripKaro AI bridges every time zone effortlessly, closing inbound international inquiries round the clock. Take your agency global: https://www.tripkaroai.tech/` },
  // 99 - Post 15
  { file: 'Gemini_Generated_Image_y1dddoy1dddoy1dd.png', caption: `The hidden financial leakage in your agency. Every manual tour package calculation takes 2-3 hours of an agent's time. Multiply that by 50 inquiries a week, and you are wasting 100+ hours purely on proposals that might not even convert. TripKaro AI builds these tailored packages and generates dynamic quotes in 5 seconds. Reclaim your team's focus and direct their energy toward relationship building, not administrative data entry. Optimize your productivity at https://www.tripkaroai.tech/` },
  // 100 - Post 16
  { file: 'Gemini_Generated_Image_yjv6coyjv6coyjv6.png', caption: `Travel direct bookings are lost because of a friction gap. Premium travelers are ready to book when they are excited, but requiring them to email, call, or wait for a proposal form during that excitement creates massive friction. TripKaro AI closes the gap by offering zero-lag qualification, selection, and deposit payment collection directly inside WhatsApp or Instagram DMs. This is the ultimate friction-free booking journey. Secure your sales velocity: https://www.tripkaroai.tech/` },
  // 101 - Extra
  { file: 'Gemini_Generated_Image_ykzk8aykzk8aykzk.png', caption: `Your competitors are not sleeping—and neither should your sales engine. Every minute your agency is offline is a minute a competitor's automated system is closing deals. TripKaro AI ensures your travel business is always on, always selling, and always converting. Build the agency that never stops earning: https://www.tripkaroai.tech/` },
  // 102 - Extra
  { file: 'Gemini_Generated_Image_ym0lxpym0lxpym0l.png', caption: `The best sales tool is one that understands your client before they finish their sentence. TripKaro AI reads traveler intent in real time—budget, destination preference, travel dates—and delivers a perfectly matched proposal without a single manual step. Give every client the feeling of a dedicated personal travel consultant: https://www.tripkaroai.tech/` },
  // 103 - Extra
  { file: 'Gemini_Generated_Image_yuaun7yuaun7yuau.png', caption: `Stop losing revenue to slow response cycles. The travel industry rewards the fastest responder, not the most experienced one. TripKaro AI combines speed with intelligence—responding in 2 seconds with personalized, data-backed travel recommendations. Be the agency that answers first and converts best: https://www.tripkaroai.tech/` },
  // 104 - Extra
  { file: 'Gemini_Generated_Image_z77tn2z77tn2z77t.png', caption: `From the first "Hi" to the final booking confirmation—automate the entire journey. TripKaro AI handles discovery, package presentation, objection handling, and deposit collection without any human intervention. Your team closes relationships; TripKaro AI closes transactions. See the full demo at https://www.tripkaroai.tech/` },
  // 105 - Extra
  { file: 'Gemini_Generated_Image_zsd3vzsd3vzsd3vz.png', caption: `Every unanswered DM is revenue walking out the door. Travel agencies that rely on manual responses leave thousands of rupees on the table every single week. TripKaro AI captures, qualifies, and converts every inquiry the moment it arrives—24 hours a day, 7 days a week. Stop the revenue leak: https://www.tripkaroai.tech/` }
];

// Schedule: Starting 19 Aug 2026, 4 posts/day at 9:00 AM, 12:00 PM, 5:00 PM, 7:00 PM IST (UTC+5:30)
const SLOTS = [
  { time: '09:00 AM', utcHour: 3, utcMinute: 30 },   // 9:00 AM IST = 3:30 AM UTC
  { time: '12:00 PM', utcHour: 6, utcMinute: 30 },   // 12:00 PM IST = 6:30 AM UTC
  { time: '05:00 PM', utcHour: 11, utcMinute: 30 },  // 5:00 PM IST = 11:30 AM UTC
  { time: '07:00 PM', utcHour: 13, utcMinute: 30 }   // 7:00 PM IST = 1:30 PM UTC
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getSchedule(index) {
  const dayOffset = Math.floor(index / 4);
  const slotIndex = index % 4;
  const slot = SLOTS[slotIndex];

  const startDate = new Date(Date.UTC(2026, 7, 19, slot.utcHour, slot.utcMinute, 0)); // Aug 19 2026
  startDate.setUTCDate(startDate.getUTCDate() + dayOffset);

  // Format date as "DD MMM YYYY" in IST
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

  let inserted = 0;
  for (let i = 0; i < IMAGE_CAPTION_MAP.length; i++) {
    const { file, caption } = IMAGE_CAPTION_MAP[i];
    const schedule = getSchedule(i);

    // Check if post already exists in DB to prevent duplicates
    const existing = await Post.findOne({ 'media.0': file, date: schedule.date, time: schedule.time });
    if (existing) {
      console.log(`[Skip] Already exists: ${schedule.date} ${schedule.time} -> ${file}`);
      continue;
    }

    const post = new Post({
      media: [file],
      type: 'Post',
      caption: caption,
      date: schedule.date,
      time: schedule.time,
      scheduledDate: schedule.scheduledDate,
      status: 'Pending',
      details: null
    });

    await post.save();
    inserted++;
    console.log(`[${inserted}/${IMAGE_CAPTION_MAP.length}] ${schedule.date} ${schedule.time} -> ${file}`);
  }

  console.log(`\nDone! Inserted ${inserted} posts starting from 19 Aug 2026.`);
  await mongoose.disconnect();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
