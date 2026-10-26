using EstudAI.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ---------- Banco de dados ----------
// PostgreSQL via Entity Framework Core. A connection string NÃO fica no código
// nem no appsettings.json: em desenvolvimento ela vem do "user-secrets".
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' não configurada. Use: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"...\"");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

// ---------- Autenticação (JWT do Supabase) ----------
// O login acontece no Supabase, que devolve um token JWT assinado.
// A API não guarda senha nenhuma: ela só confere se o token é verdadeiro,
// usando as chaves PÚBLICAS que o Supabase publica (JWKS).
var supabaseUrl = builder.Configuration["Supabase:Url"]
    ?? throw new InvalidOperationException("Configuração 'Supabase:Url' ausente no appsettings.json.");
var emissorToken = $"{supabaseUrl.TrimEnd('/')}/auth/v1";

IList<SecurityKey> chavesSupabase;
using (var http = new HttpClient())
{
    var jwks = http.GetStringAsync($"{emissorToken}/.well-known/jwks.json").GetAwaiter().GetResult();
    chavesSupabase = new JsonWebKeySet(jwks).GetSigningKeys();
}
if (chavesSupabase.Count == 0)
{
    throw new InvalidOperationException(
        "O Supabase não retornou chaves públicas (JWKS). Verifique se o projeto usa JWT Signing Keys assimétricas.");
}

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
            IssuerSigningKeys = chavesSupabase,  // e a assinatura tem que bater com a chave pública
        };
    });

builder.Services.AddAuthorization();

// ---------- CORS ----------
// Libera o frontend React (Vite, porta 5173) para chamar a API.
const string PoliticaFrontend = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(PoliticaFrontend, policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
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

app.UseHttpsRedirection();
app.UseCors(PoliticaFrontend);
app.UseAuthentication(); // 1º: descobre QUEM é o usuário (lê e valida o token)
app.UseAuthorization();  // 2º: decide se ele PODE acessar o endpoint
app.MapControllers();

app.Run();
