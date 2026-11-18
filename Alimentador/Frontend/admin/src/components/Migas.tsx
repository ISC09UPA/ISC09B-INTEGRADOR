import { Fragment } from 'react';
import type { MouseEvent } from 'react';
import { useHref, useNavigate } from 'react-router';
import { Breadcrumb, BreadcrumbButton, BreadcrumbDivider, BreadcrumbItem } from '@fluentui/react-components';

interface Miga {
  texto: string;
  ruta: string;
}

function BotonMiga({ miga, actual }: { miga: Miga; actual: boolean }) {
  const href = useHref(miga.ruta);
  const navegar = useNavigate();
  return (
    <BreadcrumbButton
      href={href}
      current={actual}
      onClick={(e: MouseEvent<HTMLElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        if (!actual) navegar(miga.ruta);
      }}
    >
      {miga.texto}
    </BreadcrumbButton>
  );
}

/** Ruta de navegación (Breadcrumb) con enlaces reales que navegan con React Router. */
export function Migas({ migas }: { migas: Miga[] }) {
  return (
    <Breadcrumb aria-label="Ruta de navegación" size="small">
      {migas.map((m, i) => (
        <Fragment key={m.ruta}>
          {i > 0 && <BreadcrumbDivider />}
          <BreadcrumbItem>
            <BotonMiga miga={m} actual={i === migas.length - 1} />
          </BreadcrumbItem>
        </Fragment>
      ))}
    </Breadcrumb>
  );
}
