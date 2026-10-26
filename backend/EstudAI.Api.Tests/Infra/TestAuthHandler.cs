using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace EstudAI.Api.Tests.Infra;

// Autenticação "falsa" usada só nos testes: em vez de validar um JWT real do
// Supabase, considera logado quem enviar o cabeçalho X-Test-User.
// Sem o cabeçalho, a requisição fica anônima e a API deve responder 401.
public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string Esquema = "Teste";
    public const string Cabecalho = "X-Test-User";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(Cabecalho, out var userId) || string.IsNullOrWhiteSpace(userId))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        // Mesma claim que o token do Supabase traz: "sub" = id do usuário
        var identidade = new ClaimsIdentity(new[] { new Claim("sub", userId.ToString()) }, Esquema);
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identidade), Esquema);
        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
