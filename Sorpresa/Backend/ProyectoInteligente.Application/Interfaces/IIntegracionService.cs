using ProyectoInteligente.Domain.Entities;

namespace ProyectoInteligente.Application.Interfaces;

public interface IIntegracionService
{
    void GuardarEnDbSql(ResumenDeteccion datos);
    void EnviarAAppMovil(ResumenDeteccion datos);
}
