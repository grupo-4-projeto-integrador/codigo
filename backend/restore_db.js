const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'S1wVEXwvRr',
  database: 'postgres',
});

function parseCSVRow(str) {
  var arr = [];
  var quote = false;
  var col = '';
  for (var i = 0; i < str.length; i++) {
    var cc = str[i], nc = str[i + 1];
    if (cc == '"' && quote && nc == '"') { col += '"'; ++i; continue; }
    if (cc == '"') { quote = !quote; continue; }
    if (cc == ',' && !quote) { arr.push(col); col = ''; continue; }
    col += cc;
  }
  arr.push(col);
  return arr;
}

async function run() {
  await client.connect();

  console.log("Truncating table...");
  await client.query("TRUNCATE TABLE seguros");

  console.log("Reading backup file...");
  const data = fs.readFileSync('C:\\Users\\kamik\\Desktop\\seguros.sql', 'utf-8');
  const lines = data.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let inserted = 0;
  for (let i = 1; i < lines.length; i++) {
    const row = parseCSVRow(lines[i]);
    if (row.length < 8) continue;

    const luc = row[0];
    const loja = row[1];
    const segmento = row[2];
    const seguradora = row[3];
    const vigencia = row[4];
    const vencimento = row[5];
    const status = row[6];
    const cobertura = row[7] ? Number(row[7]) : null;
    const dias_rest = row[8] ? Number(row[8]) : null;

    try {
      await client.query(
        `INSERT INTO seguros (luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, "dias rest.") 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura, dias_rest]
      );
      inserted++;
    } catch (err) {
      if (err.code === '42703') { // undefined column
        await client.query(
          `INSERT INTO seguros (luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [luc, loja, segmento, seguradora, vigencia, vencimento, status, cobertura]
        );
        inserted++;
      } else {
        console.error("Error inserting row", row, err);
      }
    }
  }

  console.log(`Successfully restored ${inserted} rows.`);
  await client.end();
}

run().catch(err => {
  console.error("Fatal Error:", err);
  client.end();
});
