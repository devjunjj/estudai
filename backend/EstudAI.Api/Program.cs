using System.Threading.RateLimiting;
using EstudAI.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------- Banco de dados ----------
// PostgreSQL via Entity Framework Core. A connection string NÃO fica no código
// nem no appsettings.json: em desenvolvimento ela vem do "user-secrets".
// A connection string só é lida quando o banco é usado de fato, o que permite
// aos testes trocar o PostgreSQL por um banco em memória.
builder.Services.AddDbContext<AppDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
        ?? throw new InvalidOperationException(
            "Connection string 'DefaultConnection' não configurada. Use: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"...\"");
    options.UseNpgsql(connectionString);
});

// ---------- Autenticação (JWT do Supabase) ----------
// O login acontece no Supabase, que devolve um token JWT assinado.
// A API não guarda senha nenhuma: ela só confere se o token é verdadeiro,
// usando as chaves PÚBLICAS que o Supabase publica (JWKS).
var supabaseUrl = builder.Configuration["Supabase:Url"]
    ?? throw new InvalidOperationException("Configuração 'Supabase:Url' ausente no appsettings.json.");
var emissorToken = $"{supabaseUrl.TrimEnd('/')}/auth/v1";

// As chaves são baixadas uma vez, quando chega o primeiro token (Lazy),
// e não na inicialização: assim a API (e os testes) sobem sem depender da internet.
var chavesSupabase = new Lazy<IList<SecurityKey>>(() =>
{
    using var http = new HttpClient();
    var jwks = http.GetStringAsync($"{emissorToken}/.well-known/jwks.json").GetAwaiter().GetResult();
    var chaves = new JsonWebKeySet(jwks).GetSigningKeys();
    if (chaves.Count == 0)
    {
        throw new InvalidOperationException(
            "O Supabase não retornou chaves públicas (JWKS). Verifique se o projeto usa JWT Signing Keys assimétricas.");
    }
    return chaves;
}, LazyThreadSafetyMode.PublicationOnly); // se falhar (ex.: sem internet), tenta de novo na próxima requisição

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Mantém os nomes originais das claims do token (ex.: "sub" = id do usuário)
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = emissorToken,          // o token tem que ter sido emitido pelo SEU Supabase
            ValidateAudience = true,
            ValidAudience = "authenticated",     // e ser de um usuário logado
            ValidateLifetime = true,             // e não pode estar expirado
            ValidateIssuerSigningKey = true,
            // e a assinatura tem que bater com a chave pública do Supabase
            IssuerSigningKeyResolver = (_, _, _, _) => chavesSupabase.Value,
        };
    });

builder.Services.AddAuthorization();

// ---------- CORS ----------
// Endereços do frontend que podem chamar a API. Em desenvolvimento vem do appsettings
// (localhost:5173); no servidor, da variável de ambiente Cors__Origens__0, __1...
var origensPermitidas = builder.Configuration.GetSection("Cors:Origens").Get<string[]>() ?? [];
const string PoliticaFrontend = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(PoliticaFrontend, policy =>
        policy.WithOrigins(origensPermitidas)
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// ---------- IA (Gemini) ----------
// A chave da IA fica só no servidor (Gemini:ApiKey). O frontend nunca a vê.
builder.Services.AddHttpClient("gemini", cliente =>
{
    cliente.BaseAddress = new Uri("https://generativelanguage.googleapis.com/");
    cliente.Timeout = TimeSpan.FromSeconds(90);
});

// Limite de uso da IA: cada usuário pode fazer até 20 pedidos por minuto.
// Protege a cota (e o bolso) caso alguém tente abusar do endpoint.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("ia", contexto =>
        RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: contexto.User.FindFirst("sub")?.Value ?? contexto.Connection.RemoteIpAddress?.ToString() ?? "anonimo",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 20,
                Window = TimeSpan.FromMinutes(1),
            }));
});

// No Render (e na maioria das nuvens) a API fica atrás de um proxy que cuida do HTTPS.
// Isso faz a API enxergar o protocolo e o IP originais da requisição.
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// ---------- Controllers e Swagger ----------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    // Adiciona o botão "Authorize" no Swagger para testar com token
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Cole aqui o access_token do Supabase (sem a palavra Bearer).",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" },
            },
            Array.Empty<string>()
        },
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseForwardedHeaders();
app.UseCors(PoliticaFrontend);

// Erro inesperado (ex.: banco fora do ar) vira uma resposta JSON 500 que o site consegue ler,
// em vez de uma falha "muda" no navegador. O detalhe vai para o log do servidor.
app.Use(async (contexto, proximo) =>
{
    try
    {
        await proximo();
    }
    catch (Exception erro) when (!contexto.Response.HasStarted)
    {
        app.Logger.LogError(erro, "Erro inesperado em {Metodo} {Caminho}", contexto.Request.Method, contexto.Request.Path);
        contexto.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await contexto.Response.WriteAsJsonAsync(new { mensagem = "Erro inesperado no servidor. Tente de novo em instantes." });
    }
});
app.UseAuthentication(); // 1º: descobre QUEM é o usuário (lê e valida o token)
app.UseAuthorization();  // 2º: decide se ele PODE acessar o endpoint
app.UseRateLimiter();    // 3º: aplica o limite de uso por usuário
app.MapControllers();

// Usado pelo Render para saber se a API está no ar
app.MapGet("/saude", () => Results.Ok(new { status = "ok" }));

app.Run();

// Torna a classe Program visível para o projeto de testes (WebApplicationFactory<Program>)
public partial class Program { }
