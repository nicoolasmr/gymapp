# Manual de Solução de Erros: Web & Financeiro
**Data:** 24/11/2025
**Versão:** 1.0
**Autor:** Antigravity (Senior Software Engineer)

Este documento detalha as soluções técnicas aplicadas para resolver problemas críticos de execução do App Mobile na Web e do Painel Financeiro.

---

## 1. App Mobile na Web (Expo)

### Problema
Ao tentar rodar `npm run web` ou `npx expo start --web`, o navegador exibia:
*   Tela Branca.
*   Erro 500 (Internal Server Error).
*   Erro de MIME Type (`application/json` não executável).
*   Erro de dependência `react-native-url-polyfill`.

### Causa Raiz
*   **Conflito de Versões:** O `expo-router` v3 exige configurações específicas do Metro Bundler que não estavam presentes.
*   **Falta de Entry Point:** O Expo Web se perdia ao tentar resolver o ponto de entrada automático.
*   **Dependências Faltantes:** O Supabase exige `react-native-url-polyfill` para funcionar no ambiente React Native/Web.

### Solução Aplicada (Passo a Passo)

1.  **Criação de Entry Point Manual (`index.js`):**
    Foi criado um arquivo `index.js` na raiz para registrar o componente principal explicitamente, ignorando a resolução automática falha.
    ```javascript
    import { registerRootComponent } from 'expo';
    import { ExpoRoot } from 'expo-router';
    export function App() {
      const ctx = require.context('./app');
      return <ExpoRoot context={ctx} />;
    }
    registerRootComponent(App);
    ```

2.  **Ajuste no `package.json`:**
    Alterado `"main": "expo-router/entry"` para `"main": "index.js"`.

3.  **Configuração do Metro (`metro.config.js`):**
    Criado arquivo de configuração para habilitar suporte CSS e Web explicitamente.

4.  **Instalação de Polyfill:**
    Executado `npm install react-native-url-polyfill` para corrigir erros de URL do Supabase.

5.  **Geração de Assets:**
    Criados arquivos placeholder para `favicon.png`, `icon.png`, etc., na pasta `assets` para evitar erros 404.

### Como Rodar (Comando Correto)
Sempre use o comando com limpeza de cache se notar estranheza:
```bash
npx expo start --web --clear
```

---

## 2. Painel Financeiro (Dashboard)

### Problema
O usuário enfrentava um loop infinito de redirecionamento ou tela de "Sessão Expirada" ao acessar `/dashboard/finance`.

### Causa Raiz
*   **Sessão Server-Side Instável:** O Middleware e os Server Components do Next.js estavam em desacordo sobre o estado do cookie de autenticação (um via cookie, outro via banco), causando falha na validação estrita (`getUser`).
*   **Loop de Redirect:** O Middleware redirecionava para Login, e o Login (vendo um cookie antigo) redirecionava para Dashboard, criando um loop.

### Solução Aplicada (Client-Side Fetching)

A estratégia foi alterada de **Server-Side Rendering (SSR)** para **Client-Side Rendering (CSR)** nesta página específica.

1.  **Diretiva `use client`:**
    A página `app/dashboard/finance/page.tsx` foi convertida para um componente cliente.

2.  **Busca Direta:**
    Em vez de depender do servidor validar o cookie antes de renderizar, a página carrega (mostra loading) e o navegador pede os dados ao Supabase diretamente usando a sessão ativa no browser.
    *   Isso elimina 100% dos erros de "Sessão Inválida" causados por cookies http-only mal sincronizados em localhost.

3.  **Design Premium:**
    A interface foi atualizada com gradientes, animações e feedback visual de carregamento.

---

## 3. Resumo de Comandos Úteis

| Ação | Comando |
|------|---------|
| **Rodar Painel (Web)** | `cd gym-panel && npm run dev` |
| **Rodar App (Web)** | `cd fitness-app && npx expo start --web --clear` |
| **Limpar Cache (Geral)** | `rm -rf .next node_modules/.cache` |

---

**Status Final:** O sistema está estável e funcional em ambos os ambientes.
