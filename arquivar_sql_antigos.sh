#!/bin/bash

# Script para arquivar arquivos SQL antigos
# Execute: bash arquivar_sql_antigos.sh

echo "🗂️  Arquivando arquivos SQL antigos..."

# Criar pasta de arquivo se não existir
mkdir -p archive/sql-old

# Mover arquivos de migration
echo "📦 Movendo migrations..."
mv MIGRATION_MVP_0_4.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_4_FIXED.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_COMPLETE_MVP_0_3.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_1_PRICING.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_1_PRICING_SAFE.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_2_COMPETITIONS.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_2_COMPETITIONS_SAFE.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_3_REFERRALS.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_3_REFERRALS_SAFE.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_4_ADMIN.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_PART_4_ADMIN_SAFE.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_5_REFINEMENTS.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_6_DETAILS.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_7_ADMIN_METRICS.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_8_PARTNER_PERMISSIONS.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_9_STORAGE.sql archive/sql-old/ 2>/dev/null
mv MIGRATION_MVP_0_5_10_LOGO.sql archive/sql-old/ 2>/dev/null

# Mover arquivos de fix
echo "🔧 Movendo fixes..."
mv FIX_*.sql archive/sql-old/ 2>/dev/null

# Mover arquivos de debug
echo "🐛 Movendo debugs..."
mv DEBUG_*.sql archive/sql-old/ 2>/dev/null

# Mover arquivos de setup inicial
echo "⚙️  Movendo setups iniciais..."
mv INITIAL_*.sql archive/sql-old/ 2>/dev/null
mv LINK_*.sql archive/sql-old/ 2>/dev/null
mv FULL_*.sql archive/sql-old/ 2>/dev/null

# Manter apenas os essenciais
echo "✅ Mantendo arquivos essenciais:"
echo "   - SUPABASE_SCHEMA_FINAL_CLEAN.sql (novo schema)"
echo "   - CREATE_TABLES_FIRST.sql (referência histórica)"

# Contar arquivos movidos
MOVED_COUNT=$(ls -1 archive/sql-old/*.sql 2>/dev/null | wc -l)
echo ""
echo "✨ Concluído! $MOVED_COUNT arquivos movidos para archive/sql-old/"
echo ""
echo "📁 Estrutura atual:"
ls -lh *.sql 2>/dev/null | grep -v "archive"

echo ""
echo "🎉 Limpeza completa!"
