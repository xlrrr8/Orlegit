const { createClient } = require("@supabase/supabase-js");
const path = require("path");

// Load .env.local variables
require("dotenv").config({ path: path.resolve(__dirname, "../.env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Use service role key to bypass RLS policies during seeding, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("placeholder")) {
  console.error("Error: Please set your real Supabase credentials in .env.local before running this seed script.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Famous real-world scams over the last 5 years
const HISTORICAL_SCAMS = [
  {
    title: "FTX Exchange Insolvency & Funds Misappropriation",
    target: "https://ftx.com",
    category: "investment_fraud",
    description: "FTX Exchange halted withdrawals after it was revealed they were secretively transfering customer assets to Alameda Research to cover trading losses. Billions of dollars in user funds were lost, leading to bankruptcy and criminal charges.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning: "Confirmed corporate fraud, customer funds misappropriation, and multi-billion dollar Ponzi-like structure verified by US Federal Courts.",
    community_scam_votes: 942,
    community_genuine_votes: 12,
    status: "VERIFIED",
    created_at: "2022-11-11T09:00:00Z",
  },
  {
    title: "Celsius Network Bankruptcy & Ponzi-like Yield Scheme",
    target: "https://celsius.network",
    category: "investment_fraud",
    description: "Celsius Network promised guaranteed yields of up to 18% on crypto deposits. They halted all transfers, withdrawals, and swaps between accounts due to 'extreme market conditions', freezing billions in retail funds before declaring bankruptcy.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 98,
    ai_reasoning: "SEC and bankruptcy court filings confirmed the platform operated as a Ponzi scheme, using new customer deposits to pay yields to existing users.",
    community_scam_votes: 521,
    community_genuine_votes: 5,
    status: "VERIFIED",
    created_at: "2022-06-12T18:30:00Z",
  },
  {
    title: "Logan Paul's CryptoZoo NFT Game Abandonment",
    target: "https://cryptozoo.co",
    category: "investment_fraud",
    description: "A highly-publicized NFT project called CryptoZoo where users spent millions purchasing digital eggs and zoo tokens. The game was never completed or delivered as promised, leaving investors with worthless NFTs.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 95,
    ai_reasoning: "Failure to deliver promised software product, lack of development progress, and verified refund/lawsuit actions confirm project abandonment and investor deception.",
    community_scam_votes: 341,
    community_genuine_votes: 2,
    status: "VERIFIED",
    created_at: "2021-08-20T12:00:00Z",
  },
  {
    title: "Save the Kids Token (Influencer Pump and Dump)",
    target: "Binance Smart Chain Token: KID",
    category: "investment_fraud",
    description: "A charity-backed cryptocurrency token promoted by high-profile FaZe Clan influencers. Immediately after launch, key developers and insiders dumped their holdings, crashing the token price to near-zero and leaving retail buyers holding the bag.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 97,
    ai_reasoning: "Insiders holding massive token allocations dumped their tokens immediately after retail launch, matching a classic pump-and-dump fraud signature.",
    community_scam_votes: 219,
    community_genuine_votes: 0,
    status: "VERIFIED",
    created_at: "2021-06-25T15:00:00Z",
  },
  {
    title: "SafeMoon Smart Contract Exploit & Liquidity Drain",
    target: "https://safemoon.com",
    category: "investment_fraud",
    description: "SafeMoon locked liquidity pools were drained by developers who bypassed security controls. The SEC later charged the founders with fraud and unregistered offering of crypto securities, alleging misappropriation of investor funds.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 98,
    ai_reasoning: "Founders and developers were formally indicted by the SEC and DOJ for fraud, market manipulation, and stealing locked liquidity pool assets.",
    community_scam_votes: 412,
    community_genuine_votes: 8,
    status: "VERIFIED",
    created_at: "2023-11-01T14:22:00Z",
  },
  {
    title: "IRS Impersonation Phone Call Campaign",
    target: "Phone number: +1 (800) 829-1040 (Spoofed / Fake IRS)",
    category: "impersonation",
    description: "Robocall campaign claiming to be the IRS Internal Revenue Service. Callers demand immediate payment for back taxes using iTunes gift cards, prepaid debit cards, or wire transfers, threatening arrest and deportation within hours.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning: "The IRS never demands immediate payment over the phone, never asks for payment via gift cards or wire transfers, and never threatens immediate arrest.",
    community_scam_votes: 618,
    community_genuine_votes: 1,
    status: "VERIFIED",
    created_at: "2023-04-15T10:00:00Z",
  },
  {
    title: "Tinder Swindler Romance Ponzi Scheme",
    target: "Tinder Profile: Simon Leviev",
    category: "romance_scam",
    description: "A dating app scammer pretended to be a billionaire diamond heir, showing off a luxurious lifestyle. He defrauded multiple women of millions of dollars by fabricating crises and convincing them to take out high-interest loans for him.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning: "Convicted fraudster using a classic romance scam playbook (manipulating victims into sending emergency funds via loans and credit cards).",
    community_scam_votes: 489,
    community_genuine_votes: 0,
    status: "VERIFIED",
    created_at: "2021-02-14T08:00:00Z",
  },
  {
    title: "Indian Tech Support Pop-up (Microsoft Refund Scam)",
    target: "Phone number: +1 (888) 321-4091",
    category: "tech_support",
    description: "Pop-up ads lock users' browsers claiming their computer is infected with a Trojan horse. Calling the number connects to a fake support center in Noida/Delhi, where operators trick victims into installing UltraViewer and draining bank accounts.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning: "Browser locking pop-ups, remote desktop demands, and requests for bank transfers or gift cards are a 100% match for tech support fraud.",
    community_scam_votes: 382,
    community_genuine_votes: 0,
    status: "VERIFIED",
    created_at: "2024-01-20T11:45:00Z",
  },
  {
    title: "OneCoin Cryptocurrency Ponzi Scheme",
    target: "https://onecoin.eu",
    category: "investment_fraud",
    description: "OneCoin was promoted as a cryptocurrency with a private blockchain. It was exposed as a global multi-billion dollar Ponzi scheme with no actual database or blockchain technology, led by Ruja Ignatova ('Cryptoqueen').",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning: "Confirmed global multi-level marketing Ponzi scheme with zero underlying technological value or blockchain records.",
    community_scam_votes: 812,
    community_genuine_votes: 1,
    status: "VERIFIED",
    created_at: "2020-03-12T16:00:00Z",
  },
  {
    title: "Bitconnect High-Yield Lending Ponzi",
    target: "https://bitconnect.co",
    category: "investment_fraud",
    description: "Offered a high-yield lending program promising up to 40% monthly returns powered by a 'trading bot'. In reality, it operated as a pyramid scheme paying old investors with new deposits, before abruptly shutting down.",
    ai_verdict: "LIKELY_SCAM",
    ai_confidence: 99,
    ai_reasoning: "Classic high-yield investment program (HYIP) pyramid structure that collapsed, leading to criminal indictments by the US Department of Justice.",
    community_scam_votes: 681,
    community_genuine_votes: 0,
    status: "VERIFIED",
    created_at: "2020-01-16T12:00:00Z",
  }
];

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

async function fetchRealPhishingUrls() {
  console.log("Fetching live phishing URLs from OpenPhish feed...");
  try {
    const res = await fetch("https://openphish.com/feed.txt");
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const text = await res.text();
    const urls = text.split("\n").map(line => line.trim()).filter(line => line.length > 0);
    console.log(`Successfully fetched ${urls.length} live phishing URLs.`);
    return urls;
  } catch (err) {
    console.error("Failed to fetch OpenPhish feed. Falling back to static phishing dataset.", err.message);
    return [
      "https://paypal-security-update-verification.info/signin",
      "https://chase-bank-verify-activity.support/login",
      "https://meta-support-business-verification.org/portal",
      "https://wells-fargo-card-activation-assist.com",
      "https://netflix-account-membership-billing.net/login",
      "https://blockchain-wallet-restore-phrase.xyz",
      "https://dhl-package-delivery-update-status.top/dhl",
      "https://facebook-appeals-policy-violation.com/secure",
    ];
  }
}

async function seedData() {
  const rawUrls = await fetchRealPhishingUrls();
  
  // We want around 150-200 reports in total.
  // Take 150 of the real phishing URLs and turn them into reports.
  const phishingCount = Math.min(150, rawUrls.length);
  const reports = [...HISTORICAL_SCAMS];

  const categories = ["phishing", "fake_product", "impersonation", "other"];
  const companies = ["PayPal", "Netflix", "Amazon", "Chase Bank", "Meta / Facebook", "DHL Express", "USPS", "Coinbase", "MetaMask"];

  console.log("Generating reports from live phishing URLs...");
  for (let i = 0; i < phishingCount; i++) {
    const targetUrl = rawUrls[i];
    let domain = "";
    try {
      domain = new URL(targetUrl).hostname;
    } catch {
      domain = targetUrl;
    }

    const company = companies[i % companies.length];
    const category = i % 3 === 0 ? "phishing" : i % 5 === 0 ? "impersonation" : "other";

    let title = "";
    let description = "";
    if (category === "phishing") {
      title = `Fake ${company} Login Phishing Page`;
      description = `A malicious clone of the official ${company} website. It replicates the branding, style sheet, and images of the official website to trick visitors into entering their usernames, passwords, and security codes.`;
    } else if (category === "impersonation") {
      title = `${company} Account Suspended Fake Security Notice`;
      description = `Phishing page impersonating ${company} support. The page claims that immediate action is required due to 'unauthorized activity' or 'failed billing' and prompts the victim to enter credit card details.`;
    } else {
      title = `Malicious link targeting ${company} customers`;
      description = `Spam email or SMS directs users to this domain: ${domain}. The site is designed to capture personal identity details (SSN, date of birth, security questions).`;
    }

    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // last 30 days for active phishing
    const end = new Date();
    const created_at = getRandomDate(start, end);

    reports.push({
      title,
      target: targetUrl,
      description,
      category,
      ai_verdict: "LIKELY_SCAM",
      ai_confidence: getRandomInt(85, 99),
      ai_reasoning: `The target domain '${domain}' does not belong to the official ${company} entity and matches known malicious cloning frameworks in the threat intelligence feed.`,
      community_scam_votes: getRandomInt(5, 30),
      community_genuine_votes: 0,
      status: "VERIFIED",
      created_at,
      updated_at: created_at,
      evidence_urls: []
    });
  }

  // Let's add some random genuine reports to make the dataset look realistic
  const GENUINE_SITES = [
    { name: "Google Accounts", url: "https://accounts.google.com" },
    { name: "PayPal Official Login", url: "https://www.paypal.com/signin" },
    { name: "Chase Bank Official Portal", url: "https://www.chase.com" },
    { name: "Microsoft Live Signin", url: "https://login.live.com" },
    { name: "Apple ID Portal", url: "https://appleid.apple.com" },
    { name: "Netflix Official Homepage", url: "https://www.netflix.com" },
    { name: "Amazon Customer Support Portal", url: "https://www.amazon.com/help" },
  ];

  console.log("Generating verified genuine reports...");
  for (let i = 0; i < 15; i++) {
    const site = GENUINE_SITES[i % GENUINE_SITES.length];
    const start = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // last year
    const end = new Date();
    const created_at = getRandomDate(start, end);

    reports.push({
      title: `Official ${site.name} domain verified`,
      target: site.url,
      category: "other",
      description: `Community members requested verification for the domain: ${site.url}. This is the legitimate, official homepage or login endpoint for ${site.name}.`,
      ai_verdict: "LIKELY_GENUINE",
      ai_confidence: 99,
      ai_reasoning: "The domain name matches the verified SSL certificates and registered WHOIS information of the parent corporation.",
      community_scam_votes: 0,
      community_genuine_votes: getRandomInt(15, 60),
      status: "VERIFIED",
      created_at,
      updated_at: created_at,
      evidence_urls: []
    });
  }

  // Shuffle reports so they are spread out chronologically
  reports.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

  // Insert in batches of 50 to avoid request body size limit errors
  const batchSize = 50;
  console.log(`Inserting ${reports.length} real-world reports into Supabase...`);

  for (let i = 0; i < reports.length; i += batchSize) {
    const batch = reports.slice(i, i + batchSize);
    const { error } = await supabase.from("reports").insert(batch);
    
    if (error) {
      console.error(`Failed to insert batch starting at index ${i}:`, error.message);
      process.exit(1);
    }
    console.log(`Successfully uploaded batch ${i / batchSize + 1}/${Math.ceil(reports.length / batchSize)}`);
  }

  console.log("\nDatabase successfully populated with real historical and live phishing scams!");
}

seedData();
