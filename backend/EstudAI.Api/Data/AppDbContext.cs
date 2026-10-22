using EstudAI.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EstudAI.Api.Data;

// O DbContext é a "ponte" entre o C# e o banco de dados.
// Cada DbSet vira uma tabela.
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Note> Notes => Set<Note>();

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
    }
}
