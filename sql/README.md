# 🗄️ Supabase SQL Schema

Este diretório contém a fonte de verdade para o banco de dados do projeto.

## 📄 Arquivo Principal

- **`SUPABASE_SCHEMA_FINAL_CLEAN.sql`**: Este é o ÚNICO arquivo necessário para criar o banco de dados do zero. Ele contém:
  - Todas as tabelas (users, academies, checkins, etc.)
  - Políticas de segurança (RLS)
  - Funções e Triggers
  - Dados iniciais essenciais

## 🚀 Como Usar

1. Vá para o SQL Editor no Dashboard do Supabase.
2. Copie o conteúdo de `SUPABASE_SCHEMA_FINAL_CLEAN.sql`.
3. Cole e execute.

## 📂 Archive

A pasta `archive/` contém migrações antigas, scripts de debug e correções que já foram incorporados no schema principal. Eles são mantidos apenas para histórico e NÃO devem ser executados.
