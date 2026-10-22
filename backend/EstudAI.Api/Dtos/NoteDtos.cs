using System.ComponentModel.DataAnnotations;

namespace EstudAI.Api.Dtos;

// DTOs (Data Transfer Objects): o formato dos dados que entram e saem da API.
// Separar isso da entidade evita expor campos internos (como o UserId)
// e permite validar a entrada antes de chegar no banco.

public record CreateNoteRequest(
    [Required, MaxLength(100)] string Materia,
    [Required, MaxLength(5000)] string Texto);

public record UpdateNoteRequest(
    [Required, MaxLength(5000)] string Texto);

public record NoteResponse(
    Guid Id,
    string Materia,
    string Texto,
    DateTime CriadaEm,
    DateTime AtualizadaEm);
