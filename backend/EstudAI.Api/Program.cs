using EstudAI.Api.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Banco de dados: PostgreSQL via Entity Framework Core.
// A connection string NÃO fica no código nem no appsettings.json:
// em desenvolvimento ela vem do "user-secrets" (fora do repositório).
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException(
        "Connection string 'DefaultConnection' não configurada. Use: dotnet user-secrets set \"ConnectionStrings:DefaultConnection\" \"...\"");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));

// CORS: libera o frontend React (Vite, porta 5173) para chamar a API.
const string PoliticaFrontend = "Frontend";
builder.Services.AddCors(options =>
{
    options.AddPolicy(PoliticaFrontend, policy =>
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod());
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors(PoliticaFrontend);
app.UseAuthorization();
app.MapControllers();

app.Run();
