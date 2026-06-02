UPDATE historico_apolice SET ator = 'João Carlos' WHERE ator LIKE '%Usu%';
UPDATE historico_apolice SET ator = 'Sistema' WHERE ator LIKE '%Sist%';

UPDATE historico_apolice SET descricao = 'Apólice criada' WHERE descricao LIKE '%criada%';
UPDATE historico_apolice SET descricao = 'Apólice atualizada' WHERE descricao LIKE '%atualizada%' AND descricao NOT LIKE '%Observa%';
UPDATE historico_apolice SET descricao = 'Observações atualizadas' WHERE descricao LIKE '%Observa%';
UPDATE historico_apolice SET descricao = 'Apólice excluída' WHERE descricao LIKE '%exclu%';
UPDATE historico_apolice SET descricao = 'Renovação realizada' WHERE descricao LIKE '%Renova%';

-- Randomize ALL dates between now and 15 days ago for a realistic feel
UPDATE historico_apolice
SET data = NOW() - (random() * 15 * interval '1 day');
