using EstudAI.Api.Data;
using EstudAI.Api.Dtos;
using EstudAI.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstudAI.Api.Controllers;

[ApiController]
[Route("api/notes")]
[Authorize] // sem token válido, todos os endpoints respondem 401 Unauthorized
public class NotesController : ControllerBase
{
    private readonly AppDbContext _db;

    // Injeção de dependência: o ASP.NET cria o AppDbContext e entrega pronto.
    public NotesController(AppDbContext db)
    {
        _db = db;
    }

    // Id do usuário logado, lido do token JWT (claim "sub").
    // Como vem do token assinado, o cliente não consegue se passar por outra pessoa.
    private string UserId => User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("Token sem identificação de usuário.");

    // GET api/notes?materia=Matemática
    [HttpGet]
    public async Task<ActionResult<IEnumerable<NoteResponse>>> Listar([FromQuery] string materia)
    {
        var notas = await _db.Notes
            .Where(n => n.UserId == UserId && n.Materia == materia)
            .OrderByDescending(n => n.CriadaEm)
            .Select(n => new NoteResponse(n.Id, n.Materia, n.Texto, n.CriadaEm, n.AtualizadaEm))
            .ToListAsync();

        return Ok(notas);
    }

    // POST api/notes
    [HttpPost]
    public async Task<ActionResult<NoteResponse>> Criar([FromBody] CreateNoteRequest request)
    {
        var agora = DateTime.UtcNow;
        var nota = new Note
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Materia = request.Materia.Trim(),
            Texto = request.Texto.Trim(),
            CriadaEm = agora,
            AtualizadaEm = agora,
        };

        _db.Notes.Add(nota);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Listar), new { materia = nota.Materia }, ParaResposta(nota));
    }

    // PUT api/notes/{id}
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<NoteResponse>> Atualizar(Guid id, [FromBody] UpdateNoteRequest request)
    {
        var nota = await _db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId);
        if (nota is null) return NotFound();

        nota.Texto = request.Texto.Trim();
        nota.AtualizadaEm = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ParaResposta(nota));
    }

    // DELETE api/notes/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id)
    {
        var nota = await _db.Notes.FirstOrDefaultAsync(n => n.Id == id && n.UserId == UserId);
        if (nota is null) return NotFound();

        _db.Notes.Remove(nota);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    private static NoteResponse ParaResposta(Note n) =>
        new(n.Id, n.Materia, n.Texto, n.CriadaEm, n.AtualizadaEm);
}
