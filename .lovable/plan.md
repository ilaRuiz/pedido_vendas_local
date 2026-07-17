# Gerador de Pedidos de Vendas Web

Aplicação PWA responsiva que consome a API Firebird (Node middleware) exposta via ngrok, com login de operador, geração/consulta de pedidos, consulta rápida de preços e área administrativa.

## Stack e infraestrutura
- TanStack Start (já configurado) + Tailwind v4 + shadcn.
- **Lovable Cloud** (Supabase gerenciado) para: persistir pedidos gerados, credenciais salvas dos operadores (hash local no browser + opcional em nuvem), logs de sincronização com a API externa, configurações globais (nome da empresa exibido, URL base da API).
- PWA: manifest + service worker (offline básico do shell, install prompt para celular/tablet).
- Tema claro/escuro em tons de azul via tokens `oklch` em `src/styles.css`.

## Integração com a API Firebird (ngrok)
- Cliente HTTP central com header fixo `ngrok-skip-browser-warning: 1` em toda chamada.
- URL base configurável (default: `https://proactive-unnoticed-outfit.ngrok-free.dev`), armazenada em Cloud e cacheada no localStorage.
- Todas as chamadas passam por um wrapper que:
  - Registra timestamp, rota, status, duração e payload de erro na tabela `sync_logs`.
  - Faz retry leve em falhas de rede.
- Endpoints usados: `/api/operadores`, `/api/parceiros`, `/api/parceiros-propriedade`, `/api/cliente-diversos`, `/api/estoque`, `/api/formas-pagamento`, `/api/condicoes-recebimento`, `/api/operacoes`, `/health`.

## Autenticação de operador
- Tela `/login`: input "Operador" + "Senha" + checkbox "Salvar senha".
- Lista de operadores vem de `GET /api/operadores`. Senha é validada contra o campo retornado pela API (a definir com o backend; enquanto isso, ADM/estac2ul é hardcoded no cliente como fallback administrativo).
- "Salvar senha" grava operador+senha em `localStorage` (com aviso claro). Autofill ao voltar.
- Sessão do operador guardada em Zustand + localStorage. Rota protegida por guarda em `_authenticated`.
- Operador `ADM` (senha `estac2ul`) tem role `admin` e acessa a rota Configurações.

## Layout
- **Sidebar esquerda colapsável** (shadcn Sidebar, `collapsible="icon"`): itens Novo Pedido, Pedidos, Consulta Preço, Configurações (só ADM).
- **Topbar**: logo Delta + nome da empresa (editável em Configurações) à esquerda; à direita menu do operador com "Trocar tema" (claro/escuro azul) e "Sair".
- Responsivo mobile/tablet: sidebar vira offcanvas, topbar compacta.

## Rotinas principais

### Novo Pedido (`/pedidos/novo`)
- **Abas de pedidos em andamento**: barra superior com tabs, botão "+" abre novo pedido sem gravar o atual, "x" cancela. Estado em Zustand (persistido em localStorage para sobreviver refresh).
- **Cliente**:
  - Busca avançada em `parceiros` (nome, razão social, telefone, endereço) com debounce.
  - Se o cliente tem múltiplas propriedades (`parceiros-propriedade`), abre modal para escolher endereço.
  - Toggle "Cliente Diversos" (padrão ligado): form com Nome, Endereço, CPF; preenche registro de cliente diversos.
- **Produtos**: busca em `estoque` por nome/marca/grupo, adiciona à grade do pedido com qtde, preço unitário, desconto/acréscimo % ou R$.
  - Limite de desconto por vendedor: campo `desconto_maximo` do operador; a UI bloqueia e alerta se ultrapassar.
- **Pagamento**: seleciona `forma-pagamento` + `condicao-recebimento`, mostra simulação de parcelas (datas e valores) calculada a partir dos dias da condição.
- **Gravar**: salva o pedido no Cloud (tabela `pedidos`) com status `gravado`; futuramente enviável ao ERP.

### Pedidos (`/pedidos`)
- Lista dos pedidos gravados pelo operador (admin vê todos), com filtros por data/cliente/status. Clique abre visualização detalhada.

### Consulta Preço (`/consulta-preco` ou modal global acionável por atalho)
- Modal rápido: input de produto → resultado com preço, estoque, marca.
- Botão "Abrir novo pedido com este produto" cria uma aba de pedido já com o item.

### Configurações (`/config`, só ADM)
- **Conexão API**: URL base, teste de conexão (`/health`), salvar.
- **Nome da empresa exibido no topo** (texto livre, aplica a todos).
- **Logs de sincronização**: tabela paginada com rota, status, mensagem de erro, timestamp, duração. Filtros por status/rota/data. Botão "Reprocessar".
- **Sincronizações**: lista das cargas de referência (parceiros, estoque, formas de pagamento...) com última execução, resultado e botão "Sincronizar agora".

## Tema
- Tokens `--primary`, `--accent`, `--background` em azul claro e azul escuro no `:root` e `.dark` de `src/styles.css`. Toggle no menu do operador salva em localStorage.

## PWA
- `public/manifest.webmanifest` com nome, ícones, `display: standalone`, theme_color azul.
- Meta tags no `__root.tsx`.
- Service worker mínimo apenas quando o usuário pedir offline; por ora, manifest-only para permitir "Adicionar à tela inicial".

## Modelo de dados (Lovable Cloud)
- `app_config` (singleton): `api_base_url`, `company_name`.
- `sync_logs`: `id, operador, rota, method, status_code, duration_ms, error_message, payload, created_at`.
- `pedidos`: `id, operador, cliente_id/diversos_json, itens_json, forma_pgto, condicao, total, desconto, status, created_at`.
- RLS: operadores autenticados leem/escrevem seus próprios pedidos; ADM lê tudo. `app_config` leitura pública autenticada, escrita só ADM.
- Auth: como o login é por operador da API (não Supabase Auth), usaremos uma tabela `operadores_sessao` simples ou trataremos a autorização no cliente + edge functions com um token compartilhado. **Detalhe a validar antes de codar RLS**.

## Ordem de entrega
1. Enable Lovable Cloud + tabelas + tokens de tema azul + shell (sidebar/topbar) + PWA manifest.
2. Login + guarda de rota + cliente HTTP com header ngrok + tela Configurações (URL API, nome empresa).
3. Sincronizações + logs + tela admin de logs.
4. Novo Pedido (abas, cliente, produtos, pagamento, gravar) + limite de desconto.
5. Lista de Pedidos + Consulta Preço (modal) + integração "abrir pedido a partir do produto".
6. Ajustes responsivos finais e teste PWA.

## Perguntas antes de implementar
1. **Senha do operador**: a API `/api/operadores` retorna senha/hash para validação no cliente, ou existe endpoint de login dedicado que eu ainda não vi? Se não houver, posso liberar acesso apenas validando que o operador existe (sem senha, exceto ADM), até que o backend exponha isso?
2. **Limite de desconto por vendedor**: vem em algum campo do `/api/operadores` (ex.: `desconto_maximo`)? Se não, quero adicionar essa configuração por operador dentro do painel ADM.
3. **Gravação do pedido**: por enquanto salvo só no Lovable Cloud, ou já existe endpoint na API Firebird para enviar o pedido de volta (POST)? A doc só lista GETs.
4. **Logo Delta**: você tem o arquivo do logo pra eu usar, ou gero um placeholder azul enquanto isso?
