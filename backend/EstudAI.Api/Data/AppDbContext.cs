using System.Text.Json;
using EstudAI.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace EstudAI.Api.Data;

// O DbContext é a "ponte" entre o C# e o banco de dados.
// Cada DbSet vira uma tabela.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Conversa> Conversas => Set<Conversa>();
    public DbSet<Mensagem> Mensagens => Set<Mensagem>();
    public DbSet<ResultadoExercicio> ResultadosExercicios => Set<ResultadoExercicio>();
    public DbSet<DiaEstudo> DiasEstudo => Set<DiaEstudo>();

    // Listas de texto (sugestões, tópicos) são guardadas como JSON numa coluna de texto.
    private static readonly ValueComparer<List<string>> ComparadorLista = new(
        (a, b) => (a ?? new List<string>()).SequenceEqual(b ?? new List<string>()),
        lista => lista.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
        lista => lista.ToList());

    private static List<string> LerLista(string json) =>
        JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Note>(entity =>
        {
            entity.HasKey(n => n.Id);
            entity.Property(n => n.UserId).IsRequired().HasMaxLength(100);
            entity.Property(n => n.Materia).IsRequired().HasMaxLength(100);
            entity.Property(n => n.Texto).IsRequired().HasMaxLength(5000);

            // Índice: a busca mais comum é "notas deste usuário nesta matéria".
            entity.HasIndex(n => new { n.UserId, n.Materia });
        });

        modelBuilder.Entity<Conversa>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.Property(c => c.UserId).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Materia).IsRequired().HasMaxLength(100);
            entity.Property(c => c.Estilo).IsRequired().HasMaxLength(20);
            entity.Property(c => c.OrigemLocalId).HasMaxLength(100);

            // Lista de conversas do aluno, da mais recente para a mais antiga
            entity.HasIndex(c => new { c.UserId, c.AtualizadaEm });
            // Impede importar a mesma conversa do navegador duas vezes
            entity.HasIndex(c => new { c.UserId, c.OrigemLocalId }).IsUnique();

            // Apagar a conversa apaga as mensagens junto
            entity.HasMany(c => c.Mensagens)
                  .WithOne()
                  .HasForeignKey(m => m.ConversaId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Mensagem>(entity =>
        {
            entity.HasKey(m => m.Id);
            entity.Property(m => m.Autor).IsRequired().HasMaxLength(10);
            entity.Property(m => m.Texto).IsRequired();
            entity.Property(m => m.Sugestoes)
                  .HasConversion(lista => JsonSerializer.Serialize(lista, (JsonSerializerOptions?)null), json => LerLista(json))
                  .Metadata.SetValueComparer(ComparadorLista);
            entity.HasIndex(m => new { m.ConversaId, m.Ordem });
        });

        modelBuilder.Entity<ResultadoExercicio>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.Property(r => r.UserId).IsRequired().HasMaxLength(100);
            entity.Property(r => r.Materia).IsRequired().HasMaxLength(100);
            entity.Property(r => r.OrigemLocalId).HasMaxLength(100);
            entity.Property(r => r.TopicosErrados)
                  .HasConversion(lista => JsonSerializer.Serialize(lista, (JsonSerializerOptions?)null), json => LerLista(json))
                  .Metadata.SetValueComparer(ComparadorLista);
            entity.HasIndex(r => new { r.UserId, r.Materia });
            entity.HasIndex(r => new { r.UserId, r.OrigemLocalId }).IsUnique();
        });

        modelBuilder.Entity<DiaEstudo>(entity =>
        {
            entity.HasKey(d => new { d.UserId, d.Dia });
            entity.Property(d => d.UserId).HasMaxLength(100);
        });
    }
}
