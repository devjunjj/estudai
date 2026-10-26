# EstudAI

Assistente de estudos com IA que se adapta à matéria do aluno: tira dúvidas em formato de conversa, gera exercícios, resume textos, explica áudios de aula e acompanha o desempenho por tópico.

Aplicação full stack: frontend em React (PWA instalável no celular) e API em C# / ASP.NET Core com PostgreSQL.

## Funcionalidades

- **Login e cadastro** com e-mail e senha (Supabase Auth), com rotas protegidas
- **Chat com tutor por matéria**: antes de cada conversa o aluno escolhe a matéria, e a IA responde como um tutor daquele assunto, levando em conta o histórico da conversa
- **Geração de exercícios**: 5 questões de múltipla escolha com dificuldade progressiva, baseadas no que foi conversado no chat
- **Desempenho**: histórico de acertos por matéria e os tópicos em que o aluno mais erra, com atalho para revisar esses tópicos no chat
- **Resumo de textos**: o aluno cola um texto e recebe um resumo didático
- **Áudio**: upload de um arquivo de áudio, que é transcrito e explicado
- **Anotações** por matéria dentro do chat, salvas no banco pela API em C#
- **Tema claro/escuro** e instalação como app (PWA)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, React Router |
| Backend | C# / ASP.NET Core 8 (Web API com controllers) |
| Banco de dados | PostgreSQL (Supabase) com Entity Framework Core e migrations |
| Autenticação | Supabase Auth + validação de JWT na API (JwtBearer) |
| IA | Google Gemini API |
| Proxy da IA | Função serverless na Vercel (`/api/gemini`) |
| PWA | vite-plugin-pwa |
| Qualidade | Oxlint |

## Arquitetura

```
Navegador (React)
   │
   ├── Supabase Auth ........ login, cadastro e sessão
   │
   ├── API ASP.NET Core ..... CRUD de anotações (/api/notes)
   │      └── PostgreSQL (EF Core)
   │
   └── /api/gemini (Vercel) . função serverless que guarda a chave da IA
          │
          └── Google Gemini API
```

**Por que a função serverless?** Se o React chamasse o Gemini direto, a chave da API ficaria visível no código que roda no navegador, e qualquer pessoa poderia copiá-la. Em produção o frontend chama `/api/gemini`, e só o servidor conhece a chave (variável `GEMINI_API_KEY`). Em desenvolvimento, para facilitar os testes locais, a chamada é direta usando a chave do `.env`.

Toda a comunicação com a IA está concentrada em `src/lib/aiClient.js`, então trocar de modelo ou de provedor exige mudar só esse arquivo.

**Segurança dos dados:** a API exige o token JWT gerado pelo Supabase no login (`Authorization: Bearer ...`). A assinatura é conferida com as chaves públicas do Supabase (JWKS), junto com emissor, audiência e validade, e o id do usuário é lido do próprio token (claim `sub`). Assim ninguém consegue se passar por outro usuário, e toda consulta filtra pelo dono dos dados. A connection string do banco fica no *user-secrets* do .NET (fora do repositório), e as tabelas têm RLS ativado no Supabase, bloqueando acesso direto pela chave pública.

## Estrutura de pastas

```
backend/EstudAI.Api/
  Controllers/           endpoints REST (NotesController)
  Models/                entidades do banco
  Dtos/                  contratos de entrada e saída, com validação
  Data/                  AppDbContext (Entity Framework Core)
  Migrations/            histórico de alterações do banco
api/
  gemini.js              função serverless (proxy seguro para o Gemini)
src/
  pages/                 telas: Login, Home, NewChat, Chat, Exercises, Performance
  components/            componentes reutilizáveis (NotesPanel)
  lib/
    aiClient.js          integração com a IA (prompts e chamadas)
    api.js               cliente HTTP da API em C#
    supabaseClient.js    cliente de autenticação
    conversationsStore.js, performanceStore.js
                         conversas e resultados (ainda no navegador)
```

## Como rodar localmente

Pré-requisitos: Node.js 20+, .NET SDK 8, uma conta no [Supabase](https://supabase.com) e uma chave do [Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/devjunjj/estudai
cd estudai
npm install
cp .env.example .env    # no Windows: copy .env.example .env
```

Preencha o `.env` com a URL e a chave do seu projeto Supabase e a sua chave do Gemini.

**API (C#):** configure a connection string do PostgreSQL (no Supabase: *Connect → Direct → .NET → Session pooler*), crie as tabelas e suba a API:

```bash
cd backend/EstudAI.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=5432;Database=postgres;Username=...;Password=...;SSL Mode=Require"
dotnet tool install --global dotnet-ef --version 8.0.11
dotnet ef database update
dotnet run
```

A documentação interativa (Swagger) fica em http://localhost:5018/swagger.

**Frontend:** em outro terminal, na raiz do projeto:

```bash
npm run dev
```

Acesse http://localhost:5173, crie uma conta e escolha uma matéria.

## Próximos passos

- [x] API própria em **C# / ASP.NET Core** com CRUD de anotações
- [x] Banco de dados **PostgreSQL** com Entity Framework Core e migrations
- [ ] Migrar conversas e desempenho do `localStorage` para a API
- [x] Autenticação na API com o token JWT do Supabase
- [ ] Testes automatizados (xUnit no backend)
- [ ] Docker e deploy em nuvem

## Autor

**Jonas Vicente** · Estudante de Engenharia de Software · [GitHub](https://github.com/devjunjj)
