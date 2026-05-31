-- Seed para distribuição desigual por segmento e variação temporal nas últimas 8 semanas.
-- Total: 290 apólices.

TRUNCATE TABLE seguros;

INSERT INTO seguros (
    luc,
    loja,
    segmento,
    seguradora,
    vigencia,
    vencimento,
    status,
    cobertura
)
WITH segment_plan AS (
    SELECT * FROM (VALUES
        ('Alimentacao', 98, 0),
        ('Vestuario', 73, 98),
        ('Servicos', 62, 171),
        ('Eletronicos', 32, 233),
        ('Outros', 25, 265)
    ) AS t(segmento, total_count, start_index)
),
generated AS (
    SELECT
        gs,
        sp.segmento,
        sp.total_count,
        sp.start_index,
        (gs - sp.start_index - 1) AS local_index,
        (gs % 6) AS seguradora_index,
        (gs % 8) AS week_offset,
        CASE
            WHEN sp.segmento = 'Alimentacao' THEN CASE WHEN (gs - sp.start_index) % 5 IN (0, 1, 2) THEN -28 + ((gs - sp.start_index) % 9) ELSE 6 + ((gs - sp.start_index) % 14) END
            WHEN sp.segmento = 'Vestuario' THEN CASE WHEN (gs - sp.start_index) % 4 IN (0, 1) THEN -18 + ((gs - sp.start_index) % 8) ELSE 8 + ((gs - sp.start_index) % 18) END
            WHEN sp.segmento = 'Servicos' THEN CASE WHEN (gs - sp.start_index) % 3 = 0 THEN -12 + ((gs - sp.start_index) % 7) ELSE 12 + ((gs - sp.start_index) % 21) END
            WHEN sp.segmento = 'Eletronicos' THEN CASE WHEN (gs - sp.start_index) % 2 = 0 THEN -8 + ((gs - sp.start_index) % 5) ELSE 18 + ((gs - sp.start_index) % 16) END
            ELSE CASE WHEN (gs - sp.start_index) % 2 = 0 THEN -5 + ((gs - sp.start_index) % 4) ELSE 22 + ((gs - sp.start_index) % 12) END
        END AS days_until_expiry,
        ROUND((62000 + (gs * 361.75))::numeric, 2) AS cobertura
    FROM generate_series(1, 290) AS gs
    JOIN segment_plan sp
      ON gs > sp.start_index
     AND gs <= sp.start_index + sp.total_count
)
SELECT
    'LUC-' || LPAD(gs::text, 3, '0') AS luc,
    'Loja ' || LPAD(gs::text, 3, '0') AS loja,
    CASE segmento
        WHEN 'Alimentacao' THEN 'Alimentacao'
        WHEN 'Vestuario' THEN 'Vestuario'
        WHEN 'Servicos' THEN 'Servicos'
        WHEN 'Eletronicos' THEN 'Eletronicos'
        ELSE 'Outros'
    END AS segmento,
    CASE seguradora_index
        WHEN 0 THEN 'SulAmerica'
        WHEN 1 THEN 'Porto Seguro'
        WHEN 2 THEN 'Bradesco'
        WHEN 3 THEN 'Tokio Marine'
        WHEN 4 THEN 'Mapfre'
        ELSE 'Allianz'
    END AS seguradora,
    (NOW() - (week_offset * INTERVAL '1 week') - ((gs - 1) % 5) * INTERVAL '1 day')::date AS vigencia,
    (NOW() + (days_until_expiry * INTERVAL '1 day'))::date AS vencimento,
    CASE
        WHEN days_until_expiry < 0 THEN 'vencida'
        WHEN days_until_expiry <= 30 THEN 'a vencer'
        ELSE 'ativa'
    END AS status,
    cobertura
FROM generated
ORDER BY gs;
