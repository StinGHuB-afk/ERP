const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:phase12-test.db' });

Promise.all([
  db.execute("SELECT email, role FROM User WHERE role = 'CLASS_TEACHER' LIMIT 5"),
  db.execute("SELECT email, role FROM User WHERE role = 'STUDENT' LIMIT 5"),
  db.execute("SELECT COUNT(*) as cnt FROM User WHERE role = 'STUDENT'"),
  db.execute("SELECT COUNT(*) as cnt FROM User WHERE role = 'TEACHER'"),
  db.execute("SELECT COUNT(*) as cnt FROM User WHERE role = 'CLASS_TEACHER'"),
]).then(([ct, students, scnt, tcnt, cct]) => {
  console.log('=== CLASS TEACHERS ===');
  ct.rows.forEach(r => console.log(' ', r.email, r.role));
  console.log('\n=== STUDENTS (first 5) ===');
  students.rows.forEach(r => console.log(' ', r.email, r.role));
  console.log('\n=== COUNTS ===');
  console.log('Students:', scnt.rows[0].cnt);
  console.log('Teachers:', tcnt.rows[0].cnt);
  console.log('Class Teachers:', cct.rows[0].cnt);
  return db.close();
}).then(() => process.exit(0))
  .catch(e => { console.error(e.message); process.exit(1); });
