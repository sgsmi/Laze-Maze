# UNDER CONSTRUCTION, CURRENTLY NOT LIVE

# Laze Maze
A browser-based puzzle where you place mirrors on a grid to guide a laser to its targets.

## Features
- Interactive click-to-place mirror placement
- Real-time laser beam tracing with reflection logic
- Multiple levels of increasing complexity

## Tech Stack
- **Language:** JavaScript (ES6+)
- **Rendering:** HTML5 Canvas
- **Build Tools:** npm scripts (no bundler for simplicity)

### Local (Development)
1. Clone the repo: `git clone https://github.com/sgsmi/laze-maze.git`
2. Install dependencies: `npm install`
3. Run locally: `npm start`
4. Open http://localhost:3000 in your browser.

### Static Hosting (Production)
1. Build assets: `npm run build` (copies `public/` to `dist/`).
2. Deploy the contents of `dist/` (or `public/` directly) to any static host:
   - **GitHub Pages:** Push `public/` or `dist/` branch to `gh-pages`.
   - **Netlify/Vercel:** Connect the repo, set publish directory to `public/`.
3. No server required—share the live URL!

## Contributing
See [CONTRIBUTING.md](.github/ISSUE_TEMPLATE/feature_request.md).

## License
Distributed under the MIT License. See [LICENSE](https://github.com/sgsmi/laze-maze.git/LICENSE) for details.