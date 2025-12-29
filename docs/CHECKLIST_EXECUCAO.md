# ✅ CHECKLIST DE EXECUÇÃO - MVP 0.3

## 📍 VOCÊ ESTÁ AQUI → PASSO 1

---

## ☑️ PASSO 1: APLICAR MIGRAÇÃO NO SUPABASE

### 1.1 Fazer Login no Supabase
1. ✅ Abra seu navegador
2. ✅ Acesse: https://supabase.com/dashboard
3. ✅ Faça login com suas credenciais
4. ✅ Selecione o projeto: `hhwxlpadwvprpbebbucz`

### 1.2 Abrir SQL Editor
1. ✅ No menu lateral esquerdo, clique em **SQL Editor**
2. ✅ Clique no botão **New Query** (canto superior direito)

### 1.3 Executar Migração
1. ✅ Abra o arquivo: `MIGRATION_COMPLETE_MVP_0_3.sql`
2. ✅ Selecione TODO o conteúdo (Cmd/Ctrl + A)
3. ✅ Copie (Cmd/Ctrl + C)
4. ✅ Cole no SQL Editor do Supabase
5. ✅ Clique em **RUN** (ou pressione Cmd/Ctrl + Enter)
6. ✅ Aguarde a mensagem: "Success. No rows returned"

**⏱️ Tempo estimado:** 10-15 segundos

---

## ☐ PASSO 2: CONFIGURAR DADOS INICIAIS

### 2.1 Obter Suas Coordenadas
1. ☐ Abra: https://www.google.com/maps
2. ☐ Encontre sua localização atual
3. ☐ Clique com botão direito no mapa
4. ☐ Clique no primeiro item (números das coordenadas)
5. ☐ Copie os valores (ex: `-23.5505, -46.6333`)

### 2.2 Editar Script de Dados
1. ☐ Abra o arquivo: `INITIAL_DATA_SETUP.sql`
2. ☐ Encontre a linha 15: `lat: -23.5505,`
3. ☐ Substitua pelo primeiro número copiado
4. ☐ Encontre a linha 16: `long: -46.6333,`
5. ☐ Substitua pelo segundo número copiado
6. ☐ Encontre a linha 24: `WHERE email = 'seu@email.com';`
7. ☐ Substitua pelo seu email cadastrado no app

### 2.3 Executar Script
1. ☐ No Supabase SQL Editor, clique em **New Query**
2. ☐ Cole o conteúdo editado de `INITIAL_DATA_SETUP.sql`
3. ☐ Clique em **RUN**
4. ☐ Verifique se retornou: ID da academia + seu email

---

## ☐ PASSO 3: ADICIONAR SERVICE ROLE KEY

1. ☐ No Supabase, vá em: **Settings → API**
2. ☐ Role até "Project API keys"
3. ☐ Copie a chave `service_role` (⚠️ mantenha secreta!)
4. ☐ Abra: `gym-panel/.env.local`
5. ☐ Adicione a linha:
   ```
   SUPABASE_SERVICE_ROLE_KEY=cole-a-chave-aqui
   ```
6. ☐ Salve o arquivo

---

## ☐ PASSO 4: RODAR APLICAÇÕES

### Terminal 1 - Web Panel
```bash
cd /Users/nicolasmoreira/Desktop/ANTIGRAVATY/gym-panel
npm run dev
```
☐ Aguarde: `✓ Ready on http://localhost:3000`

### Terminal 2 - Mobile App
```bash
cd /Users/nicolasmoreira/Desktop/ANTIGRAVATY/fitness-app
npx expo start
```
☐ Aguarde o QR Code aparecer

---

## ☐ PASSO 5: TESTAR

### 5.1 Painel Admin
1. ☐ Abra: http://localhost:3000/admin
2. ☐ Faça login
3. ☐ Verifique estatísticas

### 5.2 Dashboard Financeiro
1. ☐ Abra: http://localhost:3000/dashboard/finance
2. ☐ Verifique gráficos

### 5.3 Mobile - Check-in
1. ☐ Abra app no celular
2. ☐ Faça login
3. ☐ Selecione academia
4. ☐ "Fazer Check-in Agora"
5. ☐ Conceda permissão GPS
6. ☐ Verifique sucesso/erro

---

## 🎯 PRÓXIMO PASSO AGORA

👉 **Faça login no Supabase e execute o PASSO 1**

Link direto: https://supabase.com/dashboard/project/hhwxlpadwvprpbebbucz/sql/new

---

## 📞 Precisa de Ajuda?

- **Erro na migração?** → Verifique se copiou TODO o arquivo
- **Não encontra SQL Editor?** → Menu lateral esquerdo
- **Erro de permissão?** → Verifique se está logado no projeto correto

**Boa sorte! 🚀**
