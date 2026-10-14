# Delta Sales Hub

Aplicação web para gerenciamento de vendas e pedidos, com recursos de consulta de produtos, preços e integração com uma API local e o Supabase.

O projeto foi desenvolvido utilizando:

* React
* TypeScript
* TanStack Router
* Vite
* Supabase

## Requisitos

Antes de iniciar o projeto, verifique se os seguintes requisitos estão instalados e configurados:

* Node.js 20 ou superior
* npm
* API local disponível na porta `3000`
* Projeto Supabase configurado

## Instalação

Clone o repositório e acesse a pasta do projeto:

```powershell
git clone https://github.com/ilaRuiz/pedido_vendas_local.git
cd pedido_vendas_local
```

Instale as dependências:

```powershell
npm install
```

Crie o arquivo de variáveis de ambiente com base no exemplo:

```powershell
Copy-Item .env.example .env
```

Abra o arquivo `.env` e preencha a URL, o identificador e a chave **publicável** do seu projeto Supabase. As variáveis `VITE_*` são incluídas no frontend e ficam visíveis no navegador. Não coloque chaves `service_role`, `sb_secret_*`, senhas ou outros segredos nessas variáveis.

> O arquivo `.env` contém informações sensíveis e não deve ser enviado ao GitHub.

## Executando em desenvolvimento

### Acesso somente na máquina local

```powershell
npm run dev -- --host 127.0.0.1 --port 8080
```

Acesse:

```text
http://localhost:8080
```

### Acesso pela rede local

```powershell
npm run dev -- --host 0.0.0.0 --port 8080
```

Em outro computador ou dispositivo conectado à mesma rede, acesse:

```text
http://IP_DA_MAQUINA:8080
```

Exemplo:

```text
http://192.168.1.100:8080
```

## Configuração da API local

A aplicação depende de uma API local executando, por padrão, na porta `3000`.

Quando a API estiver na mesma máquina em que o navegador está sendo utilizado, configure o endereço:

```text
http://localhost:3000
```

Quando a API estiver em outra máquina da rede, utilize o IP do servidor:

```text
http://IP_DO_SERVIDOR:3000
```

Exemplo:

```text
http://192.168.1.50:3000
```

Se o acesso pela rede for necessário, permita a porta `3000` no firewall somente para os clientes autorizados. Evite abertura irrestrita ou túneis públicos com dados reais. O endereço `localhost` se refere à máquina do navegador, não ao servidor que hospeda o site.

## Gerando o build de produção

Para gerar a versão de produção da aplicação:

```powershell
npm run build
```

Os arquivos gerados serão armazenados na pasta:

```text
dist
```

## Supabase

As migrações do banco de dados estão localizadas em:

```text
supabase/migrations
```

Antes de executar o projeto com dados de teste, verifique se:

* As credenciais do Supabase estão preenchidas corretamente no arquivo `.env`.
* As migrações necessárias foram aplicadas.
* As políticas de acesso e autenticação estão configuradas no Supabase.

## Estrutura principal

```text
public/                 Arquivos públicos
src/                    Código-fonte da aplicação
supabase/               Configurações e migrações do Supabase
.env.example            Exemplo de variáveis de ambiente
package.json            Dependências e scripts do projeto
vite.config.ts          Configuração do Vite
tsconfig.json           Configuração do TypeScript
```

## Scripts disponíveis

```powershell
npm run dev
```

Inicia o servidor de desenvolvimento.

```powershell
npm run build
```

Gera o build de produção.

```powershell
npm run preview
```

Executa localmente uma prévia do build de produção.


## Segurança antes de usar dados reais

A revisão estática identificou riscos que exigem uma alteração funcional separada. Este README e os comentários do template não corrigem a segurança do aplicativo em execução.

- **O login atual é controlado pelo frontend.** Sessão, perfil administrativo e limite de desconto ficam no armazenamento do navegador. Esconder menus ou redirecionar rotas não substitui autenticação e autorização no servidor.
- Há uma senha administrativa fixa no código cliente e senhas de operadores comparadas no navegador. A opção de salvar senha persiste o valor no dispositivo. Não use credenciais reais ou reutilizadas nesse fluxo; a correção requer autenticação verificável no servidor, sem enviar senhas armazenadas ao frontend.
- **RLS habilitado não significa acesso restrito.** As migrações versionadas concedem permissões a `anon` e `authenticated` com políticas permissivas nas tabelas de configurações, operadores, pedidos, cache e logs. Não aplique essas migrações em um projeto com dados reais sem revisar as políticas. O estado efetivo do Supabase implantado deve ser conferido separadamente.
- Uma chave publicável Supabase é destinada ao cliente; a proteção dos dados depende de políticas de acesso corretas. Trocar ou esconder essa chave não corrige políticas abertas. Chaves privilegiadas devem permanecer exclusivamente no servidor.
- O cache `api_cache` armazena respostas da API no Supabase, mesmo quando a API usa `localhost`. Revise e minimize os dados enviados, especialmente documentos, contatos e campos de senha. Logs de erro também podem armazenar payloads sensíveis.
- A URL da API é configurável e compartilhada por `app_config`. Restrinja quem pode alterá-la e quais destinos são permitidos; use HTTPS quando os dados trafegarem pela rede. A autenticação do site não autentica automaticamente as chamadas à API local.
- As chamadas atuais à API local não enviam um token de autenticação. Revise autenticação e autorização da API, incluindo limites de desconto, preços, operador, filial e banco, antes de habilitar uso externo. **CORS não é autenticação** e não impede chamadas diretas.
- Use o servidor de desenvolvimento somente em ambiente de teste. Para rede local, limite o acesso por firewall/VPN; confirme a interface de escuta, pois a configuração compartilhada do Vite pode aplicar opções próprias.

Planeje a correção em conjunto: autenticação real, autorização/RLS por identidade e operação, migração das senhas, minimização do cache e testes de acesso negado. Aplicar apenas políticas restritivas agora pode interromper o login e as integrações existentes. Use um projeto Supabase isolado com dados fictícios para validar essas mudanças antes de qualquer implantação.
