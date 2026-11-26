'use strict';
/**
 * Alerts to Discord and/or LINE.
 *   - several FAIL boxes in a row (ALERT_FAIL_STREAK, default 3)
 *   - the database / ingest API has been unreachable for ALERT_OFFLINE_S (default 60 s), and when it is back
 * Destinations come only from bridge/.env. Messages are short and never contain secrets.
 */

const DISCORD_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;
const SEND_TIMEOUT_MS = 8000;

function createAlerter({ discordUrl = '', lineToken = '', lineTo = '', lineId = 'line1', failStreak = 3, offlineS = 60, cooldownS = 60, log = () => {}, send } = {}) {
  const targets = [];
  if (discordUrl) {
    if (DISCORD_RE.test(discordUrl)) targets.push('discord');
    else log('⚠️  DISCORD_WEBHOOK_URL ignored: it must look like https://discord.com/api/webhooks/<id>/<token>');
  }
  if (lineToken && lineTo) targets.push('line');
  else if (lineToken || lineTo) log('⚠️  LINE alerts need both LINE_CHANNEL_TOKEN and LINE_TO');

  const lastSent = new Map();
  let streak = 0;
  let streakAlerted = false;
  let downSince = null;
  let downAlerted = false;

  async function defaultSend(target, text) {
    if (target === 'discord') {
      return fetch(discordUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
    }
    return fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${lineToken}` },
      body: JSON.stringify({ to: lineTo, messages: [{ type: 'text', text }] }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });
  }
  const doSend = send || defaultSend;

  function notify(kind, text, now = Date.now()) {
    if (!targets.length) return false;
    const last = lastSent.get(kind) || 0;
    if (now - last < cooldownS * 1000) return false;
    lastSent.set(kind, now);
    const msg = `[SPDI ${lineId}] ${text}`;
    for (const t of targets) {
      Promise.resolve()
        .then(() => doSend(t, msg))
        .then((res) => {
          if (res && res.ok === false) log(`⚠️  ${t} alert failed: HTTP ${res.status}`);
        })
        .catch((err) => log(`⚠️  ${t} alert failed: ${err.message}`));
    }
    return true;
  }

  return {
    get enabled() {
      return targets.length > 0;
    },
    targets,
    onEvent(ev, now = Date.now()) {
      if (ev.result !== 'FAIL') {
        streak = 0;
        streakAlerted = false;
        return;
      }
      streak += 1;
      if (streak >= failStreak && !streakAlerted) {
        streakAlerted = true;
        notify('streak', `⚠️ ${streak} damaged boxes in a row (last: ${ev.className}, ${Math.round(ev.confidence * 100)}%)`, now);
      }
    },
    onStorage(ok, now = Date.now()) {
      if (ok) {
        if (downAlerted) notify('back', '✅ database connection is back, queued boxes are being saved', now);
        downSince = null;
        downAlerted = false;
        return;
      }
      if (downSince === null) downSince = now;
      if (!downAlerted && now - downSince >= offlineS * 1000) {
        downAlerted = true;
        notify('down', `🔌 cannot save to the database for ${Math.round((now - downSince) / 1000)} s, boxes are queued on disk`, now);
      }
    },
  };
}

module.exports = { createAlerter, DISCORD_RE };
