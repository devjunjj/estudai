using System.ComponentModel.DataAnnotations;

namespace EstudAI.Api.Dtos;

// Pedido para a IA: o texto (prompt) e, opcionalmente, um arquivo de áudio em base64
public record GerarRespostaRequest(
    [Required, MaxLength(60_000)] string Prompt,
    ArquivoIa? Arquivo);

public record ArquivoIa(
    [Required, RegularExpression(@"^audio/[\w.+-]+$", ErrorMessage = "Só arquivos de áudio são aceitos.")] string MimeType,
    [Required, MaxLength(15_000_000)] string DadosBase64);

public record GerarRespostaResponse(string Texto);
