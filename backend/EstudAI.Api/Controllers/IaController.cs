using System.Net.Http.Json;
using System.Text.Json;
using EstudAI.Api.Dtos;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace EstudAI.Api.Controllers;

// Ponte segura entre o frontend e o Gemini:
// - só usuários logados (JWT) podem usar
// - cada usuário tem limite de pedidos por minuto
// - a chave da IA fica no servidor
[ApiController]
[Route("api/ia")]
[Authorize]
[EnableRateLimiting("ia")]
public class IaController : ControllerBase
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuracao;
    private readonly ILogger<IaController> _logger;

    public IaController(IHttpClientFactory httpClientFactory, IConfiguration configuracao, ILogger<IaController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuracao = configuracao;
        _logger = logger;
    }

    // POST api/ia/gerar
    [HttpPost("gerar")]
    [RequestSizeLimit(20_000_000)] // áudios em base64 podem ser grandes
    public async Task<ActionResult<GerarRespostaResponse>> Gerar([FromBody] GerarRespostaRequest request, CancellationToken cancelamento)
    {
        var chave = _configuracao["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(chave))
        {
            _logger.LogError("Gemini:ApiKey não configurada.");
            return StatusCode(StatusCodes.Status500InternalServerError, new { mensagem = "A IA não está configurada no servidor." });
        }

        var modelo = _configuracao["Gemini:Modelo"] ?? "gemini-3.5-flash-lite";

        // Monta o corpo no formato que o Gemini espera: texto + (opcional) áudio
        var partes = new List<object> { new { text = request.Prompt } };
        if (request.Arquivo is not null)
        {
            partes.Add(new { inline_data = new { mime_type = request.Arquivo.MimeType, data = request.Arquivo.DadosBase64 } });
        }
        var corpo = new { contents = new[] { new { parts = partes } } };

        using var mensagem = new HttpRequestMessage(HttpMethod.Post, $"v1beta/models/{modelo}:generateContent")
        {
            Content = JsonContent.Create(corpo),
        };
        mensagem.Headers.Add("x-goog-api-key", chave); // a chave vai no cabeçalho, nunca na URL

        try
        {
            var cliente = _httpClientFactory.CreateClient("gemini");
            using var resposta = await cliente.SendAsync(mensagem, cancelamento);

            if (!resposta.IsSuccessStatusCode)
            {
                _logger.LogWarning("Gemini respondeu {Status}.", (int)resposta.StatusCode);
                return StatusCode(StatusCodes.Status502BadGateway, new { mensagem = "A IA não conseguiu responder agora. Tente de novo em instantes." });
            }

            using var json = await JsonDocument.ParseAsync(await resposta.Content.ReadAsStreamAsync(cancelamento), cancellationToken: cancelamento);
            var texto = ExtrairTexto(json.RootElement);
            return Ok(new GerarRespostaResponse(texto));
        }
        catch (HttpRequestException erro)
        {
            _logger.LogWarning(erro, "Falha ao contatar o Gemini.");
            return StatusCode(StatusCodes.Status502BadGateway, new { mensagem = "Não foi possível falar com a IA agora. Tente de novo em instantes." });
        }
    }

    // candidates[0].content.parts[0].text (vazio se a IA não devolver nada)
    private static string ExtrairTexto(JsonElement raiz)
    {
        if (raiz.TryGetProperty("candidates", out var candidatos) && candidatos.GetArrayLength() > 0
            && candidatos[0].TryGetProperty("content", out var conteudo)
            && conteudo.TryGetProperty("parts", out var partes) && partes.GetArrayLength() > 0
            && partes[0].TryGetProperty("text", out var texto))
        {
            return texto.GetString() ?? string.Empty;
        }
        return string.Empty;
    }
}
