const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'S1wVEXwvRr',
  database: 'postgres',
});

function generateCoverageValue(luc) {
  if (!luc) return 0;
  let hash = 0;
  for (let i = 0; i < luc.length; i++) {
    hash = luc.charCodeAt(i) + ((hash << 5) - hash);
  }
  const absoluteHash = Math.abs(hash);
  const baseValue = 500000 + (absoluteHash % 2500000);
  return Math.round(baseValue / 10000) * 10000;
}

function calculateDiasRestantes(vigencia, vencimento) {
  if (!vencimento) return 0;
  const today = new Date();
  const v = new Date(vencimento);
  const diffTime = v - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async function run() {
  await client.connect();

  console.log("Altering column types...");
  await client.query('ALTER TABLE seguros ALTER COLUMN cobertura TYPE numeric USING cobertura[1]::numeric');
  await client.query('ALTER TABLE seguros ALTER COLUMN "dias rest." TYPE integer USING "dias rest."[1]::integer');

  const res = await client.query("SELECT luc, vigencia, vencimento FROM seguros WHERE cobertura IS NULL OR \"dias rest.\" IS NULL");
  let updatedCount = 0;

  for (let row of res.rows) {
    const luc = row.luc;
    const coverage = generateCoverageValue(luc);
    const dias = calculateDiasRestantes(row.vigencia, row.vencimento);

    await client.query('UPDATE seguros SET cobertura = $1, "dias rest." = $2 WHERE luc = $3', [coverage, dias, luc]);
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} rows with coverage and dias rest. data.`);
  await client.end();
}

run().catch(err => {
  console.error("Error:", err);
  client.end();
});
