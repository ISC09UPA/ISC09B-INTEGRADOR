import { Badge } from '@fluentui/react-components';
import { BrainCircuitRegular, DeveloperBoardRegular } from '@fluentui/react-icons';
import type { TipoArtefactoOta } from '../../api/types';

export function InsigniaTipo({ tipo }: { tipo: TipoArtefactoOta }) {
  return tipo === 'Firmware' ? (
    <Badge appearance="outline" color="brand" icon={<DeveloperBoardRegular />} size="small">
      Firmware
    </Badge>
  ) : (
    <Badge appearance="outline" color="important" icon={<BrainCircuitRegular />} size="small">
      Modelo
    </Badge>
  );
}
