import { makeStyles, Tab, TabList, tokens } from '@fluentui/react-components';
import { BoxRegular, HistoryRegular, RocketRegular } from '@fluentui/react-icons';
import { BotonRuta } from '../components/BotonRuta';
import { Encabezado } from '../components/Encabezado';
import { useParametros } from '../hooks/useParametros';
import { useTitulo } from '../hooks/useTitulo';
import { PestanaArtefactos } from './ota/PestanaArtefactos';
import { PestanaDespliegues } from './ota/PestanaDespliegues';

const useEstilos = makeStyles({
  pestanas: { marginBottom: tokens.spacingVerticalL, overflowX: 'auto' },
});

export default function OtaPage() {
  const s = useEstilos();
  const { texto, cambiar } = useParametros();
  const pestana = texto('pestana') === 'despliegues' ? 'despliegues' : 'artefactos';
  useTitulo(pestana === 'despliegues' ? 'Despliegues OTA' : 'Artefactos OTA');

  return (
    <>
      <Encabezado
        titulo="Actualizaciones OTA"
        descripcion="Firmware del ESP32 y modelo de visión: publica versiones y despliégalas a los alimentadores."
        acciones={
          <BotonRuta to="/ota/desplegar" appearance="primary" icon={<RocketRegular />}>
            Lanzar despliegue
          </BotonRuta>
        }
      />
      <TabList
        className={s.pestanas}
        selectedValue={pestana}
        onTabSelect={(_, d) =>
          cambiar({ pestana: d.value === 'artefactos' ? null : String(d.value), estado: null, artefactoId: null, alimentadorId: null })
        }
      >
        <Tab id="pestana-artefactos" value="artefactos" icon={<BoxRegular />}>
          Artefactos
        </Tab>
        <Tab id="pestana-despliegues" value="despliegues" icon={<HistoryRegular />}>
          Despliegues
        </Tab>
      </TabList>
      <div role="tabpanel" aria-labelledby={`pestana-${pestana}`}>
        {pestana === 'artefactos' ? <PestanaArtefactos /> : <PestanaDespliegues />}
      </div>
    </>
  );
}
