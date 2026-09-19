/**
 * Standalone test - NOT connected to Supabase yet.
 * Just proves whether GitHub Actions' outbound IP can fetch a riyasewana
 * ad detail page (Cloudflare Workers' IP got 429'd; this checks if
 * GitHub's IP range fares better).
 *
 * Run locally with:  node test-phone-fetch.js
 * Or via GitHub Actions (see .github/workflows/test-phone-fetch.yml)
 */

// Change this to any real riyasewana ad URL you want to test with.
const TEST_URL = "https://riyasewana.com/buy/suzuki-wagon-r-sale-nittambuwa-12338434";

async function fetchAdPhone(adUrl) {
  const res = await fetch(adUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
      Referer: "https://riyasewana.com/search/cars",
    },
  });

  console.log("Status:", res.status, res.statusText);

  if (!res.ok) {
    const body = await res.text();
    console.log("Response body (first 500 chars):", body.slice(0, 500));
    throw new Error(`Fetch failed: ${res.status}`);
  }

  const html = await res.text();
  console.log("HTML length:", html.length);

  // Strategy 1: tel: link (what the CONTACT button uses)
  const telMatch = html.match(/href="tel:([+\d\s\-]+)"/i);
  if (telMatch) {
    console.log("Found via tel: href ->", telMatch[1]);
    return telMatch[1].replace(/[^\d]/g, "");
  }

  // Strategy 2: fallback - bare Sri Lankan number shape (0 + 9 digits)
  const digitMatch = html.match(/\b(0\d[\d\s\-]{7,10}\d)\b/);
  if (digitMatch) {
    console.log("Found via digit-run fallback ->", digitMatch[1]);
    return digitMatch[1].replace(/[^\d]/g, "");
  }

  console.log("No phone number pattern found in HTML.");
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
