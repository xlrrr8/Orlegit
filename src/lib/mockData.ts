export type Verdict = "LIKELY_SCAM" | "LIKELY_GENUINE" | "UNCERTAIN";
export type Category =
  | "phishing"
  | "fake_product"
  | "romance_scam"
  | "investment_fraud"
  | "lottery"
  | "tech_support"
  | "impersonation"
  | "other";

export interface Report {
  id: string;
  user_id: string;
  username: string;
  title: string;
  description: string;
  target: string;
  category: Category;
  evidence_urls: string[];
  ai_verdict: Verdict;
  ai_confidence: number;
  ai_reasoning: string;
  community_scam_votes: number;
  community_genuine_votes: number;
  status: "PENDING" | "VERIFIED" | "DISPUTED" | "REMOVED";
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  username: string;
  report_id: string;
  content: string;
  created_at: string;
}

export const MOCK_REPORTS: Report[] = [
  {
    id: "1",
    user_id: "u1",
    username: "vigilante_ravi",
    title: "Fake Flipkart prize winner SMS",
    description:
      "Received an SMS claiming I won ₹5 lakh in a Flipkart lucky draw. The link redirects to a fake page asking for bank details and an OTP. The URL is not flipkart.com and has multiple spelling errors in the page.",
    target: "flipkart-prize-winner.tk",
    category: "phishing",
    evidence_urls: [],
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 97,
    ai_reasoning:
      "Domain uses a free .tk TLD not associated with Flipkart. Content pattern matches known prize phishing templates. Requests bank credentials and OTP — classic credential harvesting. No HTTPS. Domain registered 3 days ago.",
    community_scam_votes: 142,
    community_genuine_votes: 3,
    status: "VERIFIED",
    created_at: "2026-07-14T10:23:00Z",
    updated_at: "2026-07-14T10:23:00Z",
  },
  {
    id: "2",
    user_id: "u2",
    username: "priya_security",
    title: "WhatsApp job offer – ₹8000/day work from home",
    description:
      "Got a WhatsApp message offering ₹8000/day for liking YouTube videos. They first paid ₹500 as 'demo', then asked me to invest ₹5000 to unlock larger tasks. Classic advance fee scam.",
    target: "+91 98765 43210",
    category: "investment_fraud",
    evidence_urls: [],
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning:
      "Matches advance-fee fraud pattern precisely: small initial payment to build trust, then escalating investments required. 'Liking YouTube videos for money' is a well-documented scam template. No legitimate company operates this way.",
    community_scam_votes: 89,
    community_genuine_votes: 1,
    status: "VERIFIED",
    created_at: "2026-07-13T14:05:00Z",
    updated_at: "2026-07-13T14:05:00Z",
  },
  {
    id: "3",
    user_id: "u3",
    username: "techsavy_amit",
    title: "Microsoft Support called saying my PC has virus",
    description:
      "Got a call from someone claiming to be Microsoft Support. They said my computer has been sending error reports and I need to install remote access software urgently. They wanted ₹3500 to 'fix' it.",
    target: "+1 800-555-0192",
    category: "tech_support",
    evidence_urls: [],
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 98,
    ai_reasoning:
      "Microsoft never makes unsolicited calls about PC problems. This is the classic 'tech support scam' that extracts money via fake fixes or uses remote access to steal banking credentials. The number is not affiliated with Microsoft.",
    community_scam_votes: 204,
    community_genuine_votes: 0,
    status: "VERIFIED",
    created_at: "2026-07-12T09:45:00Z",
    updated_at: "2026-07-12T09:45:00Z",
  },
  {
    id: "4",
    user_id: "u4",
    username: "honest_shopper",
    title: "Is Meesho a genuine shopping app?",
    description:
      "A colleague told me Meesho is a scam app. I've been using it for 6 months and orders have always arrived. Wanted to check the community's experience here.",
    target: "meesho.com",
    category: "fake_product",
    evidence_urls: [],
    ai_verdict: "LIKELY_GENUINE",
    ai_confidence: 92,
    ai_reasoning:
      "Meesho is a legitimate registered Indian e-commerce platform backed by SoftBank and Fidelity. It has millions of verified sellers and is regulated. The domain is authentic with a long registration history. While product quality can vary (common in marketplace models), it is not a scam.",
    community_scam_votes: 12,
    community_genuine_votes: 178,
    status: "VERIFIED",
    created_at: "2026-07-11T16:30:00Z",
    updated_at: "2026-07-11T16:30:00Z",
  },
  {
    id: "5",
    user_id: "u5",
    username: "crypto_careful",
    title: "Telegram crypto pump group – 10x guaranteed returns",
    description:
      "Joined a Telegram group that promises to share 'insider tips' on which crypto to buy for 10x returns. They charge ₹2000/month membership. They've been pushing a coin called 'SafeMoonX' heavily.",
    target: "t.me/CryptoPumpersPro",
    category: "investment_fraud",
    evidence_urls: [],
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 96,
    ai_reasoning:
      "Guaranteed return promises are illegal under SEBI regulations and are a hallmark of pump-and-dump schemes. The group charges for membership then orchestrates coordinated buys to inflate a low-cap token before selling. 'SafeMoonX' appears to be a newly minted token with no legitimate backing.",
    community_scam_votes: 67,
    community_genuine_votes: 5,
    status: "VERIFIED",
    created_at: "2026-07-10T11:20:00Z",
    updated_at: "2026-07-10T11:20:00Z",
  },
  {
    id: "6",
    user_id: "u6",
    username: "marriage_seeker",
    title: "Shaadi.com profile asking for money to travel to meet",
    description:
      "Matched with someone on Shaadi.com. After 3 weeks of chatting, they suddenly have a 'medical emergency' and need ₹50,000 to travel to India to meet me. They claim to be an NRI engineer.",
    target: "Profile: RohitSharma_NRI_2024",
    category: "romance_scam",
    evidence_urls: [],
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning:
      "Classic romance scam pattern: build emotional connection, create urgent crisis requiring money transfer. Profile shows classic signs — stock photos, vague background story, won't video call. The 'NRI engineer needing travel money' is one of the most documented romance scam templates.",
    community_scam_votes: 31,
    community_genuine_votes: 0,
    status: "VERIFIED",
    created_at: "2026-07-09T20:10:00Z",
    updated_at: "2026-07-09T20:10:00Z",
  },
];

export const MOCK_STATS = {
  totalReports: 12847,
  scamsVerified: 10203,
  genuineVerified: 1891,
  usersProtected: 284920,
  todayReports: 47,
};

export const CATEGORIES: { value: Category; label: string; emoji: string }[] = [
  { value: "phishing", label: "Phishing", emoji: "🎣" },
  { value: "fake_product", label: "Fake Product", emoji: "📦" },
  { value: "romance_scam", label: "Romance Scam", emoji: "💔" },
  { value: "investment_fraud", label: "Investment Fraud", emoji: "📈" },
  { value: "lottery", label: "Lottery / Prize", emoji: "🎰" },
  { value: "tech_support", label: "Tech Support", emoji: "💻" },
  { value: "impersonation", label: "Impersonation", emoji: "🎭" },
  { value: "other", label: "Other", emoji: "⚠️" },
];

export function getScamScore(report: Report): number {
  const totalVotes = report.community_scam_votes + report.community_genuine_votes;
  if (totalVotes === 0) return 50;
  const communityScamPct = (report.community_scam_votes / totalVotes) * 100;
  const aiWeight = report.ai_verdict === "LIKELY_SCAM" ? report.ai_confidence : report.ai_verdict === "LIKELY_GENUINE" ? 100 - report.ai_confidence : 50;
  return Math.round(communityScamPct * 0.4 + aiWeight * 0.6);
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function categoryInfo(cat: Category) {
  return CATEGORIES.find((c) => c.value === cat) || CATEGORIES[CATEGORIES.length - 1];
}
