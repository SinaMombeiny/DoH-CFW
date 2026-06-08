# DoH-CFW (DNS over HTTPS Cloudflare Worker)

An ultra-fast, lightweight, and modern DNS over HTTPS (DoH) proxy built to run seamlessly on Cloudflare's global edge network. This bridge allows you to route your DNS queries safely to **Mullvad Privacy DNS** (or any provider of your choice), completely bypassing local ISP censorship and tracking.

## Features

* **Sub-2ms Latency:** Leveraging Cloudflare's `caches.default` engine to serve repeated DNS queries instantly from memory at the closest edge datacenter.
* **Zero Overhead:** Written in pure TypeScript with non-blocking architectures (`ctx.waitUntil`) to prioritize raw performance.
* **ISP Bypass:** Encapsulates DNS traffic inside standard HTTPS, making it impossible for ISPs to intercept or block via traditional DNS filtering.
* **Streaming Requests:** Direct HTTP body streaming for `POST` requests without unnecessary memory buffering.

---

## Project Structure

```text
├── dns-query.ts      # Core proxy & edge-caching logic
└── wrangler.toml     # Cloudflare deployment configuration
