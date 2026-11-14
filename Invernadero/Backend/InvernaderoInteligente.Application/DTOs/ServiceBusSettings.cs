public class ServiceBusSettings
{
    public string LecturasConnectionString { get; set; } = string.Empty;
    public string ComandosConnectionString { get; set; } = string.Empty;
    public string ColaLecturas { get; set; } = "lecturas";
    public string ColaComandos { get; set; } = "comando";
}
