const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:phase12-test.db' });

async function main() {
  const chapters = await db.execute({
    sql: 'SELECT id, title, status, subjectId, academicSessionId FROM LearningChapter WHERE subjectId = ? ORDER BY title',
    args: ['4519d862-a17b-4ad7-ab04-cbfdc9d8f2a6']
  });
  console.log('Chapters in teacher1 subject:');
  chapters.rows.forEach(r => console.log(JSON.stringify(r)));
  
  const topics = await db.execute({
    sql: 'SELECT id, title, status, chapterId FROM LearningTopic WHERE chapterId IN (SELECT id FROM LearningChapter WHERE subjectId = ?)',
    args: ['4519d862-a17b-4ad7-ab04-cbfdc9d8f2a6']
  });
  console.log('\nTopics in teacher1 subject:');
  topics.rows.forEach(r => console.log(JSON.stringify(r)));
  
  const pdfs = await db.execute({
    sql: 'SELECT id, title, status, topicId, storagePath FROM LearningPdf WHERE topicId IN (SELECT id FROM LearningTopic WHERE chapterId IN (SELECT id FROM LearningChapter WHERE subjectId = ?))',
    args: ['4519d862-a17b-4ad7-ab04-cbfdc9d8f2a6']
  });
  console.log('\nPDFs in teacher1 subject:');
  pdfs.rows.forEach(r => console.log(JSON.stringify(r)));
  
  await db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
