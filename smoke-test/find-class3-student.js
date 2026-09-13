const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const db = createClient({ url: 'file:phase12-test.db' });

const CLASS3_ID = '73cff68e-1a22-4e05-ac5b-a2b19c8aae27';
const SUBJECT_ID = '4519d862-a17b-4ad7-ab04-cbfdc9d8f2a6';

async function main() {
  // Get active session ID
  const settings = await db.execute('SELECT * FROM SchoolSettings LIMIT 1');
  const sessionId = settings.rows[0]?.activeSessionId;
  console.log('Active session:', sessionId);
  
  // Find students enrolled in Class 3
  const students = await db.execute({
    sql: `SELECT u.email, u.password, se.classId, se.academicSessionId 
          FROM User u 
          JOIN Student s ON s.userId = u.id
          JOIN StudentEnrollment se ON se.studentId = s.id
          WHERE se.classId = ? AND se.academicSessionId = ?
          LIMIT 5`,
    args: [CLASS3_ID, sessionId]
  });
  
  console.log(`Students enrolled in Class 3:`);
  for (const row of students.rows) {
    const pwOk = await bcrypt.compare('TestStudent@123', row.password).catch(() => false);
    console.log({ email: row.email, passwordWorks: pwOk });
  }
  
  await db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
