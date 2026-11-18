import { Dropdown, Field, Option } from '@fluentui/react-components';

export interface OpcionFiltro {
  valor: string;
  texto: string;
}

interface Props {
  etiqueta: string;
  valor: string;
  opciones: OpcionFiltro[];
  onCambiar: (valor: string) => void;
  className?: string;
  disabled?: boolean;
}

/** Filtro de selección única con etiqueta visible (Field + Dropdown). */
export function FiltroOpciones({ etiqueta, valor, opciones, onCambiar, className, disabled }: Props) {
  const seleccionada = opciones.find((o) => o.valor === valor) ?? opciones[0];
  return (
    <Field label={etiqueta} className={className}>
      <Dropdown
        value={seleccionada?.texto ?? ''}
        selectedOptions={seleccionada ? [seleccionada.valor] : []}
        onOptionSelect={(_, d) => d.optionValue !== undefined && onCambiar(d.optionValue)}
        disabled={disabled}
        positioning={{ autoSize: true }}
      >
        {opciones.map((o) => (
          <Option key={o.valor} value={o.valor}>
            {o.texto}
          </Option>
        ))}
      </Dropdown>
    </Field>
  );
}
