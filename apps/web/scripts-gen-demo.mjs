import fs from 'fs';

const data = JSON.parse(fs.readFileSync('/tmp/igdb_real.json', 'utf8'));
const esc = s => String(s).replace(/\\/g, '').replace(/'/g, "\\'");

const G = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v]));

const authored = {
  p5r: { status: 'playing', rating: 5, hours: 143, start: '2025-06-01', end: null, platform: 'PS5', review: 'A phantom-thief heist musical where every system dresses for the occasion. The calendar loop turns ninety hours into a blink.', featured: true, fOrder: 5, fNote: 'One hundred hours of style with zero fat.' },
  'baldurs gate 3': { status: 'playing', rating: 4.5, hours: 96, start: '2024-08-14', end: null, platform: 'PC', review: 'The tabletop campaign I never got to finish as a kid, rebuilt with a budget that shows in every dice roll. My Dark Urge run is a disaster and I am protecting it with my life.', featured: true, fOrder: 2, fNote: 'The campaign table I never want to leave.' },
  cyberpunk: { status: 'backlog', rating: null, hours: 31, start: '2025-02-02', end: null, platform: 'PC', review: 'Night City after 2.0 finally breathes. Parked mid-heist; the spy-thriller DLC waits on my shelf like a loaded clip.' },
  stardew: { status: 'playing', rating: 4.5, hours: 310, start: '2018-03-09', end: null, platform: 'Switch', award: 'Most played', awardYear: 2018, awardNote: 'Seven farms and counting.', review: 'My permanently-installed comfort engine. Year seven: an ancient-fruit empire, every heart event found, still hearing new notes down in the mines.' },
  'obra dinn': { status: 'completed', rating: 4.5, hours: 14, start: '2025-02-26', end: '2025-03-09', platform: 'PC', award: 'Sharpest mystery', awardYear: 2025, awardNote: 'Fourteen hours, sixty souls, zero hand-holding.', review: 'A deduction game that trusts you completely: here are the dead, here is your book of diagrams, go be brilliant. The moment the logic clicks is unmatched.' },
  ragnarok: { status: 'completed', rating: 4.5, hours: 96, start: '2023-07-15', end: '2023-09-02', platform: 'PS5', review: 'Fimbulwinter gives every frame weight. It swings bigger than its predecessor and somehow lands its quietest scenes hardest.', featured: true, fOrder: 6, fNote: 'Fathers, sons, and one very good axe.' },
  tunic: { status: 'completed', rating: 4, hours: 23, start: '2022-04-10', end: '2022-05-28', platform: 'PC', review: 'A manual for a fake console becomes the game itself. Every scribbled page I decoded felt like breaking a wax seal on something ancient.' },
  'elden ring': { status: 'completed', rating: 5, hours: 137, start: '2022-02-25', end: '2022-04-30', platform: 'PS5', award: 'Game of the year', awardYear: 2022, awardNote: 'For the tree that ate two hundred hours.', review: 'The Lands Between do not care about you, which is exactly why conquering them matters. Malenia took forty-one attempts and I would pay to forget her so I could fight her fresh again.', featured: true, fOrder: 1, fNote: 'Dread you volunteer for, twice over.' },
  inscryption: { status: 'completed', rating: 4.5, hours: 27, start: '2021-10-24', end: '2021-11-14', platform: 'PC', review: 'A deck-builder that eats its own rulebook on the way to something profound. Going in blind is not advice here, it is the price of admission.' },
  'hollow knight': { status: 'completed', rating: 5, hours: 74, start: '2021-06-12', end: '2021-08-30', platform: 'Switch', review: 'Hallownest ruins you gently. One hundred twelve percent, every pantheon, and I still hear the City of Tears when it rains here.', featured: true, fOrder: 3, fNote: 'The map that taught me to love being lost.' },
  hades: { status: 'completed', rating: 4.5, hours: 118, start: '2020-12-05', end: '2021-01-30', platform: 'Steam Deck', review: 'Supergiant turns repetition into intimacy. Ten escapes deep the story kept surprising me; forty runs deep the gameplay did too.' },
  rdr2: { status: 'completed', rating: 5, hours: 188, start: '2020-01-10', end: '2020-05-22', platform: 'PS4', review: 'The last act is the best writing Rockstar has shipped. I stopped optimizing my honor run because Arthur made me want to deserve redemption.', featured: true, fOrder: 4, fNote: 'A western that outlived its era.' },
  celeste: { status: 'completed', rating: 4.5, hours: 39, start: '2018-09-01', end: '2018-10-22', platform: 'Switch', review: 'Every death is the game agreeing with your hands: almost. The farewell chapter turns a precision platformer into a goodbye letter.' },
  witcher3: { status: 'completed', rating: 5, hours: 212, start: '2016-09-18', end: '2016-12-19', platform: 'PC', review: 'The Bloody Baron arc alone rewired what side content could be. Two hundred hours in and the expansions still outclassed the base game.' },
  'outer wilds': { status: 'completed', rating: 5, hours: 42, start: '2023-01-08', end: '2023-01-29', platform: 'PC', award: 'Changed my brain', awardYear: 2023, awardNote: 'For leaving the universe bigger than it found it.', review: 'A clockwork solar system where curiosity is the only upgrade. Knowledge itself becomes the mechanic, and the ending reframes every fear you carried into orbit with you.', featured: true, fOrder: 0, fNote: 'The one I press into every stranger\u2019s hands.' },
};

const slugs = {
  p5r: 'persona-5-royal', 'baldurs gate 3': 'baldurs-gate-3', cyberpunk: 'cyberpunk-2077', stardew: 'stardew-valley',
  'obra dinn': 'return-of-the-obra-dinn', ragnarok: 'god-of-war-ragnarok', tunic: 'tunic',
  'elden ring': 'elden-ring', inscryption: 'inscryption', 'hollow knight': 'hollow-knight',
  hades: 'hades', rdr2: 'red-dead-redemption-2', celeste: 'celeste',
  witcher3: 'the-witcher-3-wild-hunt', 'outer wilds': 'outer-wilds',
};

// chronicle order: active saves first, then completions newest-first
const order = ['p5r', 'baldurs gate 3', 'cyberpunk', 'stardew', 'obra dinn', 'ragnarok', 'tunic',
  'elden ring', 'inscryption', 'hollow knight', 'hades', 'outer wilds', 'rdr2', 'celeste', 'witcher3'];

let out = '';
order.forEach((key, i) => {
  const m = G[key], a = authored[key], id = `g${i + 1}`;
  const lines = [];
  lines.push(`    {`);
  lines.push(`      id: '${id}', igdbId: ${m.igdb_id}, slug: '${slugs[key]}', title: '${esc(m.name)}',`);
  lines.push(`      cover: '${m.cover}',`);
  if (m.banner) lines.push(`      banner: '${m.banner}',`);
  lines.push(`      rating: ${a.rating === null ? 'null' : a.rating},`);
  lines.push(`      platform: '${a.platform}', status: '${a.status}',`);
  if (a.award) lines.push(`      award: '${esc(a.award)}', awardNote: '${esc(a.awardNote)}',`);
  lines.push(`      review: '${esc(a.review)}',`);
  lines.push(`      startedAt: '${a.start}',${a.end ? ` completedAt: '${a.end}',` : ''} hours: ${a.hours},`);
  const genres = (m.genres.length ? m.genres : ['Adventure']).map(g => `'${esc(g)}'`).join(', ');
  const platforms = m.platforms.map(p => `'${esc(p)}'`).join(', ');
  lines.push(`      genres: [${genres}], platforms: [${platforms}],`);
  const feat = a.featured ? ` featured: true, featuredOrder: ${a.fOrder}, featuredNote: '${esc(a.fNote)}',` : '';
  lines.push(`      year: ${m.year},${feat}`);
  lines.push('    },');
  out += lines.join('\n') + '\n';
});

fs.writeFileSync('/tmp/games_block.txt', out);
console.log('emitted', order.length, 'games;',
  order.filter(k => authored[k].featured).length, 'featured');
