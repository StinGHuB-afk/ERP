// Publish the FINAL UPLOAD TEST CHAPTER and its topic in the test DB
// The chapter was created in DRAFT by the teacher UI — this mimics the teacher publishing the chapter
const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:phase12-test.db' });

const CHAPTER_ID = '62e2a875-1f12-4fd1-99cf-31b01c6e5a2e';
const TOPIC_ID = '0a06f978-19ee-428d-9b4c-004e4d3b5259';
const PDF_ID = '787a99d5-789c-4ff3-8c7d-68e99e254011';

async function main() {
  // Publish chapter
  await db.execute({
    sql: 'UPDATE LearningChapter SET status = ? WHERE id = ?',
    args: ['PUBLISHED', CHAPTER_ID]
  });
  console.log('Chapter published');
  
  // Ensure topic is published
  await db.execute({
    sql: 'UPDATE LearningTopic SET status = ? WHERE id = ?',
    args: ['PUBLISHED', TOPIC_ID]
  });
  console.log('Topic published');
  
  // Ensure PDF is published
  await db.execute({
    sql: 'UPDATE LearningPdf SET status = ? WHERE id = ?',
    args: ['PUBLISHED', PDF_ID]
  });
  console.log('PDF published');
  
  // Verify
  const chapter = await db.execute({
    sql: 'SELECT title, status FROM LearningChapter WHERE id = ?',
    args: [CHAPTER_ID]
  });
  const topic = await db.execute({
    sql: 'SELECT title, status FROM LearningTopic WHERE id = ?',
    args: [TOPIC_ID]
  });
  const pdf = await db.execute({
    sql: 'SELECT title, status, storagePath FROM LearningPdf WHERE id = ?',
    args: [PDF_ID]
  });
  
  console.log('\nVerification:');
  console.log('Chapter:', JSON.stringify(chapter.rows[0]));
  console.log('Topic:', JSON.stringify(topic.rows[0]));
  console.log('PDF:', JSON.stringify(pdf.rows[0]));
  
  await db.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
