using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EstudAI.Api.Migrations
{
    /// <inheritdoc />
    public partial class CriarTabelaNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Notes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Materia = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Texto = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    CriadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AtualizadaEm = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Notes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Notes_UserId_Materia",
                table: "Notes",
                columns: new[] { "UserId", "Materia" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Notes");
        }
    }
}
