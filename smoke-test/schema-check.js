const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const db = createClient({ url: 'file:phase12-test.db' });

async function main() {
  // Teacher1's subject is in which class?
  // Subject has teacherId; the subject's class relationship is via Class.subjects
  // Need to check which class has this subject
  
  // Get classes that have this subject
  const schema3 = await db.execute('PRAGMA table_info(Class)');
  console.log('Class columns:', schema3.rows.map(r => r.name).join(', '));
  
  const schema4 = await db.execute('PRAGMA table_info(StudentEnrollment)');
  console.log('StudentEnrollment columns:', schema4.rows.map(r => r.name).join(', '));
  
  // Find the class that contains teacher1's subject
  // In the schema, Class is linked to Subject through classId in Subject? But we saw Subject has no classId
  // Let's check the Class table directly
  const classes = await db.execute({
    sql: 'SELECT id, name FROM Class WHERE name LIKE ? LIMIT 5',
    args: ['%3%']
  });
  console.log('Classes with "3":', JSON.stringify(classes.rows));

  // Also get the Class table structure
  const allClasses = await db.execute('SELECT id, name FROM Class LIMIT 10');
  console.log('All classes:', JSON.stringify(allClasses.rows));
  
  // Find what class teacher1 subject belongs to
  // The enrollment uses class.subjects -> which includes subjects in that class
  // Let's find the _ClassToSubject relation table or similar
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
  console.log('All tables:', tables.rows.map(r => r.name).join(', '));
  
  await db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
