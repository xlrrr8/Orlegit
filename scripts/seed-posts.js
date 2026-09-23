const { createClient } = require("@supabase/supabase-js");
const path = require("path");

// Load .env.local variables
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
  console.error("Error: Please set your real Supabase credentials in .env.local before running this seed script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SEED_POSTS = [
  {
    title: "Lost ₹40,000 to a fake trading app — my full story",
    content: "It started with a WhatsApp message from a 'friend' I hadn't spoken to in years. They told me about an investment app called 'ProfitEdge Pro' that had made them ₹2 lakh in 3 months.\n\nI downloaded the app, invested ₹5,000 as a test — and the dashboard showed amazing returns. So I invested ₹40,000 more. When I tried to withdraw, suddenly I needed to pay a '15% tax clearance fee' of ₹6,000. Then a 'foreign transaction fee'. Then a 'KYC upgrade'. It never stopped.\n\nThe app vanished from the Play Store a week later. I filed an FIR with my local cyber crime cell. Sharing the screenshots so others can recognize this.\n\nPlease check: does anyone recognize this interface? Has this happened to you?",
    category: "experience",
    tags: ["investment scam", "fake app", "trading"],
    image_urls: [],
    likes: 234,
    is_verified_report: true,
    created_at: "2026-07-14T10:23:00Z",
  },
  {
    title: "Warning: New QR code scam at petrol pumps in Bangalore",
    content: "Spotted this at 3 different petrol pumps near Koramangala this week. A fake QR code sticker is placed over the legitimate UPI QR. When you scan it, it asks for your UPI PIN to 'confirm' the transaction.\n\nLegitimate UPI payments NEVER ask for your PIN during receiving. The PIN is only for sending money.\n\nI've reported these to the pump owners and filed with cybercrime.gov.in. Attaching photos of the fake stickers (with QR blurred) so you know what to look for.",
    category: "warning",
    tags: ["QR scam", "UPI fraud", "petrol pump"],
    image_urls: [],
    likes: 512,
    is_verified_report: true,
    created_at: "2026-07-13T09:15:00Z",
  },
  {
    title: "How do I verify if an online pharmacy is legitimate?",
    content: "My elderly mother was contacted by someone selling 'discounted' diabetes medication online. They have a website that looks very professional — SSL certificate, 'approved by CDSCO' badge, the works.\n\nBut I can't find them on the official CDSCO registered pharmacy list. The prices are 40% below MRP which is suspicious.\n\nHas anyone dealt with fake medical websites? What are the key red flags I should check? I'm particularly worried because the medication she ordered could affect her health if it's counterfeit.",
    category: "question",
    tags: ["pharmacy", "medicine", "health scam"],
    image_urls: [],
    likes: 67,
    is_verified_report: false,
    created_at: "2026-07-12T15:40:00Z",
  },
  {
    title: "Discussion: Are 'too good to be true' e-commerce deals always scams?",
    content: "There's a lot of nuance here that I think gets lost. Not every deeply discounted deal online is a scam. Some are:\n\n1. Liquidation sales from genuine retailers\n2. Manufacturer direct sales cutting out middlemen\n3. Older model clearances\n\nBut there are clear red flags: payment only via bank transfer (no credit card), no return policy, no physical address, newly registered domain.\n\nI'd love to hear from the community — what's the best deal you've found that was totally genuine, and what's the worst scam you nearly fell for?\n\nLet's build a community knowledge base around this.",
    category: "discussion",
    tags: ["ecommerce", "deals", "how to verify"],
    image_urls: [],
    likes: 145,
    is_verified_report: false,
    created_at: "2026-07-11T12:00:00Z",
  },
  {
    title: "Cyber Crime Cell just took down a major SIM swap fraud ring — what this means for you",
    content: "Big news from the Ministry of Home Affairs: a 47-person SIM swap fraud network has been dismantled across 6 states. They had compromised over 8,000 bank accounts using the SIM swap technique.\n\nWhat is SIM swap fraud? The scammer convinces your telecom operator to issue them a new SIM with your number. This gives them access to all your OTPs.\n\nHow to protect yourself:\n- Enable SIM lock with your operator\n- Use an authenticator app instead of SMS OTP where possible\n- Set a SIM change alert with your bank\n- Never share your Aadhaar details over calls\n\nFull source linked in comments.",
    category: "news",
    tags: ["SIM swap", "bank fraud", "OTP"],
    image_urls: [],
    likes: 389,
    is_verified_report: false,
    created_at: "2026-07-10T08:00:00Z",
  },
  {
    title: "How I caught a romance scammer using reverse image search",
    content: "Someone added me on Instagram claiming to be a software engineer working abroad. The profile looked real — photos, stories, tagged locations. We talked for 2 weeks.\n\nWhen they asked for ₹15,000 for a 'flight ticket emergency', I got suspicious. I right-clicked their profile photo and ran it through Google Lens.\n\nThe photo was stolen from a fitness influencer in Brazil with 200k followers.\n\nTips:\n1. Always reverse image search profile pictures\n2. Ask to video call early — scammers almost always refuse\n3. Be suspicious of anyone who escalates emotional closeness very quickly\n4. Never send money to someone you've only met online\n\nI've attached the comparison screenshots (face blurred).",
    category: "experience",
    tags: ["romance scam", "catfish", "reverse image search"],
    image_urls: [],
    likes: 678,
    is_verified_report: false,
    created_at: "2026-07-09T20:30:00Z",
  }
];

async function seed() {
  console.log("Seeding feed posts...");

  // Fetch an existing profile to satisfy the foreign key & NOT NULL constraint
  let authorId = null;
  const { data: existingProfiles } = await supabase.from("profiles").select("id").limit(1);
  if (existingProfiles && existingProfiles.length > 0) {
    authorId = existingProfiles[0].id;
    console.log(`Linking seeded posts to profile: ${authorId}`);
  } else {
    console.warn("Notice: No profile found in database. If 'user_id' is NOT NULL, ensure at least one profile exists before seeding.");
  }

  const postsToInsert = SEED_POSTS.map((p) => ({
    ...p,
    ...(authorId ? { user_id: authorId } : {}),
  }));

  const { data: posts, error } = await supabase.from("posts").insert(postsToInsert).select();
  if (error) {
    console.error("Error seeding posts:", error.message);
    process.exit(1);
  }

  console.log(`Successfully seeded ${posts.length} posts.`);

  // Find the post ID for cp1 and cp2 equivalents to seed comments
  const post1 = posts.find(p => p.title.includes("fake trading app"));
  const post2 = posts.find(p => p.title.includes("QR code scam"));

  if (post1 && post2) {
    console.log("Seeding comments on posts...");
    const comments = [
      {
        post_id: post1.id,
        content: "Please file a complaint at cybercrime.gov.in if you haven't already. Also report to RBI's SACHET portal — investment scams fall under their jurisdiction. Keep all screenshots and transaction records.",
        likes: 45,
        created_at: "2026-07-14T11:00:00Z"
      },
      {
        post_id: post1.id,
        content: "I saw this exact same app! Different name — mine was called 'SmartInvest Pro'. Same UI though. They change the name and relaunch frequently. I lost ₹25,000.",
        likes: 89,
        created_at: "2026-07-14T12:30:00Z"
      },
      {
        post_id: post1.id,
        content: "These are cloned from the same source code template. The '15% tax clearance' is a classic advance fee fraud mechanism. Once you pay it, they'll invent another fee. There is no withdrawal — ever.",
        likes: 112,
        created_at: "2026-07-14T14:00:00Z"
      },
      {
        post_id: post2.id,
        content: "I saw this at a pump near HSR Layout too! Almost fell for it. The QR had a small sticker on top of the original — look carefully at the edges.",
        likes: 67,
        created_at: "2026-07-13T10:00:00Z"
      }
    ];

    const { error: commentsError } = await supabase.from("post_comments").insert(comments);
    if (commentsError) {
      console.error("Error seeding post comments:", commentsError.message);
      process.exit(1);
    }
    console.log("Successfully seeded post comments.");
  }

  console.log("Done seeding feed tables!");
}

seed();
