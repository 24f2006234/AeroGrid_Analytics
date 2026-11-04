// Vercel entrypoint for the Express app (also usable locally: `node server.js` after `npm run build`).
// The real app lives in src/index.ts; `npm run build` bundles it, together with all its
// npm dependencies, into dist/server.js so the deployed function needs no node_modules.
module.exports = require('./dist/server.js');
