using System.Globalization;
using EstudAI.Api.Data;
using EstudAI.Api.Dtos;
using EstudAI.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstudAI.Api.Controllers;

// Dias estudados, para a sequência de dias seguidos
[Route("api/estudos")]
public class EstudosController : UsuarioControllerBase
{
    private const string FormatoDia = "yyyy-MM-dd";
    private readonly AppDbContext _db;

    public EstudosController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/estudos/dias — ["2026-10-24", "2026-10-25", ...]
    [HttpGet("dias")]
    public async Task<ActionResult<IEnumerable<string>>> ListarDias()
    {
        var dias = await _db.DiasEstudo
            .Where(d => d.UserId == UserId)
            .OrderBy(d => d.Dia)
            .Select(d => d.Dia)
            .ToListAsync();

        return Ok(dias.Select(d => d.ToString(FormatoDia, CultureInfo.InvariantCulture)));
    }

    // POST api/estudos/dias — registra um ou mais dias; dias repetidos são ignorados
    [HttpPost("dias")]
    public async Task<IActionResult> RegistrarDias([FromBody] RegistrarDiasRequest request)
    {
        var novos = new HashSet<DateOnly>();
        foreach (var texto in request.Dias)
        {
            if (!DateOnly.TryParseExact(texto, FormatoDia, CultureInfo.InvariantCulture, DateTimeStyles.None, out var dia))
            {
                return BadRequest(new { mensagem = $"Data inválida: '{texto}'. Use o formato aaaa-mm-dd." });
            }
            novos.Add(dia);
        }

        var existentes = await _db.DiasEstudo
            .Where(d => d.UserId == UserId && novos.Contains(d.Dia))
            .Select(d => d.Dia)
            .ToListAsync();

        foreach (var dia in novos.Except(existentes))
        {
            _db.DiasEstudo.Add(new DiaEstudo { UserId = UserId, Dia = dia });
        }

        await _db.SaveChangesAsync();
        return NoContent();
    }
}
