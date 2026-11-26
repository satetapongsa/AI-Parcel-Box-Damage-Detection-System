'use strict';
/**
 * Store-and-forward queue that survives a restart.
 * Events wait here while the database (or the ingest API) cannot be reached.
 * The whole queue is written to one JSON-lines file, atomically (temp file + rename),
 * a short moment after each change, and read back when the bridge starts.
 */
const fs = require('fs');
const path = require('path');

function createOutbox({ file, max = 20000, debounceMs = 300, onWarn = () => {} } = {}) {
  const items = [];
  let timer = null;
  let dropped = 0;

  if (file) {
    try {
      const text = fs.readFileSync(file, 'utf8');
      for (const line of text.split('\n')) {
        if (!line.trim()) continue;
        try {
          items.push(JSON.parse(line));
        } catch {
          onWarn('outbox: skipped a broken line');
        }
      }
      if (items.length > max) items.splice(0, items.length - max);
    } catch (err) {
      if (err.code !== 'ENOENT') onWarn(`outbox: cannot read ${file}: ${err.message}`);
    }
  }

  function writeNow() {
    timer = null;
    if (!file) return;
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      const tmp = `${file}.tmp`;
      fs.writeFileSync(tmp, items.map((it) => JSON.stringify(it)).join('\n') + (items.length ? '\n' : ''));
      fs.renameSync(tmp, file);
    } catch (err) {
      onWarn(`outbox: cannot save ${file}: ${err.message}`);
    }
  }

  function schedule() {
    if (!file || timer) return;
    timer = setTimeout(writeNow, debounceMs);
    if (timer.unref) timer.unref();
  }

  return {
    push(item) {
      items.push(item);
      if (items.length > max) {
        items.shift(); // oldest goes first when the disk queue is full
        dropped += 1;
      }
      schedule();
    },
    peek(n = 1) {
      return items.slice(0, n);
    },
    drop(n = 1) {
      items.splice(0, n);
      schedule();
    },
    get size() {
      return items.length;
    },
    get dropped() {
      return dropped;
    },
    flushToDisk() {
      if (timer) clearTimeout(timer);
      writeNow();
    },
  };
}

module.exports = { createOutbox };
