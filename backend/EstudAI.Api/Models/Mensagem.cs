namespace EstudAI.Api.Models;

public class Mensagem
{
    public Guid Id { get; set; }
    public Guid ConversaId { get; set; }   // chave estrangeira para a conversa
    public int Ordem { get; set; }         // posição da mensagem na conversa
    public string Autor { get; set; } = string.Empty; // "usuario" ou "ia"
    public string Texto { get; set; } = string.Empty;
    public bool Anexo { get; set; }        // aluno enviou texto/áudio em vez de digitar
    public bool Erro { get; set; }         // mensagem de erro mostrada no lugar da resposta
    public List<string> Sugestoes { get; set; } = new(); // respostas rápidas sugeridas pela IA
}
