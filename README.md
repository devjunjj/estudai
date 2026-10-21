# EstudAI

Assistente de estudos com IA que se adapta à matéria do aluno: tira dúvidas em formato de conversa, gera exercícios, resume textos, explica áudios de aula e acompanha o desempenho por tópico.

Aplicação web instalável no celular (PWA), feita em React.

## Funcionalidades

- **Login e cadastro** com e-mail e senha (Supabase Auth), com rotas protegidas
- **Chat com tutor por matéria**: antes de cada conversa o aluno escolhe a matéria, e a IA responde como um tutor daquele assunto, levando em conta o histórico da conversa
- **Geração de exercícios**: 5 questões de múltipla escolha com dificuldade progressiva, baseadas no que foi conversado no chat
- **Desempenho**: histórico de acertos por matéria e os tópicos em que o aluno mais erra, com atalho para revisar esses tópicos no chat
- **Resumo de textos**: o aluno cola um texto e recebe um resumo didático
- **Áudio**: upload de um arquivo de áudio, que é transcrito e explicado
- **Anotações** por matéria dentro do chat
- **Tema claro/escuro** e instalação como app (PWA)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite, React Router |
| Autenticação | Supabase Auth |
| IA | Google Gemini API |
| Backend | Função serverless na Vercel (`/api/gemini`) |
| PWA | vite-plugin-pwa |
| Qualidade | Oxlint |

## Arquitetura

```
Navegador (React)
   │
   ├── Supabase Auth ........ login, cadastro e sessão
   │
   └── /api/gemini (Vercel) . função serverless que guarda a chave da IA
          │
          └── Google Gemini API
```

**Por que a função serverless?** Se o React chamasse o Gemini direto, a chave da API ficaria visível no código que roda no navegador, e qualquer pessoa poderia copiá-la. Em produção o frontend chama `/api/gemini`, e só o servidor conhece a chave (variável `GEMINI_API_KEY`). Em desenvolvimento, para facilitar os testes locais, a chamada é direta usando a chave do `.env`.

Toda a comunicação com a IA está concentrada em `src/lib/aiClient.js`, então trocar de modelo ou de provedor exige mudar só esse arquivo.

## Estrutura de pastas

```
api/
  gemini.js              função serverless (proxy seguro para o Gemini)
src/
  pages/                 telas: Login, Home, NewChat, Chat, Exercises, Performance
  components/            componentes reutilizáveis (NotesPanel)
  lib/
    aiClient.js          integração com a IA (prompts e chamadas)
    supabaseClient.js    cliente de autenticação
    conversationsStore.js, notesStore.js, performanceStore.js
                         persistência de conversas, notas e resultados
```

## Como rodar localmente

Pré-requisitos: Node.js 20+, uma conta no [Supabase](https://supabase.com) e uma chave do [Google AI Studio](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/devjunjj/estudai
cd estudai
npm install
cp .env.example .env    # no Windows: copy .env.example .env
```

Preencha o `.env` com a URL e a chave do seu projeto Supabase e a sua chave do Gemini. Depois:

```bash
npm run dev
```

Acesse http://localhost:5173, crie uma conta e escolha uma matéria.

## Próximos passos

- [ ] API própria em **C# / ASP.NET Core** para conversas, notas e desempenho
- [ ] Banco de dados **PostgreSQL** com Entity Framework Core (hoje os dados ficam no `localStorage`)
- [ ] Validação do token JWT do Supabase na API
- [ ] Testes automatizados (xUnit no backend)
- [ ] Docker e deploy em nuvem

## Autor

**Jonas Vicente** · Estudante de Engenharia de Software · [GitHub](https://github.com/devjunjj)
