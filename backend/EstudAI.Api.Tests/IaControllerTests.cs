using System.Net;
using System.Net.Http.Json;
using EstudAI.Api.Dtos;
using EstudAI.Api.Tests.Infra;

namespace EstudAI.Api.Tests;

public class IaControllerTests : IDisposable
{
    private readonly EstudAiApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Gerar_SemLogin_Retorna401()
    {
        var cliente = _factory.CreateClient();

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", new GerarRespostaRequest("Oi", null));

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task Gerar_ComLogin_RetornaTextoDaIaEUsaAChaveDoServidor()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", new GerarRespostaRequest("Explique derivadas", null));

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        var corpo = await resposta.Content.ReadFromJsonAsync<GerarRespostaResponse>();
        Assert.Equal("Resposta da IA de teste", corpo!.Texto);
        Assert.Equal("chave-de-teste", _factory.Gemini.UltimaChave); // chave no cabeçalho...
        Assert.DoesNotContain("key=", _factory.Gemini.UltimaUrl!.Query); // ...e nunca na URL
        Assert.Contains("Explique derivadas", _factory.Gemini.UltimoCorpo);
    }

    [Fact]
    public async Task Gerar_ComAudio_EnviaOArquivoParaAIa()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var pedido = new GerarRespostaRequest("Explique o áudio", new ArquivoIa("audio/mpeg", "QUJD"));

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", pedido);

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
        Assert.Contains("\"inline_data\"", _factory.Gemini.UltimoCorpo);
        Assert.Contains("audio/mpeg", _factory.Gemini.UltimoCorpo);
    }

    [Fact]
    public async Task Gerar_ArquivoQueNaoEAudio_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var pedido = new GerarRespostaRequest("Leia isto", new ArquivoIa("application/pdf", "QUJD"));

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", pedido);

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Gerar_SemPrompt_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", new { prompt = "" });

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Gerar_QuandoAIaFalha_Retorna502()
    {
        _factory.Gemini.Status = HttpStatusCode.InternalServerError;
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", new GerarRespostaRequest("Oi", null));

        Assert.Equal(HttpStatusCode.BadGateway, resposta.StatusCode);
    }

    [Fact]
    public async Task Gerar_SemConexaoComAIa_Retorna502()
    {
        _factory.Gemini.Falhar = true;
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/ia/gerar", new GerarRespostaRequest("Oi", null));

        Assert.Equal(HttpStatusCode.BadGateway, resposta.StatusCode);
    }

    [Fact]
    public async Task Gerar_MaisDe20PedidosPorMinuto_Retorna429()
    {
        var cliente = _factory.CriarClienteLogado("aluno-apressado");

        for (var i = 0; i < 20; i++)
        {
            var ok = await cliente.PostAsJsonAsync("/api/ia/gerar", new GerarRespostaRequest("Oi", null));
            Assert.Equal(HttpStatusCode.OK, ok.StatusCode);
        }
        var bloqueada = await cliente.PostAsJsonAsync("/api/ia/gerar", new GerarRespostaRequest("Oi", null));

        Assert.Equal((HttpStatusCode)429, bloqueada.StatusCode);
    }

    [Fact]
    public async Task Saude_RespondeOk()
    {
        var resposta = await _factory.CreateClient().GetAsync("/saude");

        Assert.Equal(HttpStatusCode.OK, resposta.StatusCode);
    }
}
