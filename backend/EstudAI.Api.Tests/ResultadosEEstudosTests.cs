using System.Net;
using System.Net.Http.Json;
using EstudAI.Api.Dtos;
using EstudAI.Api.Tests.Infra;

namespace EstudAI.Api.Tests;

public class ResultadosEEstudosTests : IDisposable
{
    private readonly EstudAiApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    public async Task Resultados_SemLogin_Retorna401()
    {
        var resposta = await _factory.CreateClient().GetAsync("/api/resultados");

        Assert.Equal(HttpStatusCode.Unauthorized, resposta.StatusCode);
    }

    [Fact]
    public async Task RegistrarResultado_CalculaOPercentual()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/resultados",
            new RegistrarResultadoRequest("Cálculo I", 5, 4, new List<string> { "Regra da cadeia" }));

        Assert.Equal(HttpStatusCode.Created, resposta.StatusCode);
        var resultado = await resposta.Content.ReadFromJsonAsync<ResultadoResponse>();
        Assert.Equal(80, resultado!.Percentual);
        Assert.Equal(new[] { "Regra da cadeia" }, resultado.TopicosErrados);
    }

    [Fact]
    public async Task RegistrarResultado_ComMaisAcertosQueQuestoes_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/resultados", new RegistrarResultadoRequest("Cálculo I", 5, 6, null));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task ListarResultados_FiltraPorMateriaESoDoUsuario()
    {
        var aluno1 = _factory.CriarClienteLogado("aluno-1");
        var aluno2 = _factory.CriarClienteLogado("aluno-2");
        await aluno1.PostAsJsonAsync("/api/resultados", new RegistrarResultadoRequest("Cálculo I", 5, 3, null));
        await aluno1.PostAsJsonAsync("/api/resultados", new RegistrarResultadoRequest("Química", 5, 5, null));
        await aluno2.PostAsJsonAsync("/api/resultados", new RegistrarResultadoRequest("Cálculo I", 5, 1, null));

        var calculo = await aluno1.GetFromJsonAsync<List<ResultadoResponse>>("/api/resultados?materia=Cálculo I");
        var todos = await aluno1.GetFromJsonAsync<List<ResultadoResponse>>("/api/resultados");

        var unico = Assert.Single(calculo!);
        Assert.Equal(60, unico.Percentual);
        Assert.Equal(2, todos!.Count);
    }

    [Fact]
    public async Task ImportarResultados_DuasVezes_NaoDuplica()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");
        var pedido = new ImportarResultadosRequest(new List<ResultadoLocalDto>
        {
            new("1729950000000", "Física", new DateTime(2026, 10, 20, 12, 0, 0, DateTimeKind.Utc), 5, 2, new List<string> { "Inércia" }),
        });

        await cliente.PostAsJsonAsync("/api/resultados/importar", pedido);
        await cliente.PostAsJsonAsync("/api/resultados/importar", pedido);

        var todos = await cliente.GetFromJsonAsync<List<ResultadoResponse>>("/api/resultados");
        var unico = Assert.Single(todos!);
        Assert.Equal(40, unico.Percentual);
    }

    [Fact]
    public async Task RegistrarDias_IgnoraRepetidosEDevolveEmOrdem()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        await cliente.PostAsJsonAsync("/api/estudos/dias", new RegistrarDiasRequest(new List<string> { "2026-10-25", "2026-10-24" }));
        await cliente.PostAsJsonAsync("/api/estudos/dias", new RegistrarDiasRequest(new List<string> { "2026-10-25", "2026-10-26" }));

        var dias = await cliente.GetFromJsonAsync<List<string>>("/api/estudos/dias");
        Assert.Equal(new[] { "2026-10-24", "2026-10-25", "2026-10-26" }, dias);
    }

    [Fact]
    public async Task RegistrarDias_ComDataInvalida_Retorna400()
    {
        var cliente = _factory.CriarClienteLogado("aluno-1");

        var resposta = await cliente.PostAsJsonAsync("/api/estudos/dias", new RegistrarDiasRequest(new List<string> { "26/10/2026" }));

        Assert.Equal(HttpStatusCode.BadRequest, resposta.StatusCode);
    }

    [Fact]
    public async Task Dias_SaoSeparadosPorUsuario()
    {
        var aluno1 = _factory.CriarClienteLogado("aluno-1");
        var aluno2 = _factory.CriarClienteLogado("aluno-2");
        await aluno1.PostAsJsonAsync("/api/estudos/dias", new RegistrarDiasRequest(new List<string> { "2026-10-26" }));

        var diasDoAluno2 = await aluno2.GetFromJsonAsync<List<string>>("/api/estudos/dias");

        Assert.Empty(diasDoAluno2!);
    }
}
