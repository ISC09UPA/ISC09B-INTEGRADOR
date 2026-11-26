namespace AlmacenInteligente.Application.DTOs;

// Respuesta de POST /api/productos/identificar (contrato 3.5).
//   encontrado: true si alguna etiqueta de la foto coincide con la etiquetaVision de un producto activo.
//   confianza:  de 0 a 1 (la de la etiqueta que coincidió, o la más alta si no hubo coincidencia).
//   etiqueta:   la etiqueta que coincidió, o la más probable de la foto.
//   producto:   el producto reconocido, o null.
//   imagenUrl:  URL de la foto en Blob Storage; se manda tal cual a /productos/desde-foto.
public record IdentificacionDto(bool Encontrado, double Confianza, string? Etiqueta, ProductoDto? Producto, string ImagenUrl);

// Cuerpo de POST /api/productos/desde-foto. El producto queda sin espacio (ubicacion: null).
public record CrearDesdeFotoDto(string ImagenUrl, string Nombre, int PesoUnitarioGramos, int PuntoReorden, string? Descripcion);
