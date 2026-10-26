using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstudAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class SincronizarDados : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Conversas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Materia = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Estilo = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    OrigemLocalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CriadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Conversas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "DiasEstudo",
                columns: table => new
                {
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Dia = table.Column<DateOnly>(type: "date", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DiasEstudo", x => new { x.UserId, x.Dia });
                });

            migrationBuilder.CreateTable(
                name: "ResultadosExercicios",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Materia = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Data = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Total = table.Column<int>(type: "integer", nullable: false),
                    Acertos = table.Column<int>(type: "integer", nullable: false),
                    Percentual = table.Column<int>(type: "integer", nullable: false),
                    TopicosErrados = table.Column<string>(type: "text", nullable: false),
                    OrigemLocalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResultadosExercicios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Mensagens",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ConversaId = table.Column<Guid>(type: "uuid", nullable: false),
                    Ordem = table.Column<int>(type: "integer", nullable: false),
                    Autor = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    Texto = table.Column<string>(type: "text", nullable: false),
                    Anexo = table.Column<bool>(type: "boolean", nullable: false),
                    Erro = table.Column<bool>(type: "boolean", nullable: false),
                    Sugestoes = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mensagens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Mensagens_Conversas_ConversaId",
                        column: x => x.ConversaId,
                        principalTable: "Conversas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Conversas_UserId_AtualizadaEm",
                table: "Conversas",
                columns: new[] { "UserId", "AtualizadaEm" });

            migrationBuilder.CreateIndex(
                name: "IX_Conversas_UserId_OrigemLocalId",
                table: "Conversas",
                columns: new[] { "UserId", "OrigemLocalId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Mensagens_ConversaId_Ordem",
                table: "Mensagens",
                columns: new[] { "ConversaId", "Ordem" });

            migrationBuilder.CreateIndex(
                name: "IX_ResultadosExercicios_UserId_Materia",
                table: "ResultadosExercicios",
                columns: new[] { "UserId", "Materia" });

            migrationBuilder.CreateIndex(
                name: "IX_ResultadosExercicios_UserId_OrigemLocalId",
                table: "ResultadosExercicios",
                columns: new[] { "UserId", "OrigemLocalId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DiasEstudo");

            migrationBuilder.DropTable(
                name: "Mensagens");

            migrationBuilder.DropTable(
                name: "ResultadosExercicios");

            migrationBuilder.DropTable(
                name: "Conversas");
        }
    }
}
