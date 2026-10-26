using System.ComponentModel.DataAnnotations;

namespace EstudAI.Api.Dtos;

public record RegistrarResultadoRequest(
    [Required, MaxLength(100)] string Materia,
    [Range(1, 50)] int Total,
    [Range(0, 50)] int Acertos,
    List<string>? TopicosErrados);

public record ResultadoResponse(
    Guid Id,
    string Materia,
    DateTime Data,
    int Total,
    int Acertos,
    int Percentual,
    List<string> TopicosErrados);

public record ResultadoLocalDto(
    [Required, MaxLength(100)] string IdLocal,
    [Required, MaxLength(100)] string Materia,
    DateTime Data,
    [Range(1, 50)] int Total,
    [Range(0, 50)] int Acertos,
    List<string>? TopicosErrados);

public record ImportarResultadosRequest(
    [Required, MaxLength(2000)] List<ResultadoLocalDto> Resultados);

// Dias no formato "aaaa-mm-dd", na data local do aluno
public record RegistrarDiasRequest(
    [Required, MaxLength(1000)] List<string> Dias);
