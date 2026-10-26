using EstudAI.Api.Data;
using EstudAI.Api.Dtos;
using EstudAI.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstudAI.Api.Controllers;

// Resultados das rodadas de exercícios (tela de Desempenho)
[Route("api/resultados")]
public class ResultadosController : UsuarioControllerBase
{
    private readonly AppDbContext _db;

    public ResultadosController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/resultados?materia=Cálculo I (sem matéria = todos), do mais antigo para o mais recente
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ResultadoResponse>>> Listar([FromQuery] string? materia)
    {
        var consulta = _db.ResultadosExercicios.Where(r => r.UserId == UserId);
        if (!string.IsNullOrWhiteSpace(materia)) consulta = consulta.Where(r => r.Materia == materia);

        var resultados = await consulta.OrderBy(r => r.Data).ToListAsync();
        return Ok(resultados.Select(ParaResposta));
    }

    // POST api/resultados
    [HttpPost]
    public async Task<ActionResult<ResultadoResponse>> Registrar([FromBody] RegistrarResultadoRequest request)
    {
        if (request.Acertos > request.Total)
        {
            return BadRequest(new { mensagem = "Acertos não pode ser maior que o total de questões." });
        }

        var resultado = Novo(request.Materia, DateTime.UtcNow, request.Total, request.Acertos, request.TopicosErrados, null);
        _db.ResultadosExercicios.Add(resultado);
        await _db.SaveChangesAsync();

        return Created($"/api/resultados/{resultado.Id}", ParaResposta(resultado));
    }

    // POST api/resultados/importar — traz os resultados que estavam só no navegador, sem duplicar
    [HttpPost("importar")]
    public async Task<ActionResult<ImportacaoResponse>> Importar([FromBody] ImportarResultadosRequest request)
    {
        var jaImportados = await _db.ResultadosExercicios
            .Where(r => r.UserId == UserId && r.OrigemLocalId != null)
            .Select(r => r.OrigemLocalId!)
            .ToListAsync();
        var conhecidos = new HashSet<string>(jaImportados);

        var importados = 0;
        foreach (var local in request.Resultados)
        {
            if (local.Acertos > local.Total || !conhecidos.Add(local.IdLocal)) continue;

            var data = local.Data.Kind == DateTimeKind.Utc ? local.Data : DateTime.SpecifyKind(local.Data.ToUniversalTime(), DateTimeKind.Utc);
            _db.ResultadosExercicios.Add(Novo(local.Materia, data, local.Total, local.Acertos, local.TopicosErrados, local.IdLocal));
            importados++;
        }

        await _db.SaveChangesAsync();
        return Ok(new ImportacaoResponse(importados, request.Resultados.Count - importados));
    }

    private ResultadoExercicio Novo(string materia, DateTime data, int total, int acertos, List<string>? topicos, string? origem) => new()
    {
        Id = Guid.NewGuid(),
        UserId = UserId,
        Materia = materia.Trim(),
        Data = data,
        Total = total,
        Acertos = acertos,
        Percentual = (int)Math.Round(acertos * 100.0 / total),
        TopicosErrados = (topicos ?? new List<string>()).Where(t => !string.IsNullOrWhiteSpace(t)).Take(20).ToList(),
        OrigemLocalId = origem,
    };

    private static ResultadoResponse ParaResposta(ResultadoExercicio r) =>
        new(r.Id, r.Materia, r.Data, r.Total, r.Acertos, r.Percentual, r.TopicosErrados);
}
