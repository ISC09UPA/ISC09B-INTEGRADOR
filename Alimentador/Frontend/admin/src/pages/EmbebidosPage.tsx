import { makeStyles, Tab, TabList, tokens } from '@fluentui/react-components';
import { CameraRegular, DeveloperBoardRegular, WarningRegular } from '@fluentui/react-icons';
import { Encabezado } from '../components/Encabezado';
import { CONSULTA_MOVIL, useMediaQuery } from '../hooks/useMediaQuery';
import { useParametros } from '../hooks/useParametros';
import { useTitulo } from '../hooks/useTitulo';
import { PestanaEventos } from './embebidos/PestanaEventos';
import { PestanaFotos } from './embebidos/PestanaFotos';
import { PestanaGateways } from './embebidos/PestanaGateways';

type Pestana = 'gateways' | 'eventos' | 'fotos';

const useEstilos = makeStyles({
  pestanas: { marginBottom: tokens.spacingVerticalL, overflowX: 'auto' },
});

export default function EmbebidosPage() {
  const s = useEstilos();
  const movil = useMediaQuery(CONSULTA_MOVIL);
  const { texto, cambiar } = useParametros();
  const valor = texto('pestana', 'gateways');
  const pestana: Pestana = valor === 'eventos' || valor === 'fotos' ? valor : 'gateways';
  useTitulo(pestana === 'eventos' ? 'Eventos' : pestana === 'fotos' ? 'Fotos dudosas' : 'Embebidos');

  return (
    <>
      <Encabezado
        titulo="Embebidos"
        descripcion="Raspberry Pi, sus ESP32, eventos de hardware y fotos para reentrenar el modelo."
      />
      <TabList
        className={s.pestanas}
        size={movil ? 'small' : 'medium'}
        selectedValue={pestana}
        onTabSelect={(_, d) =>
          // Al cambiar de pestaña se limpian los filtros de la anterior.
          cambiar({ pestana: d.value === 'gateways' ? null : String(d.value), alimentadorId: null, tipo: null, estado: null })
        }
      >
        <Tab id="pestana-gateways" value="gateways" icon={<DeveloperBoardRegular />}>
          Raspberry Pi
        </Tab>
        <Tab id="pestana-eventos" value="eventos" icon={<WarningRegular />}>
          Eventos
        </Tab>
        <Tab id="pestana-fotos" value="fotos" icon={<CameraRegular />}>
          Fotos dudosas
        </Tab>
      </TabList>
      <div role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'gateways' && <PestanaGateways />}
        {pestana === 'eventos' && <PestanaEventos />}
        {pestana === 'fotos' && <PestanaFotos />}
      </div>
    </>
  );
}
