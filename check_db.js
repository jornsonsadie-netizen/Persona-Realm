import pg from "pg";
const { Client } = pg;

const connectionString = "postgresql://neondb_owner:npg_3KBSFwdrl8eI@ep-shiny-star-amdsab9c.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require";

async function check() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const res = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables in DB:", res.rows.map(r => r.table_name));
  } catch (err) {
    console.error("Error connecting to DB:", err);
  } finally {
    await client.end();
  }
}

check();
