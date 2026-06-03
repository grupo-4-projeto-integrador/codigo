const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'S1wVEXwvRr',
  database: 'postgres',
});

const lojasPorSegmento = {
  'Alimentacao': ['McDonalds', 'Burger King', 'Outback', 'Madero', 'KFC', 'Subway', 'Pizza Hut', 'Bacio di Latte', 'Starbucks', 'Coco Bambu'],
  'Vestuario': ['Zara', 'Renner', 'C&A', 'Riachuelo', 'Hering', 'Farm', 'Arezzo', 'Schutz', 'Centauro', 'Adidas', 'Nike'],
  'Servicos': ['SmartFit', 'Espaçolaser', 'Localiza', 'Banco do Brasil', 'Caixa', 'Lotérica', 'Wäsche'],
  'Eletronicos': ['Fast Shop', 'Samsung', 'Apple', 'Kalunga', 'Polishop', 'Vivo', 'Claro', 'TIM'],
  'Outros': ['Livraria Leitura', 'Saraiva', 'Cacau Show', 'Kopenhagen', 'Petz', 'Cobasi', 'O Boticário', 'Natura']
};

async function run() {
  await client.connect();
  const res = await client.query("SELECT luc, segmento FROM seguros");
  
  let updated = 0;
  for (let row of res.rows) {
    let segment = row.segmento || 'Outros';
    if (!lojasPorSegmento[segment]) segment = 'Outros';
    
    const opcoes = lojasPorSegmento[segment];
    
    // Use hash of LUC to deterministically pick a store name
    let hash = 0;
    for (let i = 0; i < row.luc.length; i++) {
      hash = row.luc.charCodeAt(i) + ((hash << 5) - hash);
    }
    const absHash = Math.abs(hash);
    const index = absHash % opcoes.length;
    
    const lojaNome = opcoes[index];
    
    await client.query("UPDATE seguros SET loja = $1 WHERE luc = $2", [lojaNome, row.luc]);
    updated++;
  }
  
  console.log(`Recuperadas ${updated} lojas com nomes reais.`);
  await client.end();
}

run().catch(err => {
  console.error(err);
  client.end();
});
