using EstudAI.Api.Data;
using EstudAI.Api.Dtos;
using EstudAI.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace EstudAI.Api.Controllers;

[Route("api/conversas")]
public class ConversasController : UsuarioControllerBase
{
    private const string EstiloPadrao = "equilibrado";
    private readonly AppDbContext _db;

    public ConversasController(AppDbContext db)
    {
        _db = db;
    }

    // GET api/conversas — resumo das conversas do aluno, da mais recente para a mais antiga
    [HttpGet]
    public async Task<ActionResult<IEnumerable<ConversaResumoResponse>>> Listar()
    {
        var conversas = await _db.Conversas
            .Where(c => c.UserId == UserId)
            .OrderByDescending(c => c.AtualizadaEm)
            .Select(c => new ConversaResumoResponse(
                c.Id,
                c.Materia,
                c.Estilo,
                c.CriadaEm,
                c.AtualizadaEm,
                c.Mensagens.Where(m => m.Autor == "usuario").OrderBy(m => m.Ordem).Select(m => m.Texto).FirstOrDefault(),
                c.Mensagens.OrderByDescending(m => m.Ordem).Select(m => m.Texto).FirstOrDefault(),
                c.Mensagens.OrderByDescending(m => m.Ordem).Select(m => m.Autor).FirstOrDefault(),
                c.Mensagens.Count))
            .ToListAsync();

        return Ok(conversas);
    }

    // GET api/conversas/{id} — conversa completa
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ConversaResponse>> Obter(Guid id)
    {
        var conversa = await _db.Conversas
            .Include(c => c.Mensagens)
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (conversa is null) return NotFound();

        return Ok(ParaResposta(conversa));
    }

    // POST api/conversas
    [HttpPost]
    public async Task<ActionResult<ConversaResponse>> Criar([FromBody] CriarConversaRequest request)
    {
        var agora = DateTime.UtcNow;
        var conversa = new Conversa
        {
            Id = Guid.NewGuid(),
            UserId = UserId,
            Materia = request.Materia.Trim(),
            Estilo = request.Estilo ?? EstiloPadrao,
            CriadaEm = agora,
            AtualizadaEm = agora,
        };

        _db.Conversas.Add(conversa);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(Obter), new { id = conversa.Id }, ParaResposta(conversa));
    }

    // PUT api/conversas/{id}/mensagens — substitui a lista de mensagens.
    // O chat sempre envia a lista inteira, o que também cobre o "Mais curto"/"Explica melhor",
    // que trocam a última resposta.
    [HttpPut("{id:guid}/mensagens")]
    public async Task<ActionResult<ConversaResponse>> SalvarMensagens(Guid id, [FromBody] SalvarMensagensRequest request)
    {
        var conversa = await _db.Conversas
            .Include(c => c.Mensagens)
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (conversa is null) return NotFound();

        // Apaga as antigas e adiciona as novas explicitamente (Added), para o EF
        // não confundir as novas — que já têm Id — com mensagens existentes.
        _db.Mensagens.RemoveRange(conversa.Mensagens);
        var novas = ParaEntidades(conversa.Id, request.Mensagens);
        _db.Mensagens.AddRange(novas);
        conversa.Mensagens = novas;
        conversa.AtualizadaEm = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        return Ok(ParaResposta(conversa));
    }

    // PUT api/conversas/{id}/estilo
    [HttpPut("{id:guid}/estilo")]
    public async Task<IActionResult> AtualizarEstilo(Guid id, [FromBody] AtualizarEstiloRequest request)
    {
        var conversa = await _db.Conversas.FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (conversa is null) return NotFound();

        conversa.Estilo = request.Estilo;
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE api/conversas/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Excluir(Guid id)
    {
        var conversa = await _db.Conversas
            .Include(c => c.Mensagens)
            .FirstOrDefaultAsync(c => c.Id == id && c.UserId == UserId);
        if (conversa is null) return NotFound();

        _db.Conversas.Remove(conversa);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // POST api/conversas/importar — traz as conversas que estavam só no navegador.
    // Pode ser chamado mais de uma vez: conversas já importadas são ignoradas.
    [HttpPost("importar")]
    [RequestSizeLimit(20_000_000)]
    public async Task<ActionResult<ImportacaoResponse>> Importar([FromBody] ImportarConversasRequest request)
    {
        var jaImportadas = await _db.Conversas
            .Where(c => c.UserId == UserId && c.OrigemLocalId != null)
            .Select(c => c.OrigemLocalId!)
            .ToListAsync();
        var conhecidas = new HashSet<string>(jaImportadas);

        var importadas = 0;
        foreach (var local in request.Conversas)
        {
            if (!conhecidas.Add(local.IdLocal)) continue; // já existe (ou repetida no mesmo pedido)

            var id = Guid.NewGuid();
            _db.Conversas.Add(new Conversa
            {
                Id = id,
                UserId = UserId,
                Materia = local.Materia.Trim(),
                Estilo = EstiloValido(local.Estilo),
                OrigemLocalId = local.IdLocal,
                CriadaEm = ParaUtc(local.CriadaEm),
                AtualizadaEm = ParaUtc(local.AtualizadaEm),
                Mensagens = ParaEntidades(id, local.Mensagens),
            });
            importadas++;
        }

        await _db.SaveChangesAsync();
        return Ok(new ImportacaoResponse(importadas, request.Conversas.Count - importadas));
    }

    private static List<Mensagem> ParaEntidades(Guid conversaId, List<MensagemDto> mensagens) =>
        mensagens.Select((m, i) => new Mensagem
        {
            Id = Guid.NewGuid(),
            ConversaId = conversaId,
            Ordem = i,
            Autor = m.Autor,
            Texto = m.Texto,
            Anexo = m.Anexo,
            Erro = m.Erro,
            Sugestoes = (m.Sugestoes ?? new List<string>()).Take(3).ToList(),
        }).ToList();

    private static ConversaResponse ParaResposta(Conversa c) => new(
        c.Id,
        c.Materia,
        c.Estilo,
        c.CriadaEm,
        c.AtualizadaEm,
        c.Mensagens
            .OrderBy(m => m.Ordem)
            .Select(m => new MensagemDto(m.Autor, m.Texto, m.Anexo, m.Erro, m.Sugestoes))
            .ToList());

    private static string EstiloValido(string? estilo) =>
        estilo is "direto" or "equilibrado" or "detalhado" ? estilo! : EstiloPadrao;

    // O PostgreSQL guarda datas em UTC; datas sem fuso vindas do navegador são tratadas como UTC
    private static DateTime ParaUtc(DateTime data) =>
        data.Kind == DateTimeKind.Utc ? data : DateTime.SpecifyKind(data.ToUniversalTime(), DateTimeKind.Utc);
}
