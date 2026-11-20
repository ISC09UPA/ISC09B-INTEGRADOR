using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoInteligente.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AuthIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_turnos_consultorio_id",
                table: "turnos");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_consultorio_id_estado_llegada_en",
                table: "turnos",
                columns: new[] { "consultorio_id", "estado", "llegada_en" });

            migrationBuilder.CreateIndex(
                name: "IX_alertas_leida",
                table: "alertas",
                column: "leida");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_turnos_consultorio_id_estado_llegada_en",
                table: "turnos");

            migrationBuilder.DropIndex(
                name: "IX_alertas_leida",
                table: "alertas");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_consultorio_id",
                table: "turnos",
                column: "consultorio_id");
        }
    }
}
