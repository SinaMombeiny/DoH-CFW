


const DNS_MIME = "application/dns-message";

/**
 * UPSTREAM DoH ENDPOINT CONFIGURATION
 * Change this URL to your preferred DNS-over-HTTPS provider.
 */
const UPSTREAM_DOH_ENDPOINT = "https://family.dns.mullvad.net/dns-query";

/**
 * CUSTOM PATH CONFIGURATION
 * Change this to whatever path you want your DNS to listen on.
 * Highly recommended to use a specific path to block unauthorized bot traffic.
 * Examples: "/dns-query", "/secure-dns", or "/" for the root domain.
 */
const DNS_PATH = "/dns-query";


export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const { method, url } = request;
    const parsedUrl = new URL(url);

    // Path Filter: Drop random scanner bots instantly to protect your daily request quota
    if (parsedUrl.pathname !== DNS_PATH) {
      return new Response(`DoH Proxy is active. Route queries through: ${parsedUrl.origin}${DNS_PATH}`, {
        status: 404,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // Instant CORS preflight response
    if (method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Accept",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    const isGet = method === "GET";
    const cache = caches.default;

    // Serve from Cloudflare Edge Cache if available (Sub-2ms speeds)
    if (isGet) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
    }

    // Dynamically append search queries (for GET requests) and point to your chosen provider
    const targetUrl = UPSTREAM_DOH_ENDPOINT + parsedUrl.search;
    
    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: method,
        headers: {
          "Accept": DNS_MIME,
          "Content-Type": DNS_MIME,
          "User-Agent": "DoH-Edge/3.0",
        },
        body: method === "POST" ? request.body : null, // Zero-buffer streaming pass-through
      });

      // Clone and modify headers for the client
      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      if (isGet && upstreamResponse.ok) {
        responseHeaders.set("Cache-Control", "public, max-age=60"); // 60-second local edge memory cache
      }

      const finalizedResponse = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });

      // Save to cache asynchronously in the background without making the user wait
      if (isGet && upstreamResponse.ok) {
        ctx.waitUntil(cache.put(request, finalizedResponse.clone()));
      }

      return finalizedResponse;

    } catch (err: any) {
      return new Response(`DNS Bridge Error: ${err.message}`, { status: 502 });
    }
  },
};
