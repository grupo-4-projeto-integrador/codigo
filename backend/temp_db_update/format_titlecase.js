const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'S1wVEXwvRr',
  database: 'postgres',
});

function toTitleCase(str) {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => {
    // Exceptions for small words
    if (['e', 'de', 'da', 'do', 'das', 'dos', 'a', 'o', 'em'].includes(word)) {
      return word;
    }
    // Handle apostrophes like McDonald's or L'occitane
    return word.split("'").map(part => {
      // Very specific exceptions
      if (part === 's') return 's'; 
      return part.charAt(0).toUpperCase() + part.slice(1);
    }).join("'");
  }).join(' ').replace(/^./, (c) => c.toUpperCase());
}

// Special fixes for edge cases
function postProcess(str) {
    if (!str) return str;
    str = str.replace(/Mcdonald's/g, "McDonald's");
    str = str.replace(/C&a/g, "C&A");
    str = str.replace(/Tok&stok/g, "Tok&Stok");
    str = str.replace(/L'occitane/g, "L'Occitane");
    str = str.replace(/Mr\. /g, "Mr. ");
    str = str.replace(/Bb /g, "BB ");
    str = str.replace(/Vx Case/g, "VX Case");
    str = str.replace(/Mac Cosméticos/g, "MAC Cosméticos");
    return str;
}

async function run() {
  await client.connect();
  const res = await client.query("SELECT luc, loja, segmento FROM seguros");
  
  let updateCount = 0;
  for (let row of res.rows) {
    const formattedLoja = postProcess(toTitleCase(row.loja));
    let formattedSegmento = postProcess(toTitleCase(row.segmento));
    
    // Some segments shouldn't have weird cases
    if (formattedSegmento === "Cafés, Bares e Chas") formattedSegmento = "Cafés, Bares e Chás";

    await client.query("UPDATE seguros SET loja = $1, segmento = $2 WHERE luc = $3", [formattedLoja, formattedSegmento, row.luc]);
    updateCount++;
  }

  console.log(`Formatadas ${updateCount} apólices para Title Case.`);
  await client.end();
}

run().catch(err => {
  console.error(err);
  client.end();
});
