namespace EstudAI.Api.Models;

// Uma conversa de estudo de um aluno sobre uma matéria.
// Relacionamento 1:N — uma conversa tem várias mensagens.
public class Conversa
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Materia { get; set; } = string.Empty;
    public string Estilo { get; set; } = "equilibrado";

    // Id que a conversa tinha no navegador, antes de existir sincronização.
    // Serve para importar os dados antigos sem criar duplicatas.
    public string? OrigemLocalId { get; set; }

    public DateTime CriadaEm { get; set; }
    public DateTime AtualizadaEm { get; set; }

    public List<Mensagem> Mensagens { get; set; } = new();
}
