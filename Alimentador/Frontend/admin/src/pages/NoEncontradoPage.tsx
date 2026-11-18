import { Card } from '@fluentui/react-components';
import { DocumentQuestionMarkRegular } from '@fluentui/react-icons';
import { BotonRuta } from '../components/BotonRuta';
import { Encabezado } from '../components/Encabezado';
import { EstadoVacio } from '../components/Estados';
import { useTitulo } from '../hooks/useTitulo';

export default function NoEncontradoPage() {
  useTitulo('Página no encontrada');
  return (
    <>
      <Encabezado titulo="Página no encontrada" />
      <Card>
        <EstadoVacio
          icono={<DocumentQuestionMarkRegular />}
          titulo="Esta dirección no existe"
          descripcion="Revisa el enlace o vuelve al resumen."
          accion={<BotonRuta to="/" appearance="primary">Ir al resumen</BotonRuta>}
        />
      </Card>
    </>
  );
}
