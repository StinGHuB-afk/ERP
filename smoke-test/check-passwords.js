const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

const db = createClient({ url: 'file:phase12-test.db' });

const testCreds = [
  { email: 'admin1@test.com', password: 'TestAdmin@123' },
  { email: 'teacher1@test.com', password: 'TestTeacher@123' },
  { email: 'student1@test.com', password: 'TestStudent@123' },
];

async function main() {
  for (const cred of testCreds) {
    const result = await db.execute({
      sql: 'SELECT email, password FROM User WHERE email = ?',
      args: [cred.email]
    });
    if (result.rows.length === 0) {
      console.log(cred.email + ': NOT FOUND IN DB');
      continue;
    }
    const hash = result.rows[0].password;
    const match = await bcrypt.compare(cred.password, hash);
    console.log(cred.email + ' | password "' + cred.password + '" matches hash: ' + match);
    if (!match) {
      // Try common alternatives
      const alts = ['TestAdmin@123', 'TestTeacher@123', 'TestStudent@123', 'Password@123', 'Admin@123', 'Teacher@123', 'Student@123'];
      for (const alt of alts) {
        const m2 = await bcrypt.compare(alt, hash);
        if (m2) {
          console.log('  -> ACTUAL PASSWORD IS: "' + alt + '"');
          break;
        }
      }
    }
  }
  await db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
