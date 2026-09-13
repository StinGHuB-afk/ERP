import 'dotenv/config'; 
import { createClient } from '@libsql/client'; 

async function run(){ 
  const c = createClient({url: process.env.DATABASE_URL!, authToken: process.env.DATABASE_AUTH_TOKEN!}); 
  
  console.log("--- All Tables ---")
  const r = await c.execute("SELECT name FROM sqlite_master WHERE type='table'"); 
  console.log(r.rows.map(row => row[0])); 
  
  console.log("\n--- Alert Table Columns ---")
  try {
    const r2 = await c.execute('PRAGMA table_info(Alert)'); 
    console.log(r2.rows);
  } catch (e) {
    console.log("No Alert table found.");
  }
} 
run();
