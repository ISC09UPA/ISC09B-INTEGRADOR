using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AlimentadorInteligente.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DosTolvasYGateways : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "PesoPlatoG",
                table: "Alimentadores",
                newName: "PesoPlatoPerroG");

            migrationBuilder.RenameColumn(
                name: "NivelTolvaPorcentaje",
                table: "Alimentadores",
                newName: "PesoPlatoGatoG");

            migrationBuilder.AddColumn<bool>(
                name: "Activa",
                table: "Mascotas",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "PropietarioId",
                table: "Gateways",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "SincronizandoDesde",
                table: "Gateways",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VisitasSincronizadas",
                table: "Gateways",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "Tolva",
                table: "Eventos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Tolva",
                table: "Comandos",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "NivelTolvaGatoPorcentaje",
                table: "Alimentadores",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "NivelTolvaPerroPorcentaje",
                table: "Alimentadores",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ZonaHoraria",
                table: "Alimentadores",
                type: "character varying(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_Gateways_PropietarioId",
                table: "Gateways",
                column: "PropietarioId");

            migrationBuilder.AddForeignKey(
                name: "FK_Gateways_Usuarios_PropietarioId",
                table: "Gateways",
                column: "PropietarioId",
                principalTable: "Usuarios",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Gateways_Usuarios_PropietarioId",
                table: "Gateways");

            migrationBuilder.DropIndex(
                name: "IX_Gateways_PropietarioId",
                table: "Gateways");

            migrationBuilder.DropColumn(
                name: "Activa",
                table: "Mascotas");

            migrationBuilder.DropColumn(
                name: "PropietarioId",
                table: "Gateways");

            migrationBuilder.DropColumn(
                name: "SincronizandoDesde",
                table: "Gateways");

            migrationBuilder.DropColumn(
                name: "VisitasSincronizadas",
                table: "Gateways");

            migrationBuilder.DropColumn(
                name: "Tolva",
                table: "Eventos");

            migrationBuilder.DropColumn(
                name: "Tolva",
                table: "Comandos");

            migrationBuilder.DropColumn(
                name: "NivelTolvaGatoPorcentaje",
                table: "Alimentadores");

            migrationBuilder.DropColumn(
                name: "NivelTolvaPerroPorcentaje",
                table: "Alimentadores");

            migrationBuilder.DropColumn(
                name: "ZonaHoraria",
                table: "Alimentadores");

            migrationBuilder.RenameColumn(
                name: "PesoPlatoPerroG",
                table: "Alimentadores",
                newName: "PesoPlatoG");

            migrationBuilder.RenameColumn(
                name: "PesoPlatoGatoG",
                table: "Alimentadores",
                newName: "NivelTolvaPorcentaje");
        }
    }
}
