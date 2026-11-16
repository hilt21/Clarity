'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(root, 'workflow-core.js'), 'utf8');
const csp = html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i)?.[1];
assert.ok(csp, 'CSP meta tag must exist');
const scriptPolicy = csp.match(/(?:^|;)\s*script-src\s+([^;]+)/)?.[1] || '';
assert.ok(scriptPolicy.split(/\s+/).includes("'self'"), 'CSP must allow loading same-origin workflow-core.js');
assert.ok(/<script\s+src="\.\/workflow-core\.js"><\/script>/.test(html), 'The workflow core must be loaded before the app');
assert.ok(html.indexOf('<script src="./workflow-core.js"></script>') < html.indexOf('const VERSION'), 'Core must precede app initialization');
assert.ok(/connect-src\s+'none'/.test(csp), 'Offline MVP must block external connections');
assert.ok(!/<script[^>]+src=["']https?:/i.test(html), 'No external script dependencies');
assert.ok(/ClarityFlow/.test(core), 'Core script must define the ClarityFlow API');
console.log('Clarity offline CSP and loader contract passed');
