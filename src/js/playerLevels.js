// to-do: add 'create level' functionality with UI and save to playerLevels.js
// to-do: add 'delete level' functionality
// to-do: add 'edit level' functionality with UI and save to playerLevels.js
// to-do: add 'player-made levels' section in level select modal
// note: max 2 portals per level, max 1 target, max 1 start

import { loadCustomLevels } from "./utils.js";

export const builtIn = [
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
  {
    name:        "Easy Peasy",
    description: "Start at the top; bounce once to hit the target.",
    layout: [
      ['.', '.', '.', '.', '.', '.', '.', 'S-D', '.', '.', '.'],
      ['.', '.', '#', '#', '.', '.', '.', '.', '#', '.', '.'],
      ['.', '#', '.', '.', '.', '.', 'M-\\', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', 'B', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', 'M-\\', '.', '.', '.', '.', '.'],
      ['.', '.', 'M-/', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '#', '.', '.', '.', '.', '.'],
      ['.', 'P-A', '.', '.', '.', 'P-B', '.', '.', 'T', '.', '.'],
      ['.', '.', '.', '.', 'F-R', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', 'F-B', '.', '.', '#', '.', '.', '.', '.']
    ]
  },
  {
    name:        "Level 2",
    description: "Level 2 description goes here.",
    layout: [
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '#', '#', '.', '.', '.', '.', '#', '.', '.'],
      ['.', '#', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', 'S-L'],
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '#', '.', '.', '.', '.', '.'],
      ['.', '.', 'T', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.'],
      ['.', '.', '.', '.', '.', '.', '#', '.', '.', '.', '.']
    ]
  },
  // more levels…
];

export const playerLevels = [
  ...builtIn,
  ...loadCustomLevels('playerLevels') // load player-created levels from localStorage
]

export function getPlayerLevels() {
  const custom = loadCustomLevels();
  return [...builtIn, ...custom];
}