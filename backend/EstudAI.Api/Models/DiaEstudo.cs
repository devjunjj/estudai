namespace EstudAI.Api.Models;

// Um dia em que o aluno estudou (alimenta a sequência de dias seguidos).
// A chave é composta: (UserId, Dia) — cada dia aparece uma vez por aluno.
public class DiaEstudo
{
    public string UserId { get; set; } = string.Empty;
    public DateOnly Dia { get; set; }
}
