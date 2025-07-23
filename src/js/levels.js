  // Key:
  // 'S-[suffix]' = start cell 
  //      'D' = start down
  //      'L' = start left
  //      'R' = start right
  //      'U' = start up
  // '.' = empty cell
  // '#' = wall
  // 'T' = target
  // 'B' = bomb
  // 'P-[suffix]'
  //      'A' = portal A
  //      'B' = portal B
  // 'F-[suffix]'
  //      'R' = red filter
  //      'G' = green filter
  //      'B' = blue filter
  // 'M-[suffix]' = 
  //      '/' = / mirror
  //      '\\' = \ mirror

export function getLevelDims(level) {
  const rows = level.layout.length;
  const cols = level.layout[0].length;
  return { rows, cols };
}

export const levels = [
  {
  name: "Level 1 - Introduction",
  description: "Learn how to use mirrors to reach your target.",
  maxMirrors: 10,
  layout: [
    ['#', '#', '#', '#', '#', '#', '#'],
    ['#', 'S-R', '.', '.', '.', '.', '#'],
    ['#', '.', '.', '.', '.', '.', '#'],
    ['#', '.', '.', '.', '.', '.', '#'],
    ['#', '.', '.', '.', '.', '#', '#'],
    ['#', '.', '.', '.', '.-L', 'T', '#'],
    ['#', '#', '#', '#', '#', '#', '#']
  ],
    briefing: [
      "Welcome to the team, Agent. You come highly recommended from the UNIVERSITY OF LASERS AND SCI FI...",
      "We don't have a lot of time so the important thing is, you're breaching a skyscraper, using a laser, and mirrors, to defeat a rogue AI superintelligence...",
      "I know, I know, listen. There's no time to waste, I'll explain while you're in there.",
      "GO GO GO!",
      // "This mission is an important one... ",
      // "I'm sure you've heard about the rogue AI giving us hell in Washington...", 
      // "Before now, we've been helpless, but we found the command center, and it's your job to reach the top floor take it out.",
      // "The AI uses optical signals to issue its commands, so we're fighting fire with fire, or, well...\nLASERS WITH LASERS",
      // "We're not sure what you're going to find in there, but I'll be briefing you along the way.",
      // "Good luck."
    ],
    tutorial: [
      { selector: '.cell[data-type="start"]',
        text: "This is your laser’s starting point." },

      { selector: '.cell[data-row="1"][data-col="5"]',
        text: "Click an empty cell to place a mirror.",
        waitFor: "tutorial:placement-started",
        allow: ['.cell[data-row="1"][data-col="5"]'] },

      { selector: '#cancelPlacement',
        text: "You can hit the “Cancel” button, or the 'Esc' key on your keyboard to scrap a placement.",
        waitFor: "tutorial:placement-cancelled", 
        allow: ['#cancelPlacement']},

      { selector: '.cell[data-row="1"][data-col="5"]',
        text: "Now, let's try placing that mirror again",
        waitFor: "tutorial:placement-started",
         },

      { selector: '.cell[data-row="1"][data-col="5"]',
        text: "You can press Slash or Backslash to place a mirror. You can also move your mouse cursor to change the orientation and click anywhere on the grid to confirm. Try one of those now.",
        waitFor: "tutorial:placement-confirmed"},

      { selector: '.cell[data-row="1"][data-col="5"]',
        text: "Nice work, now click that mirror again to remove it",
        waitFor: "tutorial:mirror-removed"},

      { selector: '.cell[data-row="4"][data-col="5"]',
        text: "You might have noticed that wall cells like this one will block your path, manouver around them!"},

      { selector: '.cell[data-type="target"]',
        text: "Your goal is to place mirrors in the beam's path to redirect it towards targets like this one and make it to the next floor. Good luck!" },
    ]
  },

  // Add these objects to your `levels` array in levels.js, immediately after the existing Level 1 – Single Bounce:

// Revised campaign levels to ensure beam doesn’t immediately collide and grid sizes range 5×5 up to 20×20
// Place these in your levels.js after Level 1 – Single Bounce

// Updated campaign levels with non-tutorial levels sized at least 10×10, all start beams clear of immediate collisions
// Place these in your levels.js after Level 1 – Single Bounce

// --- Tutorial Levels (small grids) ---
{
  name: "Level 2 - The Basement",
  description: "Navigate around the basement.",
  maxMirrors: 10,
  layout: [
    ['#', '#', '#', '#', '#', '#', '#', '#', '#', '#', '#'],
    ['#', '.', '.', '.', '.', '.', '.', '.', '.', '.', '#'],
    ['#', '.', '#', '#', '#', '.', '#', '#', '#', '.', '#'],
    ['#', '.', '#', '#', '#', '.', '#', '#', '#', '.', '#'],
    ['#', '.', '#', '#', '#', '.', '#', '#', '#', '.', '#'],
    ['#', '.', '#', '#', '#', 'S-U', '#', '#', '#', '.', '#'],
    ['#', '.', '#', '#', '#', '#', '#', '#', '#', '.', '#'],
    ['#', '.', '#', '#', '#', '.', '.', '.', '.', '.', '#'],
    ['#', '.', '.', '.', '.', '.', '#', '.', '.', '.', '#'],
    ['#', '.', '.', '.', '#', 'T', '.', '.', '#', '#', '#'],
    ['#', '#', '#', '#', '#', '#', '#', '#', '#', '#', '#']
  ]
},
// --- Bomb Puzzles (10×10) ---
{
  name: "Level 3 - The Foyer",
  description: "After here is where we start running into security. Stay sharp.",
  maxMirrors: 10,
  layout: [
    ['T', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '#', '.', '.', '.', '.', '.', '#', '.', '.'],
    ['#', '#', '#', '.', '.', '.', '.', '.', '#', '#', '#'],
    ['#', '#', '#', '.', '.', '.', '.', '.', '#', '#', '#'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '#', '#', '#', '#', '#', '.', '.', '.'],
    ['.', '.', '.', '#', '.', '.', '.', '#', '.', '.', '.'],
    ['.', '.', '.', '.', '.', '#', '.', '.', '.', '.', '.'],
    ['.', '#', '#', '#', '#', '#', '#', '#', '#', '#', '.'],
    ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
    ['.', '.', '.', '.', '.', 'S-U', '.', '.', '.', '.', '.']
  ]
},
{
  name: "Level 4 - Spicy Utility Room",
  description: "It looks like the caretaker has a hobby!",
  maxMirrors: 10,
  layout: [
    ['#', '#', '#', '#', '#'],
    ['#', '.', '.', '.', '#'],
    ['#', '.', '.', '.', 'S-L'],
    ['#', 'T', 'B', 'B', '#'],
    ['#', '#', '#', '#', '#']
  ],
   briefing: [
    "It looks like the caretaker is keeping more than just cleaning supplies in here!",
    "Bombs are dangerous. If your beam hits one, kaboom! 💥",
    "Make sure you don't snag one on your way past, this laser will light that fuse faster than you can say 'OOPS'."
  ],
  tutorial: [
    { selector: '.cell[data-type="bomb"]', text: "This is a bomb. If your beam hits it, it's 💥 Game Over." },
  ]
},

// --- Portal Tutorial (small grid) ---
{
  name: "Level 5 – Portal Primer",
  description: "Portals teleport your beam across the map.",
  maxMirrors: Infinity,
  layout: [
    ['#','#','#','#','#','#','#'],
    ['#','.','.','S-R','.','.','#'],
    ['#','.','#','#','#','.','#'],
    ['#','P-A','.','.','.','P-A','#'],
    ['#','.','#','#','#','.','#'],
    ['#','.','.','T','.','.','#'],
    ['#','#','#','#','#','#','#']
  ],
  briefing: [
    "Portals link two cells — enter one and exit the other instantly."
  ],
  tutorial: [
    { selector: '.cell[data-type="portal"]', text: "This is a portal. It teleports your beam to its matching portal." },
    { selector: '.cell[data-row="3"][data-col="1"]', text: "Click this portal to preview your exit point.", waitFor: "tutorial:portal-preview", allow: ['.cell[data-row="3"][data-col="1"]'] }
  ]
},

// --- Portal Puzzles (10×10) ---
{
  name: "Level 6 – Portal Pairs",
  description: "Two linked portals across a wide chasm—aim carefully.",
  maxMirrors: 2,
  layout: (() => {
    const G = Array.from({ length: 10 }, (_, r) => Array(10).fill('.'));
    // border
    G.forEach((row, r) => row.forEach((_, c) => { if (r===0||r===9||c===0||c===9) G[r][c]='#'; }));
    G[1][1] = 'S-R';
    G[4][3] = 'P-A'; G[4][6] = 'P-A';
    G[8][8] = 'T';
    return G;
  })()
},
{
  name: "Level 7 – Double Trouble",
  description: "Combine portals and a mirror to thread the path.",
  maxMirrors: 3,
  layout: (() => {
    const G = Array.from({ length: 10 }, () => Array(10).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r<1||r>8||c<1||c>8) G[r][c]='#'; }));
    G[1][1] = 'S-R';
    G[3][4] = 'P-A'; G[6][7] = 'P-A';
    G[8][8] = 'T';
    return G;
  })()
},

// --- Alarm Tutorial (small grid) ---
{
  name: "Level 8 – Alarm Awareness",
  description: "Alarms start a countdown—beat the clock or bust!",
  maxMirrors: Infinity,
  layout: [
    ['#','#','#','#','#','#','#'],
    ['#','.','.','S-R','.','.','#'],
    ['#','.','#','#','#','.','#'],
    ['#','.','.','.','A-10','.','#'],
    ['#','.','#','#','#','.','#'],
    ['#','.','.','T','.','.','#'],
    ['#','#','#','#','#','#','#']
  ],
  briefing: [
    "This cell is an alarm—it starts a timer when hit.",
    "Make it to the target before time runs out!"
  ],
  tutorial: [
    { selector: '.cell[data-type="alarm"]', text: "This is an alarm cell. It begins counting down your time." },
    { selector: '.cell[data-row="3"][data-col="4"]', text: "Click it to start the timer and see the countdown.", waitFor: "tutorial:alarm-start", allow: ['.cell[data-row="3"][data-col="4"]'] }
  ]
},

// --- Alarm Puzzles (10×10) ---
{
  name: "Level 9 – Ticking Corridor",
  description: "Bounce down the hallway before the alarm goes off.",
  maxMirrors: 2,
  layout: (() => {
    const G = Array.from({ length: 10 }, () => Array(10).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r===0||r===9||c===0||c===9) G[r][c]='#'; }));
    G[1][1] = 'S-R';
    G[1][8] = 'A-8';
    G[8][8] = 'T';
    return G;
  })()
},
{
  name: "Level 10 – Race the Clock",
  description: "Two alarms at different times—plan your route.",
  maxMirrors: 3,
  layout: (() => {
    const G = Array.from({ length: 12 }, () => Array(12).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r===0||r===11||c===0||c===11) G[r][c]='#'; }));
    G[1][1] = 'S-R';
    G[2][8] = 'A-5';
    G[8][3] = 'A-10';
    G[10][10] = 'T';
    return G;
  })()
},

// --- Converter Tutorial (small grid) ---
{
  name: "Level 11 – Colour Me Impressed",
  description: "Converters turn your beam colored—only matching targets count!",
  maxMirrors: Infinity,
  layout: [
    ['#','#','#','#','#'],
    ['#','S-R','C-R','T-R','#'],
    ['#','.','.','.','#'],
    ['#','#','#','#','#']
  ],
  briefing: [
    "Converters recolor your beam. Only targets of the same color will register."
  ],
  tutorial: [
    { selector: '.cell[data-type="converter"]', text: "This converter turns your beam red." },
    { selector: '.cell[data-row="1"][data-col="2"]', text: "Run your beam through this before hitting the red target.", waitFor: "tutorial:placement-complete" }
  ]
},

// --- Converter Puzzles (10×10) ---
{
  name: "Level 12 – RGB Relay",
  description: "Three converters in sequence—find the right order to reach the target.",
  maxMirrors: 2,
  layout: (() => {
    const G=Array(10).fill().map(()=>Array(10).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r===0||r===9||c===0||c===9) G[r][c]='#'; }));
    G[1][1]='S-R';
    ['R','G','B'].forEach((col,i)=> G[3][2+i*2] = `C-${col}`);
    G[5][6]='T';
    return G;
  })()
},
{
  name: "Level 13 – Polychrome Path",
  description: "Mix two colors to hit the dual target.",
  maxMirrors: 3,
  layout: (() => {
    const G=Array(11).fill().map(()=>Array(11).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r===0||r===10||c===0||c===10) G[r][c]='#'; }));
    G[1][1]='S-R'; G[1][4]='C-R';
    G[4][7]='C-B';
    G[8][8]='T';
    return G;
  })()
},

// --- Filter Tutorial (small grid) ---
{
  name: "Level 14 – Filter Fundamentals",
  description: "Filters only pass one color—block the rest.",
  maxMirrors: Infinity,
  layout: [
    ['#','#','#','#','#'],
    ['#','C-G','F-G','T-G','#'],
    ['#','.','.','.','#'],
    ['#','#','#','#','#']
  ],
  briefing: [
    "Filters only allow their matching color through. Others are stopped dead."
  ],
  tutorial: [
    { selector: '.cell[data-type="filter"]', text: "This filter only lets green beams pass." },
    { selector: '.cell[data-row="1"][data-col="2"]', text: "Place it after the converter to remove unwanted colors.", waitFor: "tutorial:placement-complete" }
  ]
},

// --- Filter Puzzles (10×10+) ---
{
  name: "Level 15 – Spectrum Split",
  description: "Plan a converter→filter→target chain under pressure.",
  maxMirrors: 2,
  layout: (() => {
    const G=Array(10).fill().map(()=>Array(14).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r===0||r===9||c===0||c===13) G[r][c]='#'; }));
    G[1][1]='S-R'; G[1][4]='C-G'; G[1][7]='F-G'; G[1][10]='T-G';
    return G;
  })()
},
{
  name: "Level 16 – Gauntlet of Shades",
  description: "Multiple filters force you to switch colors mid-flight.",
  maxMirrors: 4,
  layout: (() => {
    const G=Array(12).fill().map(()=>Array(16).fill('.'));
    G.forEach((row,r)=>row.forEach((_,c)=>{ if(r===0||r===11||c===0||c===15) G[r][c]='#'; }));
    G[2][2]='S-R'; G[2][5]='C-R'; G[2][8]='F-R';
    G[5][11]='C-B'; G[5][13]='F-B'; G[8][14]='T-B';
    return G;
  })()
}
// End of campaign levels

];