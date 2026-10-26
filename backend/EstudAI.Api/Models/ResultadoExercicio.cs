namespace EstudAI.Api.Models;

// Resultado de uma rodada de exercícios (alimenta a tela de Desempenho)
public class ResultadoExercicio
{
    public Guid Id { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string Materia { get; set; } = string.Empty;
    public DateTime Data { get; set; }
    public int Total { get; set; }
    public int Acertos { get; set; }
    public int Percentual { get; set; }
    public List<string> TopicosErrados { get; set; } = new();
    public string? OrigemLocalId { get; set; }
}
