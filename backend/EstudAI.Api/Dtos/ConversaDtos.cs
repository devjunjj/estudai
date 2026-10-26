using System.ComponentModel.DataAnnotations;

namespace EstudAI.Api.Dtos;

public record MensagemDto(
    [Required, RegularExpression("^(usuario|ia)$", ErrorMessage = "Autor deve ser 'usuario' ou 'ia'.")] string Autor,
    [Required(AllowEmptyStrings = true), MaxLength(100_000)] string Texto,
    bool Anexo = false,
    bool Erro = false,
    List<string>? Sugestoes = null);

public record CriarConversaRequest(
    [Required, MaxLength(100)] string Materia,
    [RegularExpression("^(direto|equilibrado|detalhado)$")] string? Estilo);

public record AtualizarEstiloRequest(
    [Required, RegularExpression("^(direto|equilibrado|detalhado)$")] string Estilo);

public record SalvarMensagensRequest(
    [Required, MaxLength(1000)] List<MensagemDto> Mensagens);

// Conversa completa, com as mensagens (tela de chat)
public record ConversaResponse(
    Guid Id,
    string Materia,
    string Estilo,
    DateTime CriadaEm,
    DateTime AtualizadaEm,
    List<MensagemDto> Mensagens);

// Resumo para listas (início, conversas, menu lateral) — sem carregar todas as mensagens
public record ConversaResumoResponse(
    Guid Id,
    string Materia,
    string Estilo,
    DateTime CriadaEm,
    DateTime AtualizadaEm,
    string? Titulo,
    string? UltimaMensagem,
    string? UltimoAutor,
    int TotalMensagens);

// Importação das conversas que estavam salvas só no navegador
public record ConversaLocalDto(
    [Required, MaxLength(100)] string IdLocal,
    [Required, MaxLength(100)] string Materia,
    string? Estilo,
    DateTime CriadaEm,
    DateTime AtualizadaEm,
    [Required, MaxLength(1000)] List<MensagemDto> Mensagens);

public record ImportarConversasRequest(
    [Required, MaxLength(500)] List<ConversaLocalDto> Conversas);

public record ImportacaoResponse(int Importados, int Ignorados);
