namespace EstudAI.Api.Models;

// Entidade: representa uma linha da tabela "Notes" no banco.
public class Note
{
    public Guid Id { get; set; }

    // Id do usuário no Supabase. Toda consulta filtra por ele,
    // para um aluno nunca ver as anotações de outro.
    public string UserId { get; set; } = string.Empty;

    public string Materia { get; set; } = string.Empty;
    public string Texto { get; set; } = string.Empty;
    public DateTime CriadaEm { get; set; }
    public DateTime AtualizadaEm { get; set; }
}
