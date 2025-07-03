import { $ } from 'bun';

const CLOUDFLARE_TUNNEL_TOKEN = process.env.CLOUDFLARE_TUNNEL_TOKEN;

if (!CLOUDFLARE_TUNNEL_TOKEN) {
  console.error('Missing CLOUDFLARE_TUNNEL_TOKEN, skipping.');
  process.exit(0);
}

await $`cloudflared tunnel run --token ${CLOUDFLARE_TUNNEL_TOKEN}`;
