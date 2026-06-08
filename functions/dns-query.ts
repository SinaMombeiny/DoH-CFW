


const MULLVAD_ENDPOINT = "https://family.dns.mullvad.net/dns-query";
const DNS_MIME = "application/dns-message";

export default {
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const { method, url } = request;

    // 1. Instant CORS preflight response
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

    // 2. Serve from Cloudflare Edge Cache if available
    if (isGet) {
      const cachedResponse = await cache.match(request);
      if (cachedResponse) return cachedResponse;
    }

    // 3. Forward seamlessly
    const targetUrl = MULLVAD_ENDPOINT + new URL(url).search;
    
    try {
      const upstreamResponse = await fetch(targetUrl, {
        method: method,
        headers: {
          "Accept": DNS_MIME,
          "Content-Type": DNS_MIME,
          "User-Agent": "DoH-Edge/3.0",
        },
        body: method === "POST" ? request.body : null,
      });

      // 4. Clone and modify headers for the client
      const responseHeaders = new Headers(upstreamResponse.headers);
      responseHeaders.set("Access-Control-Allow-Origin", "*");
      
      if (isGet && upstreamResponse.ok) {
        responseHeaders.set("Cache-Control", "public, max-age=60");
      }

      const finalizedResponse = new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: responseHeaders,
      });

      // Save to cache asynchronously without blocking the user
      if (isGet && upstreamResponse.ok) {
        ctx.waitUntil(cache.put(request, finalizedResponse.clone()));
      }

      return finalizedResponse;

    } catch (err: any) {
      return new Response(`DNS Bridge Error: ${err.message}`, { status: 502 });
    }
  },
};
