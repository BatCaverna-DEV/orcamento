# Sistema Orçamento

Planilha de orçamento mensal pessoal. O usuário cadastra suas **despesas** (fixas ou dívidas parceladas, com período de vigência) e **abre os meses**. Ao abrir um mês, o sistema gera uma **conta** pendente para cada despesa que vale naquele mês. O usuário marca as contas como pagas (informando o valor pago) e acompanha, mês a mês, salário × despesas × saldo.

A tela principal é uma planilha: **despesas nas linhas (à esquerda) e meses lado a lado nas colunas**.

## Estrutura do repositório

```
orcamento/
├── backend/                      API REST (Node.js + Express 5, ES Modules)
│   ├── index.js                  cors + json + rotas + handler de erro + sync do banco + listen
│   ├── config/
│   │   ├── env.js                Carrega backend/.env (independe da pasta de onde o node roda)
│   │   └── database.js           Sequelize (DB_DIALECT, padrão mysql; timestamps desligados)
│   ├── models/                   Usuario, Mes, Despesa, Conta + index.js (associações)
│   ├── middlewares/autenticar.js Valida o JWT (Bearer) e põe req.usuarioId
│   ├── services/contas.js        Regras de geração/sincronização de contas
│   ├── utils/validar.js          Helpers de validação (texto, dinheiro, data, mês)
│   ├── controllers/              auth, despesa, mes, conta
│   ├── routes/                   auth, despesas, meses, contas, admin (placeholder)
│   ├── scripts/db-reset.js       APAGA e recria todas as tabelas (npm run db:reset -- --sim)
│   ├── scripts/db-seed.js        (Re)cria o usuário fictício "demo" com dados de exemplo (npm run db:seed)
│   └── .env.example
├── frontend/                     SPA Vue 3 + Vite + Vue Router + Bootstrap-Vue Next
│   └── src/
│       ├── main.js               CSS (bootstrap, bvn, bootstrap-icons, assets/main.css)
│       ├── App.vue               <BApp>; navbar só nas rotas autenticadas
│       ├── router/index.js       Guarda: sem token -> /login; recarregou -> busca /auth/me
│       ├── services/sessao.js    Estado reativo da sessão (token no localStorage + usuário)
│       ├── services/api.js       fetch com Bearer; 401 encerra a sessão; services por recurso
│       ├── utils/formatar.js     formatarValor, mesAtual, proximoMes, nomeMes, mesAno, saudacao
│       ├── assets/main.css       Tema: variáveis --orc-* (verde #19c552), .card-orc etc.
│       ├── components/           AppNavbar, AuthLayout, DespesaModal, MesModal, ContaModal
│       └── views/                LoginView, CadastroView, HomeView (planilha), DespesasView, SimulacaoView
└── sistema.md                    Este arquivo
```

## Stack

| Camada   | Tecnologia |
|----------|------------|
| Backend  | Node.js, Express 5, Sequelize 6, mysql2, dotenv, cors, jsonwebtoken, bcryptjs |
| Banco    | MySQL (modelado no MySQL Workbench) |
| Frontend | Vue 3 (`<script setup>`), Vite, Vue Router, bootstrap-vue-next, bootstrap-icons |

- Backend usa `"type": "module"` → `import`/`export` e extensão `.js` nos imports relativos.
- Porta da API: `3000` (`PORT`). O frontend usa `VITE_API_URL` (padrão `http://localhost:3000`) — se mudar a porta do backend, mude os dois.
- CORS: qualquer porta de `localhost`/`127.0.0.1` + origens extras em `CORS_ORIGIN` (separadas por vírgula).
- `JWT_SECRET` é obrigatório no `.env` (o servidor não sobe sem ele). `JWT_EXPIRES_IN` padrão `7d`.
- Ao iniciar, `sequelize.sync()` cria tabelas que não existem (não altera as existentes). Mudou o modelo? `npm run db:reset -- --sim` (apaga tudo).
- Testar sem MySQL: `npm i --no-save sqlite3` e rodar com `DB_DIALECT=sqlite DB_STORAGE=<arquivo>`.

## Modelo de dados (DER atual)

Sem `createdAt`/`updatedAt` (o DER não tem).

```
usuarios 1 ──< N meses 1 ──< N contas N >── 1 despesas N >── 1 usuarios
```

### usuarios (`Usuario`)
| Campo    | Tipo          | Observação |
|----------|---------------|------------|
| id       | VARCHAR(50)   | PK, UUID |
| nome     | VARCHAR(100)  | |
| email    | VARCHAR(100)  | único, salvo em minúsculas |
| username | VARCHAR(100)  | único, salvo em minúsculas |
| password | VARCHAR(250)  | hash bcrypt. Excluído por `defaultScope`; use `Usuario.scope('comSenha')` no login |
| salario  | DECIMAL(10,2) | salário base, padrão ao abrir um mês |

### meses (`Mes`)
| Campo       | Tipo          | Observação |
|-------------|---------------|------------|
| id          | VARCHAR(50)   | PK, UUID |
| salario     | DECIMAL(10,2) | **no DER está VARCHAR(45)**; usado DECIMAL para permitir somas |
| status      | INT           | `1` aberto, `0` fechado (`MES_ABERTO`/`MES_FECHADO`) |
| descricao   | VARCHAR(45)   | mês de referência **`AAAA-MM`**; único por usuário |
| usuarios_id | VARCHAR(50)   | FK → usuarios |

### despesas (`Despesa`)
| Campo       | Tipo          | Observação |
|-------------|---------------|------------|
| id          | INT           | PK auto-incremento |
| descricao   | VARCHAR(100)  | |
| valor       | DECIMAL(10,2) | valor mensal previsto (parcela, se dívida) |
| tipo        | INT           | `1` Fixa, `2` Dívida (`DESPESA_FIXA`/`DESPESA_DIVIDA`) |
| inicio      | DATE          | sempre dia 01 do primeiro mês |
| fim         | DATE          | último dia do último mês; `null` = sem prazo. **Dívida exige fim** |
| usuarios_id | VARCHAR(50)   | FK → usuarios |

### contas (`Conta`) — ocorrência de uma despesa em um mês
| Campo       | Tipo          | Observação |
|-------------|---------------|------------|
| id          | VARCHAR(50)   | PK, UUID |
| valor_pago  | DECIMAL(10,2) | 0 enquanto pendente |
| status      | VARCHAR(45)   | `"pendente"` ou `"pago"` (`CONTA_PENDENTE`/`CONTA_PAGA`) |
| meses_id    | VARCHAR(50)   | FK → meses |
| despesas_id | INT           | FK → despesas. Único (`meses_id`, `despesas_id`) |

Campos DECIMAL têm getter no model que devolve **número** (o MySQL devolveria string).

## Regras de negócio (backend/services/contas.js)

- **Vigência:** a despesa vale no mês `M` se `inicio[AAAA-MM] <= M <= fim[AAAA-MM]` (fim nulo = sempre).
- **Abrir mês** (`POST /meses`): salário = informado ou `usuario.salario`; cria conta pendente para cada despesa vigente.
- **Criar/editar despesa:** sincroniza com os meses **abertos**: cria contas onde passou a valer; remove contas **pendentes** onde deixou de valer. Contas pagas e meses fechados nunca são mexidos.
- **Excluir despesa:** bloqueado (409) se houver conta paga — orientação é definir uma data de fim.
- **Mês fechado:** contas dele não podem ser alteradas (409); salário também não pela tela.
- **Excluir mês:** apaga o mês e todas as contas dele.
- Totais (calculados no frontend): previsto = pagas pelo `valor_pago` + pendentes pelo `valor` da despesa; saldo = salário − previsto.

## API

Erros: JSON `{ "erro": "mensagem" }` com 400 (validação), 401 (sem login/token inválido), 404 (não encontrado ou de outro usuário), 409 (conflito), 500.
Todas as rotas, exceto registrar/login, exigem `Authorization: Bearer <token>` e só enxergam os dados do usuário logado.

| Método | Rota | Corpo / descrição |
|--------|------|-------------------|
| POST | `/auth/registrar` | `{ nome, email, username, password (≥6), salario? }` → 201 `{ token, usuario }` |
| POST | `/auth/login` | `{ login (usuário ou e-mail), password }` → `{ token, usuario }` |
| GET | `/auth/me` | usuário logado |
| PUT | `/auth/me` | `{ nome, salario }` |
| GET | `/despesas` | ordenadas por tipo e descrição; cada uma com `qtd_contas`, `qtd_pagas`, `total_pago` |
| POST | `/despesas` | `{ descricao, valor, tipo, inicio, fim? }` |
| PUT | `/despesas/:id` | idem |
| DELETE | `/despesas/:id` | 204; 409 se houver conta paga |
| GET | `/meses` | ordem cronológica, cada mês com `contas[]` |
| POST | `/meses` | `{ descricao: "AAAA-MM", salario? }` → mês com contas geradas; 409 se já existe |
| PUT | `/meses/:id` | `{ salario?, status? }` |
| DELETE | `/meses/:id` | apaga mês e contas |
| PUT | `/contas/:id` | `{ status: "pago", valor_pago }` ou `{ status: "pendente" }` |

## Frontend

- **Login/Cadastro** (`/login`, `/cadastro`): rotas públicas (`meta.publica`), sem navbar. Login aceita usuário ou e-mail. `?voltar=` só aceita caminho interno.
- **Planilha** (`/`, HomeView): cabeçalho com saudação, botão *Abrir mês* (despesas novas são cadastradas na tela Despesas) e resumo do mês atual (ou último aberto): Salário, Fixas, Dívidas, A pagar, Saldo previsto.
  - Linhas: Salário; grupo **Fixas** e grupo **Dívidas** (linha de cabeçalho cinza com o total do grupo em cada mês, seguida das despesas — clique = editar); rodapé com Total, Pago, A pagar, Saldo.
  - Totais por grupo usam a mesma regra do previsto (pagas pelo valor pago, pendentes pelo valor da despesa).
  - Colunas: meses abertos em ordem; mês atual destacado em verde; menu ⋮ por mês (editar salário, fechar/reabrir, excluir).
  - Célula: ✔ verde = pago (mostra valor pago); ○ cinza = pendente (valor previsto); — = despesa não vale no mês. Clique abre o ContaModal.
  - Primeira coluna e cabeçalho fixos (sticky) ao rolar.
- **Gerenciamento de despesas** (`/despesas`, DespesasView):
  - Cards: fixas por mês e parcelas por mês (só vigentes), saldo devedor (dívidas: (parcelas − pagas) × valor), total já pago.
  - Filtros: busca, tipo (Fixa/Dívida) e situação em relação ao mês atual — vigente, futura (início depois de hoje), encerrada (fim antes de hoje). Padrão: vigentes.
  - Tabela ordenável com vigência, pagamentos (dívida: barra "X de N parcelas"; fixa: meses pagos), total pago; editar/excluir.
  - Parcelas só contam como pagas se o mês foi aberto e a conta marcada — meses nunca abertos aparecem como não pagos.
- **Simulação** (`/simulacao`, SimulacaoView): 100% no navegador, **nada é salvo** (só lê `/despesas` e `/meses`).
  - Escolhe um mês (`type="month"`) → *Abrir mês* monta a base real: se o mês já foi aberto, usa as contas dele (pagas pelo valor pago, pendentes pelo previsto) e o salário dele; se não, usa as despesas vigentes (`despesaVigente`, mesma regra do backend) e o salário base do usuário — ou seja, o que aconteceria ao abrir o mês de verdade.
  - Permite editar salário e valor de cada despesa, desligar despesas (switch "Incluir") e adicionar despesas temporárias (Fixa/Dívida).
  - Cards e tabela mostram Real × Simulado e a diferença (componente `Diferenca`: verde quando melhora o saldo, vermelho quando piora).
  - *Restaurar valores reais* volta à base e mantém as temporárias. Trocar de mês descarta a simulação.
- **DespesaModal:** tipo Fixa (fim opcional) ou Dívida (informa nº de parcelas; o fim é calculado). Datas por mês (`type="month"`).
- **MesModal:** abrir mês (sugere o seguinte ao último aberto) ou editar salário.
- Navbar: links visão geral, despesas e simulação + menu com o nome do usuário → Sair.

## Como rodar

```bash
# backend
cd backend
cp .env.example .env          # credenciais do MySQL + JWT_SECRET
npm install
npm run db:reset -- --sim     # só na primeira vez ou ao mudar o modelo (APAGA os dados)
npm run db:seed               # opcional: usuário fictício (login no topo de scripts/db-seed.js)
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

## Estado atual / próximos passos
- [x] Models do DER atual + associações
- [x] Login/cadastro com JWT e senha em bcrypt; dados isolados por usuário
- [x] Despesas (CRUD), meses (abrir/salário/fechar/excluir), pagamento de contas
- [x] Planilha meses × despesas na tela principal
- [ ] Tela de perfil (editar nome e salário base — a API `PUT /auth/me` já existe)
- [ ] Relatórios/gráficos
- [ ] Migrations (hoje o schema é criado pelo `sync()`)
