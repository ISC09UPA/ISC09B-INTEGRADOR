using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace AlimentadorInteligente.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ArtefactosOta",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Version = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    BlobNombre = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Sha256 = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    TamanoBytes = table.Column<long>(type: "bigint", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ArtefactosOta", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Gateways",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    DeviceId = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    DeviceKeyHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    UltimoHeartbeat = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    SinConexionDesde = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AlertaSinConexionEnviada = table.Column<bool>(type: "boolean", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Gateways", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Usuarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    PasswordHash = table.Column<string>(type: "text", nullable: false),
                    ExpoPushToken = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Usuarios", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Alimentadores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Codigo = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Nombre = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    KcalPorGramo = table.Column<double>(type: "double precision", nullable: false),
                    IntervaloMinimoHoras = table.Column<int>(type: "integer", nullable: false),
                    VersionConfiguracion = table.Column<int>(type: "integer", nullable: false),
                    EnLinea = table.Column<bool>(type: "boolean", nullable: false),
                    NivelTolvaPorcentaje = table.Column<double>(type: "double precision", nullable: true),
                    PesoPlatoG = table.Column<double>(type: "double precision", nullable: true),
                    VersionFirmware = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    VersionModelo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    UltimoEstado = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AlertaSinConexionEnviada = table.Column<bool>(type: "boolean", nullable: false),
                    GatewayId = table.Column<int>(type: "integer", nullable: true),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alimentadores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Alimentadores_Gateways_GatewayId",
                        column: x => x.GatewayId,
                        principalTable: "Gateways",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "RefreshTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ExpiraEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    RevocadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefreshTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RefreshTokens_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Comandos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    SolicitadoPorId = table.Column<int>(type: "integer", nullable: true),
                    Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Estado = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    MascotaId = table.Column<int>(type: "integer", nullable: true),
                    Gramos = table.Column<double>(type: "double precision", nullable: true),
                    ArtefactoOtaId = table.Column<int>(type: "integer", nullable: true),
                    EntregadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CompletadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    DispensadoG = table.Column<double>(type: "double precision", nullable: true),
                    Error = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Comandos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Comandos_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Comandos_ArtefactosOta_ArtefactoOtaId",
                        column: x => x.ArtefactoOtaId,
                        principalTable: "ArtefactosOta",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_Comandos_Usuarios_SolicitadoPorId",
                        column: x => x.SolicitadoPorId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Eventos",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    OcurridoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Detalle = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Eventos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Eventos_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "FotosDudosas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    BlobNombre = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ClasePredicha = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Confianza = table.Column<double>(type: "double precision", nullable: false),
                    TomadaEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Subida = table.Column<bool>(type: "boolean", nullable: false),
                    ClaseRevisada = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FotosDudosas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FotosDudosas_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Mascotas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    Nombre = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Especie = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PesoKg = table.Column<double>(type: "double precision", nullable: false),
                    EdadMeses = table.Column<int>(type: "integer", nullable: false),
                    NivelActividad = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Esterilizado = table.Column<bool>(type: "boolean", nullable: false),
                    ComidasPorDia = table.Column<int>(type: "integer", nullable: false),
                    EtiquetaRfid = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    AjustePorcentaje = table.Column<double>(type: "double precision", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Mascotas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Mascotas_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "MiembrosAlimentador",
                columns: table => new
                {
                    UsuarioId = table.Column<int>(type: "integer", nullable: false),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    Rol = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MiembrosAlimentador", x => new { x.AlimentadorId, x.UsuarioId });
                    table.ForeignKey(
                        name: "FK_MiembrosAlimentador_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MiembrosAlimentador_Usuarios_UsuarioId",
                        column: x => x.UsuarioId,
                        principalTable: "Usuarios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "AjustesRacion",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MascotaId = table.Column<int>(type: "integer", nullable: false),
                    Dia = table.Column<DateOnly>(type: "date", nullable: false),
                    AjusteAnterior = table.Column<double>(type: "double precision", nullable: false),
                    AjusteNuevo = table.Column<double>(type: "double precision", nullable: false),
                    Motivo = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AjustesRacion", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AjustesRacion_Mascotas_MascotaId",
                        column: x => x.MascotaId,
                        principalTable: "Mascotas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Alertas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    MascotaId = table.Column<int>(type: "integer", nullable: true),
                    Tipo = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Mensaje = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    OcurridaEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Leida = table.Column<bool>(type: "boolean", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Alertas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Alertas_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Alertas_Mascotas_MascotaId",
                        column: x => x.MascotaId,
                        principalTable: "Mascotas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "Horarios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    MascotaId = table.Column<int>(type: "integer", nullable: true),
                    Hora = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    Activo = table.Column<bool>(type: "boolean", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Horarios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Horarios_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Horarios_Mascotas_MascotaId",
                        column: x => x.MascotaId,
                        principalTable: "Mascotas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Visitas",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    EventId = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    AlimentadorId = table.Column<int>(type: "integer", nullable: false),
                    MascotaId = table.Column<int>(type: "integer", nullable: true),
                    Clase = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Confianza = table.Column<double>(type: "double precision", nullable: false),
                    IniciadaEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    TerminadaEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PlatoAntesG = table.Column<double>(type: "double precision", nullable: false),
                    DispensadoG = table.Column<double>(type: "double precision", nullable: false),
                    PlatoDespuesG = table.Column<double>(type: "double precision", nullable: false),
                    ConsumidoG = table.Column<double>(type: "double precision", nullable: false),
                    CreadoEn = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Visitas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Visitas_Alimentadores_AlimentadorId",
                        column: x => x.AlimentadorId,
                        principalTable: "Alimentadores",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Visitas_Mascotas_MascotaId",
                        column: x => x.MascotaId,
                        principalTable: "Mascotas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AjustesRacion_MascotaId_Dia",
                table: "AjustesRacion",
                columns: new[] { "MascotaId", "Dia" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_AlimentadorId_OcurridaEn",
                table: "Alertas",
                columns: new[] { "AlimentadorId", "OcurridaEn" });

            migrationBuilder.CreateIndex(
                name: "IX_Alertas_MascotaId",
                table: "Alertas",
                column: "MascotaId");

            migrationBuilder.CreateIndex(
                name: "IX_Alimentadores_Codigo",
                table: "Alimentadores",
                column: "Codigo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Alimentadores_GatewayId",
                table: "Alimentadores",
                column: "GatewayId");

            migrationBuilder.CreateIndex(
                name: "IX_ArtefactosOta_Tipo_Version",
                table: "ArtefactosOta",
                columns: new[] { "Tipo", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Comandos_AlimentadorId_Estado",
                table: "Comandos",
                columns: new[] { "AlimentadorId", "Estado" });

            migrationBuilder.CreateIndex(
                name: "IX_Comandos_ArtefactoOtaId",
                table: "Comandos",
                column: "ArtefactoOtaId");

            migrationBuilder.CreateIndex(
                name: "IX_Comandos_SolicitadoPorId",
                table: "Comandos",
                column: "SolicitadoPorId");

            migrationBuilder.CreateIndex(
                name: "IX_Eventos_AlimentadorId_EventId",
                table: "Eventos",
                columns: new[] { "AlimentadorId", "EventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FotosDudosas_AlimentadorId_EventId",
                table: "FotosDudosas",
                columns: new[] { "AlimentadorId", "EventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Gateways_DeviceId",
                table: "Gateways",
                column: "DeviceId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Horarios_AlimentadorId",
                table: "Horarios",
                column: "AlimentadorId");

            migrationBuilder.CreateIndex(
                name: "IX_Horarios_MascotaId",
                table: "Horarios",
                column: "MascotaId");

            migrationBuilder.CreateIndex(
                name: "IX_Mascotas_AlimentadorId_EtiquetaRfid",
                table: "Mascotas",
                columns: new[] { "AlimentadorId", "EtiquetaRfid" },
                unique: true,
                filter: "\"EtiquetaRfid\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_MiembrosAlimentador_UsuarioId",
                table: "MiembrosAlimentador",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_TokenHash",
                table: "RefreshTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefreshTokens_UsuarioId",
                table: "RefreshTokens",
                column: "UsuarioId");

            migrationBuilder.CreateIndex(
                name: "IX_Usuarios_Email",
                table: "Usuarios",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Visitas_AlimentadorId_EventId",
                table: "Visitas",
                columns: new[] { "AlimentadorId", "EventId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Visitas_MascotaId_IniciadaEn",
                table: "Visitas",
                columns: new[] { "MascotaId", "IniciadaEn" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AjustesRacion");

            migrationBuilder.DropTable(
                name: "Alertas");

            migrationBuilder.DropTable(
                name: "Comandos");

            migrationBuilder.DropTable(
                name: "Eventos");

            migrationBuilder.DropTable(
                name: "FotosDudosas");

            migrationBuilder.DropTable(
                name: "Horarios");

            migrationBuilder.DropTable(
                name: "MiembrosAlimentador");

            migrationBuilder.DropTable(
                name: "RefreshTokens");

            migrationBuilder.DropTable(
                name: "Visitas");

            migrationBuilder.DropTable(
                name: "ArtefactosOta");

            migrationBuilder.DropTable(
                name: "Usuarios");

            migrationBuilder.DropTable(
                name: "Mascotas");

            migrationBuilder.DropTable(
                name: "Alimentadores");

            migrationBuilder.DropTable(
                name: "Gateways");
        }
    }
}
