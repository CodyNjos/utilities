// sync-bgg.js - Sync BGG XML export to board-games collection.json
//
// Usage: node sync-bgg.js <bgg-export.xml>
//
// Save the BGG collection XML page to a file, then run this script.
// It compares against the existing collection.json, preserves JSON-only
// fields (onLoan, loanNote, intentional image overrides), and prints a
// diff report before writing the updated file.

const fs = require('fs');
const path = require('path');

const COLLECTION_PATH = path.resolve(__dirname, '../board-games/src/collection.json');

function parseXml(xml) {
  const items = [];
  const itemRegex = /<item[^>]*objectid="(\d+)"[^>]*>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const [, objectId, body] = match;
    const get = (tag) => body.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] || '';
    const getAttr = (tag, attr) =>
      body.match(new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`))?.[1] || '';

    const own = getAttr('status', 'own') === '1';
    const wishlist = getAttr('status', 'wishlist') === '1';
    const comment = get('comment');

    // Parse "2–5 Players Play Time 15–30 Min" from comment
    const playersMatch = comment.match(/^([\d–\-]+)\s*Players?/i);
    const timeMatch = comment.match(/Play Time\s*([\d–\-]+)\s*Min/i);
    const players = playersMatch ? playersMatch[1].replace(/–/g, '-') : '';
    const playTime = timeMatch ? timeMatch[1].replace(/–/g, '-') : '';

    items.push({
      objectId,
      name: get('name'),
      yearPublished: get('yearpublished'),
      image: get('image'),
      thumbnail: get('thumbnail'),
      owned: own,
      wishlist,
      numPlays: parseInt(get('numplays')) || 0,
      players,
      playTime,
    });
  }
  return items;
}

function sync(xmlPath) {
  if (!xmlPath) {
    console.error('Usage: node sync-bgg.js <bgg-export.xml>');
    process.exit(1);
  }

  if (!fs.existsSync(xmlPath)) {
    console.error(`File not found: ${xmlPath}`);
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath, 'utf-8');
  const bggItems = parseXml(xml);

  if (bggItems.length === 0) {
    console.error('No items parsed from XML. Check the file format.');
    process.exit(1);
  }

  const collection = JSON.parse(fs.readFileSync(COLLECTION_PATH, 'utf-8'));
  const existing = new Map(collection.map((g) => [g.objectId, g]));
  const bggIds = new Set(bggItems.map((g) => g.objectId));

  const added = [];
  const updated = [];
  const result = [];

  for (const bgg of bggItems) {
    const cur = existing.get(bgg.objectId);

    if (!cur) {
      added.push(`${bgg.name} (${bgg.owned ? 'owned' : 'wishlist'})`);
      result.push({ ...bgg, onLoan: false });
    } else {
      const merged = { ...cur };
      const changes = [];

      if (cur.owned !== bgg.owned || cur.wishlist !== bgg.wishlist) {
        const from = cur.owned ? 'owned' : cur.wishlist ? 'wishlist' : 'neither';
        const to = bgg.owned ? 'owned' : bgg.wishlist ? 'wishlist' : 'neither';
        changes.push(`status: ${from} → ${to}`);
        merged.owned = bgg.owned;
        merged.wishlist = bgg.wishlist;
        if (bgg.owned && !cur.owned) {
          if (!cur.players && bgg.players) merged.players = bgg.players;
          if (!cur.playTime && bgg.playTime) merged.playTime = bgg.playTime;
        }
      }

      if (cur.numPlays !== bgg.numPlays) {
        changes.push(`plays: ${cur.numPlays} → ${bgg.numPlays}`);
        merged.numPlays = bgg.numPlays;
      }

      // Fill in empty players/playTime but don't overwrite existing
      if (!cur.players && bgg.players) merged.players = bgg.players;
      if (!cur.playTime && bgg.playTime) merged.playTime = bgg.playTime;

      // Preserve: onLoan, loanNote, images (intentional overrides)

      if (changes.length > 0) {
        updated.push(`${bgg.name}: ${changes.join(', ')}`);
      }

      result.push(merged);
      existing.delete(bgg.objectId);
    }
  }

  // Items in JSON but removed from BGG
  const removed = [...existing.values()];

  // Report
  console.log(`\nBGG: ${bggItems.length} items | JSON: ${collection.length} items\n`);

  if (added.length) {
    console.log(`ADDED (${added.length}):`);
    added.forEach((a) => console.log(`  + ${a}`));
    console.log();
  }

  if (updated.length) {
    console.log(`UPDATED (${updated.length}):`);
    updated.forEach((u) => console.log(`  ~ ${u}`));
    console.log();
  }

  if (removed.length) {
    console.log(`IN JSON BUT NOT IN BGG (${removed.length}):`);
    removed.forEach((g) => console.log(`  - ${g.name}`));
    console.log('  (These were kept in the output. Remove manually if intended.)\n');
    removed.forEach((g) => result.push(g));
  }

  if (!added.length && !updated.length && !removed.length) {
    console.log('Everything in sync!\n');
  }

  // Write
  fs.writeFileSync(COLLECTION_PATH, JSON.stringify(result, null, 2) + '\n');
  console.log(`Wrote ${result.length} items to ${COLLECTION_PATH}`);
}

sync(process.argv[2]);
