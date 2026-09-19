/**
 * Standalone test - NOT connected to Supabase yet.
 *
 * riyasewana reveals phone numbers via a client-side fetch to
 * /get-phone.php?vid=X&t=Y&tk=Z&vt=vehicles, where vid/t/tk/vt are static
 * data-* attributes already embedded in the ad page's HTML (on the
 * <a class="ph-call"> element) - no JS computation needed, just regex
 * extraction. Confirmed by inspecting DevTools Network + page source.
 *
 * Step 1: fetch the ad page HTML through r.jina.ai in RAW mode
 *         (X-Respond-With: text) so we get real HTML with the data-*
 *         attributes intact, instead of the markdown-only mode that
 *         strips them.
 * Step 2: extract vid/t/tk/vt via regex.
 * Step 3: hit get-phone.php DIRECTLY (not through the proxy) - this is
 *         the actual thing we're testing: does riyasewana's Cloudflare
 *         protection block this specific API endpoint the same way it
 *         blocks /buy/ pages, or is it less protected?
 *
 * Run locally with:  node test-phone-fetch.js
 * Or via GitHub Actions (see .github/workflows/test-phone-fetch.yml)
 */

const TEST_URL = "https://riyasewana.com/buy/suzuki-wagon-r-sale-nittambuwa-12338434";

async function fetchAdPageHtmlViaProxy(adUrl) {
  const proxyUrl = "https://r.jina.ai/" + adUrl;
  const res = await fetch(proxyUrl, {
    headers: { "X-Respond-With": "text" }, // raw HTML, not markdown
  });
  console.log("[Proxy fetch] Status:", res.status, res.statusText);
  if (!res.ok) {
    const body = await res.text();
    console.log("[Proxy fetch] Body (first 500 chars):", body.slice(0, 500));
    throw new Error(`Proxy fetch failed: ${res.status}`);
  }
  return res.text();
}

function extractPhoneTokenAttrs(html) {
  // Looking for: <a class="call-btn ph-call" href="#" data-vid="..." data-t="..." data-tk="..." data-vt="...">
  const match = html.match(
    /class="[^"]*ph-call[^"]*"[^>]*data-vid="(\d+)"[^>]*data-t="(\d+)"[^>]*data-tk="([a-f0-9]+)"[^>]*data-vt="([a-z]+)"/i
  );
  if (!match) return null;
  return { vid: match[1], t: match[2], tk: match[3], vt: match[4] };
}

async function fetchPhoneDirect({ vid, t, tk, vt }) {
  const apiUrl = `https://riyasewana.com/get-phone.php?vid=${vid}&t=${t}&tk=${tk}&vt=${vt}`;
  console.log("[Direct API call]", apiUrl);
  const res = await fetch(apiUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      Referer: `https://riyasewana.com/buy/x-${vid}`,
    },
  });
  console.log("[Direct API call] Status:", res.status, res.statusText);
  const body = await res.text();
  console.log("[Direct API call] Body:", body.slice(0, 300));
  if (!res.ok) throw new Error(`Direct API call failed: ${res.status}`);
  return JSON.parse(body);
}

(async () => {
  console.log("Testing:", TEST_URL);
  try {
    console.log("\n--- Step 1: fetch ad page HTML via proxy ---");
    const html = await fetchAdPageHtmlViaProxy(TEST_URL);
    console.log("HTML length:", html.length);

    console.log("\n--- Step 2: extract token attributes ---");
    const attrs = extractPhoneTokenAttrs(html);
    if (!attrs) {
      console.log("Could not find ph-call element with all 4 attributes.");
      console.log("Searching for 'ph-call' substring to debug...");
      const idx = html.indexOf("ph-call");
      console.log(idx === -1 ? "'ph-call' not found in HTML at all." : html.slice(idx - 50, idx + 300));
      process.exit(1);
    }
    console.log("Extracted:", attrs);

    console.log("\n--- Step 3: call get-phone.php directly ---");
    const result = await fetchPhoneDirect(attrs);

    console.log("\n=== RESULT ===");
    console.log("Phone:", result.phone);
    console.log("Formatted:", result.phone_fmt);
  } catch (e) {
    console.log("\n=== FAILED ===");
    console.log(e.message);
    process.exit(1);
  }
})();
