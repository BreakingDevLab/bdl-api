/*
  Minimal server.js wrapper that requires the real entry file.
  This avoids MODULE_NOT_FOUND when something or Render expects server.js.
*/
require('./'"$ENTRY"');
