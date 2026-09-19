/**
 * Standalone test - NOT connected to Supabase yet.
 * Fetches riyasewana ad pages THROUGH the r.jina.ai reader proxy instead
 * of direct - riyasewana's Cloudflare bot-protection blocks direct
 * requests from every cloud/datacenter IP range we tried (Cloudflare
 * Workers, GitHub Actions runners) with a 403/429, but the proxy's IP
 * isn't blocked, and it conveniently returns clean markdown instead of
 * raw HTML.
 *
 * Run locally with:  node test-phone-fetch.js
 * Or via GitHub Actions (see .github/workflows/test-phone-fetch.yml)
 */

// Change this to any real riyasewana ad URL you want to test with.
const TEST_URL = "https://riyasewana.com/buy/suzuki-wagon-r-sale-nittambuwa-12338434";

async function fetchAdPhone(adUrl) {
  const proxyUrl = "https://r.jina.ai/" + adUrl;
  const res = await fetch(proxyUrl);

  console.log("Status:", res.status, res.statusText);

  if (!res.ok) {
    const body = await res.text();
    console.log("Response body (first 500 chars):", body.slice(0, 500));
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const markdown = await res.text();
  console.log("Markdown length:", markdown.length);

  // r.jina.ai's markdown puts each field on its own line, e.g.
  // "Contact\n\n077 595 3811" or similar - look for a Sri Lankan
  // phone-number shape (0 + 9 digits, optionally spaced/hyphenated)
  // anywhere in the text, since we don't yet know the exact label
  // riyasewana uses next to the number.
  const digitMatch = markdown.match(/\b(0\d{2}[\s\-]?\d{3}[\s\-]?\d{4})\b/);
  if (digitMatch) {
    console.log("Found phone ->", digitMatch[1]);
    return digitMatch[1].replace(/[^\d]/g, "");
  }

  console.log("No phone number pattern found in markdown.");
  console.log("\n--- Full markdown (for manual inspection) ---\n");
  console.log(markdown);
  return null;
}

(async () => {
  console.log("Testing:", TEST_URL);
  try {
    const phone = await fetchAdPhone(TEST_URL);
    console.log("\n=== RESULT ===");
    console.log("Phone number:", phone || "(none found)");
  } catch (e) {
    console.log("\n=== FAILED ===");
    console.log(e.message);
    process.exit(1);
  }
})();
