Explicaciónde infraestructura

Invernadero Inteligente

Backend en .NET con Clean Architecture.

Estructura
Backend/
├── InvernaderoInteligente.API
│   ├── Controllers/
│   ├── Properties/
│   ├── appsettings.json
│   └── Program.cs
│
├── InvernaderoInteligente.Application
│   ├── DTOs/
│   ├── Interfaces/
│   └── Services/
│
├── InvernaderoInteligente.Domain
│   └── Entities/
│
├── InvernaderoInteligente.Infrastructure
│   ├── ExternalServices/
│   └── AppDbContext.cs
│
└── InvernaderoInteligente.slnx
Dependencias entre proyectos
API → Application, Infrastructure
Infrastructure → Application, Domain
Application → Domain
Domain → (ninguno)