using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProyectoInteligente.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class Inicial : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "configuracion",
                columns: table => new
                {
                    clave = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    valor = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_configuracion", x => x.clave);
                });

            migrationBuilder.CreateTable(
                name: "consultorios",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    nombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_consultorios", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "eventos_pendientes",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tipo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    payload = table.Column<string>(type: "nvarchar(max)", maxLength: 200, nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    enviado_en = table.Column<DateTime>(type: "datetime2", nullable: true),
                    intentos = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_eventos_pendientes", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "ocupacion_sala",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    foto_url = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    personas = table.Column<int>(type: "int", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ocupacion_sala", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    nombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "usuarios",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    nombre = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    correo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    password_hash = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    rol_id = table.Column<int>(type: "int", nullable: false),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_usuarios", x => x.id);
                    table.ForeignKey(
                        name: "FK_usuarios_roles_rol_id",
                        column: x => x.rol_id,
                        principalTable: "roles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "doctores",
                columns: table => new
                {
                    usuario_id = table.Column<int>(type: "int", nullable: false),
                    consultorio_id = table.Column<int>(type: "int", nullable: false),
                    especialidad = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_doctores", x => x.usuario_id);
                    table.ForeignKey(
                        name: "FK_doctores_consultorios_consultorio_id",
                        column: x => x.consultorio_id,
                        principalTable: "consultorios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_doctores_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "tags_rfid",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    uid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    usuario_id = table.Column<int>(type: "int", nullable: true),
                    activo = table.Column<bool>(type: "bit", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags_rfid", x => x.id);
                    table.ForeignKey(
                        name: "FK_tags_rfid_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "citas",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    paciente_id = table.Column<int>(type: "int", nullable: false),
                    doctor_id = table.Column<int>(type: "int", nullable: false),
                    consultorio_id = table.Column<int>(type: "int", nullable: false),
                    fecha_hora = table.Column<DateTime>(type: "datetime2", nullable: false),
                    estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_citas", x => x.id);
                    table.ForeignKey(
                        name: "FK_citas_consultorios_consultorio_id",
                        column: x => x.consultorio_id,
                        principalTable: "consultorios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_citas_doctores_doctor_id",
                        column: x => x.doctor_id,
                        principalTable: "doctores",
                        principalColumn: "usuario_id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_citas_usuarios_paciente_id",
                        column: x => x.paciente_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "accesos",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tag_id = table.Column<int>(type: "int", nullable: true),
                    uid_leido = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    usuario_id = table.Column<int>(type: "int", nullable: true),
                    presencia = table.Column<bool>(type: "bit", nullable: false),
                    resultado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    motivo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    creado_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    sincronizado = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_accesos", x => x.id);
                    table.ForeignKey(
                        name: "FK_accesos_tags_rfid_tag_id",
                        column: x => x.tag_id,
                        principalTable: "tags_rfid",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_accesos_usuarios_usuario_id",
                        column: x => x.usuario_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "turnos",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    codigo = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    cita_id = table.Column<int>(type: "int", nullable: true),
                    paciente_id = table.Column<int>(type: "int", nullable: false),
                    consultorio_id = table.Column<int>(type: "int", nullable: false),
                    estado = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    llegada_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()"),
                    llamado_en = table.Column<DateTime>(type: "datetime2", nullable: true),
                    inicio_consulta = table.Column<DateTime>(type: "datetime2", nullable: true),
                    fin_consulta = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_turnos", x => x.id);
                    table.ForeignKey(
                        name: "FK_turnos_citas_cita_id",
                        column: x => x.cita_id,
                        principalTable: "citas",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_turnos_consultorios_consultorio_id",
                        column: x => x.consultorio_id,
                        principalTable: "consultorios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_turnos_usuarios_paciente_id",
                        column: x => x.paciente_id,
                        principalTable: "usuarios",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "alertas",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    tipo = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    mensaje = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    acceso_id = table.Column<long>(type: "bigint", nullable: true),
                    leida = table.Column<bool>(type: "bit", nullable: false),
                    creado_en = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "GETUTCDATE()")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_alertas", x => x.id);
                    table.ForeignKey(
                        name: "FK_alertas_accesos_acceso_id",
                        column: x => x.acceso_id,
                        principalTable: "accesos",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_accesos_creado_en",
                table: "accesos",
                column: "creado_en");

            migrationBuilder.CreateIndex(
                name: "IX_accesos_tag_id",
                table: "accesos",
                column: "tag_id");

            migrationBuilder.CreateIndex(
                name: "IX_accesos_usuario_id",
                table: "accesos",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_alertas_acceso_id",
                table: "alertas",
                column: "acceso_id");

            migrationBuilder.CreateIndex(
                name: "IX_citas_consultorio_id",
                table: "citas",
                column: "consultorio_id");

            migrationBuilder.CreateIndex(
                name: "IX_citas_doctor_id",
                table: "citas",
                column: "doctor_id");

            migrationBuilder.CreateIndex(
                name: "IX_citas_paciente_id",
                table: "citas",
                column: "paciente_id");

            migrationBuilder.CreateIndex(
                name: "IX_doctores_consultorio_id",
                table: "doctores",
                column: "consultorio_id");

            migrationBuilder.CreateIndex(
                name: "IX_roles_nombre",
                table: "roles",
                column: "nombre",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tags_rfid_uid",
                table: "tags_rfid",
                column: "uid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_tags_rfid_usuario_id",
                table: "tags_rfid",
                column: "usuario_id");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_cita_id",
                table: "turnos",
                column: "cita_id");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_consultorio_id",
                table: "turnos",
                column: "consultorio_id");

            migrationBuilder.CreateIndex(
                name: "IX_turnos_paciente_id",
                table: "turnos",
                column: "paciente_id");

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_correo",
                table: "usuarios",
                column: "correo",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_usuarios_rol_id",
                table: "usuarios",
                column: "rol_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "alertas");

            migrationBuilder.DropTable(
                name: "configuracion");

            migrationBuilder.DropTable(
                name: "eventos_pendientes");

            migrationBuilder.DropTable(
                name: "ocupacion_sala");

            migrationBuilder.DropTable(
                name: "turnos");

            migrationBuilder.DropTable(
                name: "accesos");

            migrationBuilder.DropTable(
                name: "citas");

            migrationBuilder.DropTable(
                name: "tags_rfid");

            migrationBuilder.DropTable(
                name: "doctores");

            migrationBuilder.DropTable(
                name: "consultorios");

            migrationBuilder.DropTable(
                name: "usuarios");

            migrationBuilder.DropTable(
                name: "roles");
        }
    }
}
