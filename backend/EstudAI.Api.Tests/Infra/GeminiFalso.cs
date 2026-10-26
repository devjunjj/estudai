using System.Net;
using System.Text;

namespace EstudAI.Api.Tests.Infra;

// Finge ser o Gemini nos testes: devolve a resposta configurada
// e guarda o último pedido recebido para o teste conferir.
public class GeminiFalso : HttpMessageHandler
{
    public HttpStatusCode Status { get; set; } = HttpStatusCode.OK;
    public string Resposta { get; set; } =
        """{"candidates":[{"content":{"parts":[{"text":"Resposta da IA de teste"}]}}]}""";
    public bool Falhar { get; set; }

    public string? UltimoCorpo { get; private set; }
    public string? UltimaChave { get; private set; }
    public Uri? UltimaUrl { get; private set; }

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (Falhar) throw new HttpRequestException("sem conexão");

        UltimaUrl = request.RequestUri;
        UltimaChave = request.Headers.TryGetValues("x-goog-api-key", out var valores) ? valores.Single() : null;
        UltimoCorpo = request.Content is null ? null : await request.Content.ReadAsStringAsync(cancellationToken);

        return new HttpResponseMessage(Status)
        {
            Content = new StringContent(Resposta, Encoding.UTF8, "application/json"),
        };
    }
}
