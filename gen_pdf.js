const fs = require('fs');
fs.writeFileSync('large_test.pdf', Buffer.alloc(5 * 1024 * 1024, 'a'));
