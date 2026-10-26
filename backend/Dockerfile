# Imagem da API para o Render (ou qualquer nuvem com Docker).
# Etapa 1: compila e publica com o SDK do .NET 8
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY EstudAI.Api/EstudAI.Api.csproj EstudAI.Api/
RUN dotnet restore EstudAI.Api/EstudAI.Api.csproj
COPY EstudAI.Api/ EstudAI.Api/
RUN dotnet publish EstudAI.Api/EstudAI.Api.csproj -c Release -o /app --no-restore

# Etapa 2: imagem final só com o runtime (bem menor)
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
COPY --from=build /app .
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
USER app
ENTRYPOINT ["dotnet", "EstudAI.Api.dll"]
