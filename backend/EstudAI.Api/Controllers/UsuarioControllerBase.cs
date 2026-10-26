using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EstudAI.Api.Controllers;

// Base dos controllers que trabalham com dados do aluno logado.
[ApiController]
[Authorize] // sem token válido, todos os endpoints respondem 401
public abstract class UsuarioControllerBase : ControllerBase
{
    // Id do usuário logado, lido do token JWT (claim "sub").
    // Como vem do token assinado, o cliente não consegue se passar por outra pessoa.
    protected string UserId => User.FindFirst("sub")?.Value
        ?? throw new UnauthorizedAccessException("Token sem identificação de usuário.");
}
