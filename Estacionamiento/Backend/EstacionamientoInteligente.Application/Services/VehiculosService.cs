using EstacionamientoInteligente.Application.Interfaces;
using EstacionamientoInteligente.Domain.Comun;
using EstacionamientoInteligente.Domain.DAOs;
using EstacionamientoInteligente.Domain.DTOs;
using EstacionamientoInteligente.Domain.Enums;
using EstacionamientoInteligente.Domain.Models;
using EstacionamientoInteligente.Domain.ValueObjects;

namespace EstacionamientoInteligente.Application.Services;

/// <summary>Gestión de vehículos, pantalla 6 (CU-12 a CU-16). Solo administrador.</summary>
public class VehiculosService(
    IVehiculoDao vehiculos,
    IUsuarioDao usuarios,
    IAccesoDao accesos,
    IAlertaDao alertas,
    IUnidadDeTrabajo unidadDeTrabajo,
    TimeProvider reloj) : IVehiculosService
{
    public async Task<IReadOnlyList<VehiculoDto>> ListarAsync(string? textoPlaca, FiltroVehiculos filtro)
    {
        var lista = await vehiculos.BuscarAsync(textoPlaca, filtro);

        // Una sola consulta para saber quién está dentro y en qué cajón.
        // Si por un dato dañado hubiera dos abiertos del mismo vehículo, se toma el más reciente.
        var abiertos = (await accesos.ObtenerAbiertosAsync())
            .GroupBy(a => a.VehiculoId)
            .ToDictionary(g => g.Key, g => g.MaxBy(a => a.HoraEntrada)!);

        var resultado = new List<VehiculoDto>(lista.Count);
        foreach (var v in lista)
        {
            abiertos.TryGetValue(v.Id, out var abierto);
            resultado.Add(await ADtoAsync(v, abierto));
        }
        return resultado;
    }

    public async Task<VehiculoDto> DarDeAltaAsync(AltaVehiculoRequest request)
    {
        var placa = Placa.Crear(request.Placa); // 400 si no es válida

        if (await vehiculos.ObtenerPorPlacaAsync(placa) is { } existente)
            throw new ExcepcionConflicto($"Ya existe un vehículo con la placa {existente.Placa!.Valor}.");

        Usuario? dueno = null;
        if (!string.IsNullOrWhiteSpace(request.CorreoUsuario))
        {
            dueno = await usuarios.ObtenerPorCorreoAsync(Usuario.NormalizarCorreo(request.CorreoUsuario))
                ?? throw new ExcepcionNoEncontrado($"No existe un usuario con el correo {request.CorreoUsuario}.");
        }

        var vehiculo = Vehiculo.Registrar(placa, request.Tipo, Ahora(), dueno?.Id);
        vehiculos.Agregar(vehiculo);
        await unidadDeTrabajo.GuardarCambiosAsync();

        return ADto(vehiculo, abierto: null, ultimaSalida: null, dueno?.Correo);
    }

    public async Task<VehiculoDto> DarDeBajaAsync(Guid id)
    {
        var vehiculo = await ObtenerAsync(id);
        if (vehiculo.Estado == EstadoVehiculo.Baja)
            throw new ExcepcionConflicto("El vehículo ya está dado de baja.");

        vehiculo.DarDeBaja(Ahora());
        await unidadDeTrabajo.GuardarCambiosAsync();

        return await ADtoAsync(vehiculo);
    }

    public async Task<VehiculoDto> ReactivarAsync(Guid id)
    {
        var vehiculo = await ObtenerAsync(id);
        if (vehiculo.Estado == EstadoVehiculo.Alta)
            throw new ExcepcionConflicto("El vehículo ya está activo.");

        vehiculo.Reactivar();
        await unidadDeTrabajo.GuardarCambiosAsync();

        return await ADtoAsync(vehiculo);
    }

    public async Task<VehiculoDto> CorregirPlacaAsync(Guid id, CorregirPlacaRequest request, Guid administradorId)
    {
        var vehiculo = await ObtenerAsync(id);
        var placa = Placa.Crear(request.Placa); // 400 si no es válida

        var otro = await vehiculos.ObtenerPorPlacaAsync(placa);
        if (otro is not null && otro.Id != vehiculo.Id)
            throw new ExcepcionConflicto($"Ya existe otro vehículo con la placa {otro.Placa!.Valor}.");

        vehiculo.CorregirPlaca(placa);

        // Si tenía alerta de "placa no legible" pendiente, queda atendida por este administrador.
        var pendientes = await alertas.ListarAsync(soloPendientes: true);
        foreach (var alerta in pendientes.Where(a => a.Tipo == TipoAlerta.PlacaNoLegible && a.VehiculoId == vehiculo.Id))
            alerta.Atender(administradorId, Ahora());

        await unidadDeTrabajo.GuardarCambiosAsync();

        return await ADtoAsync(vehiculo);
    }

    private async Task<Vehiculo> ObtenerAsync(Guid id) =>
        await vehiculos.ObtenerPorIdAsync(id)
        ?? throw new ExcepcionNoEncontrado("No existe ese vehículo.");

    private DateTime Ahora() => reloj.GetUtcNow().UtcDateTime;

    /// <summary>Arma la tarjeta consultando si está dentro y, si no, cuándo salió por última vez.</summary>
    private async Task<VehiculoDto> ADtoAsync(Vehiculo v, Acceso? abierto = null)
    {
        abierto ??= await accesos.ObtenerAbiertoDeVehiculoAsync(v.Id);

        DateTime? ultimaSalida = null;
        if (abierto is null)
            ultimaSalida = (await accesos.ObtenerUltimoDeVehiculoAsync(v.Id))?.HoraSalida;

        return ADto(v, abierto, ultimaSalida, v.Usuario?.Correo);
    }

    private static VehiculoDto ADto(Vehiculo v, Acceso? abierto, DateTime? ultimaSalida, string? correo) =>
        new(
            v.Id,
            v.Placa?.Valor,
            v.PlacaLegible,
            v.Tipo,
            v.Estado,
            Dentro: abierto is not null,
            Cajon: abierto is { Estacionado: true } ? abierto.Cajon?.Numero : null,
            UltimaSalida: ultimaSalida,
            CorreoUsuario: correo);
}
