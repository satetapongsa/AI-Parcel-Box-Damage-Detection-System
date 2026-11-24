import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Default setup: no incremental cache needed, the dashboard pages read live data.
export default defineCloudflareConfig({});
