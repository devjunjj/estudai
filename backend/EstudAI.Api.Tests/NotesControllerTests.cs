using System.Net;
using System.Net.Http.Json;
using EstudAI.Api.Dtos;
using EstudAI.Api.Tests.Infra;

namespace EstudAI.Api.Tests;

// Testes de integração: cada teste faz requisições HTTP de verdade
// para a API rodando em memória e confere a resposta.
public class NotesControllerTests : IDisposable
{
    private readonly EstudAiApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Listar_SemLogin_Retorna401()
    {
        var cliente = _factory.CreateClient(); // sem o cabeçalho de usuário

        var resposta = await cliente.GetAsync("/api/notes?materia=Matemática");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_ComDadosValidos_Retorna201EANota()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/notes",
            new CreateNoteRequest("Matemática", "  Derivada de x² é 2x  "));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var nota = await resposta.Content.ReadFromJsonAsync<NoteResponse>();
        Assert.NotNull(nota);
        Assert.NotEqual(Guid.Empty, nota.Id);
        Assert.Equal("Matemática", nota.Materia);
        Assert.Equal("Derivada de x² é 2x", nota.Texto); // espaços nas pontas são removidos
    }

    [Fact]
    public async Task Criar_SemTexto_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/notes", new { materia = "Matemática", texto = "" });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Listar_RetornaSomenteNotasDoUsuarioLogado()
    {
        var aluno1 = _factory.CriarClienteLogado("aluno-1");
        var aluno2 = _factory.CriarClienteLogado("aluno-2");
        await aluno1.PostAsJsonAsync("/api/notes", new CreateNoteRequest("Física", "Nota do aluno 1"));
        await aluno2.PostAsJsonAsync("/api/notes", new CreateNoteRequest("Física", "Nota do aluno 2"));

        var notasDoAluno1 = await aluno1.GetFromJsonAsync<List<NoteResponse>>("/api/notes?materia=Física");

        var nota = Assert.Single(notasDoAluno1!);
        Assert.Equal("Nota do aluno 1", nota.Texto);
    }

    [Fact]
    public async Task Listar_FiltraPorMateria()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        await cliente.PostAsJsonAsync("/api/notes", new CreateNoteRequest("Física", "Nota de física"));
        await cliente.PostAsJsonAsync("/api/notes", new CreateNoteRequest("Química", "Nota de química"));

        var notas = await cliente.GetFromJsonAsync<List<NoteResponse>>("/api/notes?materia=Química");

        var nota = Assert.Single(notas!);
        Assert.Equal("Química", nota.Materia);
    }

    [Fact]
    public async Task Atualizar_AlteraOTextoDaNota()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var criada = await CriarNota(cliente, "Texto antigo");

        var resposta = await cliente.PutAsJsonAsync($"/api/notes/{criada.Id}", new UpdateNoteRequest("Texto novo"));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var atualizada = await resposta.Content.ReadFromJsonAsync<NoteResponse>();
        Assert.Equal("Texto novo", atualizada!.Texto);
    }

    [Fact]
    public async Task Excluir_NotaPropria_Retorna204ENotaSomeDaLista()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var criada = await CriarNota(cliente, "Vou ser excluída");

        var resposta = await cliente.DeleteAsync($"/api/notes/{criada.Id}");

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        var notas = await cliente.GetFromJsonAsync<List<NoteResponse>>("/api/notes?materia=Matemática");
        Assert.Empty(notas!);
    }

    [Fact]
    public async Task Excluir_NotaDeOutroUsuario_Retorna404ENaoApaga()
    {
        var dono = _factory.CriarClienteLogado("aluno-1");
        var intruso = _factory.CriarClienteLogado("aluno-2");
        var criada = await CriarNota(dono, "Nota protegida");

        var resposta = await intruso.DeleteAsync($"/api/notes/{criada.Id}");

        Assert.Equal(HttpStatusCode.NotFound, resposta.StatusCode);
        var notasDoDono = await dono.GetFromJsonAsync<List<NoteResponse>>("/api/notes?materia=Matemática");
        Assert.Single(notasDoDono!);
    }

    private static async Task<NoteResponse> CriarNota(HttpClient cliente, string texto)
    {
        var resposta = await cliente.PostAsJsonAsync("/api/notes", new CreateNoteRequest("Matemática", texto));
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<NoteResponse>())!;
    }
}
