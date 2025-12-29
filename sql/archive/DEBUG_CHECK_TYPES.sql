-- VERIFICAR TIPOS DAS COLUNAS
-- Execute este script no Supabase e veja o resultado na aba "Results" ou "Table"

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'academies'
AND column_name IN ('photos', 'rules', 'amenities', 'opening_hours', 'contacts');
