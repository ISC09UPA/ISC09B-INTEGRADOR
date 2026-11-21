export type Registro = { mensaje: string; hora: string };

export type Clima = Record<string, { temp: number; hum: number }>;

export type Panel = {
  seguridad: boolean;
  puerta: boolean;
  lux: number;
  luces: Record<string, boolean>;
  clima: Clima;
  raspberry: boolean;
};

export type Foto = {
  nombre: string;
  url: string;
  hora: string;
  resultado: string;
  zona: string;
  etiqueta: string;
};

export type EstadoServicios = {
  baseDeDatos: string;
  customVision: boolean;
  blob: boolean;
  correo: boolean;
  mapas: boolean;
  raspberry: boolean;
};

export type Prueba = { ok: boolean; mensaje: string };

export type Diagnostico = {
  customVision: Prueba;
  blob: Prueba;
  correo: Prueba;
  mapas: Prueba;
  raspberry: Prueba;
};

export type TipoEvento = 'ok' | 'mov' | 'warn';

export type Verificacion = {
  nombre: string;
  probabilidad: number;
  umbral: number;
  autorizado: boolean;
};
