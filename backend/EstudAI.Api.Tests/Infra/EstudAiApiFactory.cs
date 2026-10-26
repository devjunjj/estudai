using EstudAI.Api.Data;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace EstudAI.Api.Tests.Infra;

// Sobe a API inteira em memória para os testes de integração.
// Troca só o que depende do mundo externo:
//  - PostgreSQL  -> banco em memória (um novo a cada factory, testes não interferem entre si)
//  - JWT Supabase -> TestAuthHandler
public class EstudAiApiFactory : WebApplicationFactory<Program>
{
    private readonly string _nomeBanco = $"estudai-testes-{Guid.NewGuid()}";

    // Gemini falso, configurável em cada teste
    public GeminiFalso Gemini { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuracao) =>
            configuracao.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Gemini:ApiKey"] = "chave-de-teste",
            }));

        builder.ConfigureTestServices(services =>
        {
            // Remove o registro do PostgreSQL e coloca o banco em memória no lugar
            var registroPostgres = services.Single(s => s.ServiceType == typeof(DbContextOptions<AppDbContext>));
            services.Remove(registroPostgres);
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_nomeBanco));

            // Troca o Gemini de verdade pelo falso
            services.AddHttpClient("gemini").ConfigurePrimaryHttpMessageHandler(() => Gemini);

            // Usa a autenticação de teste como padrão
            services
                .AddAuthentication(TestAuthHandler.Esquema)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.Esquema, _ => { });
        });
    }

    // Cliente HTTP já "logado" como o usuário informado
    public HttpClient CriarClienteLogado(string userId)
    {
        var cliente = CreateClient();
        cliente.DefaultRequestHeaders.Add(TestAuthHandler.Cabecalho, userId);
        return cliente;
    }
}
