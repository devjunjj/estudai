using System.Net;
using System.Net.Http.Json;
using EstudAI.Api.Dtos;
using EstudAI.Api.Tests.Infra;

namespace EstudAI.Api.Tests;

public class ConversasControllerTests : IDisposable
{
    private readonly EstudAiApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    private static async Task<ConversaResponse> CriarConversa(HttpClient cliente, string materia = "Cálculo I", string? estilo = null)
    {
        var resposta = await cliente.PostAsJsonAsync("/api/conversas", new CriarConversaRequest(materia, estilo));
        resposta.EnsureSuccessStatusCode();
        return (await resposta.Content.ReadFromJsonAsync<ConversaResponse>())!;
    }

    private static List<MensagemDto> Mensagens(params (string autor, string texto)[] itens) =>
        itens.Select(i => new MensagemDto(i.autor, i.texto)).ToList();

    [Fact]
    public async Task Listar_SemLogin_Retorna401()
    {
        var resposta = await _factory.CreateClient().GetAsync("/api/conversas");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Criar_SemEstilo_UsaEquilibrado()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var conversa = await CriarConversa(cliente);

        Assert.Equal("equilibrado", conversa.Estilo);
        Assert.Equal("Cálculo I", conversa.Materia);
        Assert.Empty(conversa.Mensagens);
    }

    [Fact]
    public async Task Criar_ComEstiloInvalido_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/conversas", new CriarConversaRequest("Física", "enorme"));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task SalvarMensagens_GuardaNaOrdemESubstituiAsAnteriores()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var conversa = await CriarConversa(cliente);
        await cliente.PutAsJsonAsync($"/api/conversas/{conversa.Id}/mensagens",
            new SalvarMensagensRequest(Mensagens(("usuario", "O que é derivada?"), ("ia", "Resposta longa"))));

        // "Mais curto": a última resposta da IA é trocada
        var resposta = await cliente.PutAsJsonAsync($"/api/conversas/{conversa.Id}/mensagens",
            new SalvarMensagensRequest(new List<MensagemDto>
            {
                new("usuario", "O que é derivada?"),
                new("ia", "Resposta curta", Sugestoes: new List<string> { "Me dá um exemplo", "Outro tema" }),
            }));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var salva = await cliente.GetFromJsonAsync<ConversaResponse>($"/api/conversas/{conversa.Id}");
        Assert.Equal(2, salva!.Mensagens.Count);
        Assert.Equal("O que é derivada?", salva.Mensagens[0].Texto);
        Assert.Equal("Resposta curta", salva.Mensagens[1].Texto);
        Assert.Equal(new[] { "Me dá um exemplo", "Outro tema" }, salva.Mensagens[1].Sugestoes);
    }

    [Fact]
    public async Task Listar_MostraResumoSoDoUsuarioLogado_MaisRecentePrimeiro()
    {
        var aluno1 = _factory.CriarClienteLogado("aluno-1");
        var aluno2 = _factory.CriarClienteLogado("aluno-2");
        var antiga = await CriarConversa(aluno1, "Química");
        var recente = await CriarConversa(aluno1, "História");
        await CriarConversa(aluno2, "Física");
        await aluno1.PutAsJsonAsync($"/api/conversas/{recente.Id}/mensagens",
            new SalvarMensagensRequest(Mensagens(("usuario", "Era Vargas"), ("ia", "Começou em 1930."))));

        var lista = await aluno1.GetFromJsonAsync<List<ConversaResumoResponse>>("/api/conversas");

        Assert.Equal(2, lista!.Count);
        Assert.Equal(recente.Id, lista[0].Id);
        Assert.Equal("Era Vargas", lista[0].Titulo);
        Assert.Equal("Começou em 1930.", lista[0].UltimaMensagem);
        Assert.Equal("ia", lista[0].UltimoAutor);
        Assert.Equal(2, lista[0].TotalMensagens);
        Assert.Equal(antiga.Id, lista[1].Id);
        Assert.Null(lista[1].Titulo);
    }

    [Fact]
    public async Task ConversaDeOutroUsuario_NaoPodeSerLidaAlteradaNemApagada()
    {
        var dono = _factory.CriarClienteLogado("aluno-1");
        var intruso = _factory.CriarClienteLogado("aluno-2");
        var conversa = await CriarConversa(dono);

        var ler = await intruso.GetAsync($"/api/conversas/{conversa.Id}");
        var alterar = await intruso.PutAsJsonAsync($"/api/conversas/{conversa.Id}/mensagens",
            new SalvarMensagensRequest(Mensagens(("usuario", "invadido"))));
        var apagar = await intruso.DeleteAsync($"/api/conversas/{conversa.Id}");

        Assert.Equal(HttpStatusCode.NotFound, ler.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, alterar.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, apagar.StatusCode);
        var doDono = await dono.GetFromJsonAsync<ConversaResponse>($"/api/conversas/{conversa.Id}");
        Assert.Empty(doDono!.Mensagens);
    }

    [Fact]
    public async Task AtualizarEstilo_MudaOEstiloDaConversa()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var conversa = await CriarConversa(cliente);

        var resposta = await cliente.PutAsJsonAsync($"/api/conversas/{conversa.Id}/estilo", new AtualizarEstiloRequest("direto"));

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        var salva = await cliente.GetFromJsonAsync<ConversaResponse>($"/api/conversas/{conversa.Id}");
        Assert.Equal("direto", salva!.Estilo);
    }

    [Fact]
    public async Task Excluir_ApagaAConversaEAsMensagens()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var conversa = await CriarConversa(cliente);
        await cliente.PutAsJsonAsync($"/api/conversas/{conversa.Id}/mensagens",
            new SalvarMensagensRequest(Mensagens(("usuario", "Oi"))));

        var resposta = await cliente.DeleteAsync($"/api/conversas/{conversa.Id}");

        Assert.Equal(HttpStatusCode.NoContent, resposta.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await cliente.GetAsync($"/api/conversas/{conversa.Id}")).StatusCode);
    }

    [Fact]
    public async Task Importar_DuasVezes_NaoDuplica()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var pedido = new ImportarConversasRequest(new List<ConversaLocalDto>
        {
            new("conv_1", "Física", "detalhado", new DateTime(2026, 10, 20, 12, 0, 0, DateTimeKind.Utc), new DateTime(2026, 10, 21, 12, 0, 0, DateTimeKind.Utc),
                Mensagens(("usuario", "Leis de Newton"), ("ia", "São três."))),
            new("conv_2", "Química", null, new DateTime(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc), new DateTime(2026, 10, 22, 12, 0, 0, DateTimeKind.Utc),
                new List<MensagemDto>()),
        });

        var primeira = await (await cliente.PostAsJsonAsync("/api/conversas/importar", pedido)).Content.ReadFromJsonAsync<ImportacaoResponse>();
        var segunda = await (await cliente.PostAsJsonAsync("/api/conversas/importar", pedido)).Content.ReadFromJsonAsync<ImportacaoResponse>();

        Assert.Equal(new ImportacaoResponse(2, 0), primeira);
        Assert.Equal(new ImportacaoResponse(0, 2), segunda);
        var lista = await cliente.GetFromJsonAsync<List<ConversaResumoResponse>>("/api/conversas");
        Assert.Equal(2, lista!.Count);
        var fisica = lista.Single(c => c.Materia == "Física");
        Assert.Equal("detalhado", fisica.Estilo);
        Assert.Equal("Leis de Newton", fisica.Titulo);
    }

    [Fact]
    public async Task SalvarMensagens_ComAutorInvalido_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var conversa = await CriarConversa(cliente);

        var resposta = await cliente.PutAsJsonAsync($"/api/conversas/{conversa.Id}/mensagens",
            new SalvarMensagensRequest(Mensagens(("hacker", "oi"))));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }
}
