const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'S1wVEXwvRr',
  database: 'postgres',
});

async function run() {
  await client.connect();
  const res = await client.query("SELECT luc, deleted_at FROM seguros LIMIT 5");
  console.log("Rows in seguros:", res.rows);
  
  const count = await client.query("SELECT count(*) FROM seguros");
  console.log("Total rows:", count.rows[0].count);

  const countDeleted = await client.query("SELECT count(*) FROM seguros WHERE deleted_at IS NOT NULL");
  console.log("Total deleted:", countDeleted.rows[0].count);

  await client.end();
}

run().catch(err => {
  console.error("Error:", err);
  client.end();
});
