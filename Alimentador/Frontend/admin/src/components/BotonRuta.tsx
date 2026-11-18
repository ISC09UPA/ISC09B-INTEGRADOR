import type { MouseEvent, ReactElement, ReactNode } from 'react';
import { Button } from '@fluentui/react-components';
import type { ButtonProps } from '@fluentui/react-components';
import { useHref, useNavigate } from 'react-router';

interface Props {
  to: string;
  children: ReactNode;
  icon?: ReactElement;
  appearance?: ButtonProps['appearance'];
  size?: ButtonProps['size'];
}

/** Enlace con aspecto de botón (navega con React Router y conserva el href real). */
export function BotonRuta({ to, children, icon, appearance, size }: Props) {
  const href = useHref(to);
  const navegar = useNavigate();
  return (
    <Button
      as="a"
      href={href}
      icon={icon}
      appearance={appearance}
      size={size}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        navegar(to);
      }}
    >
      {children}
    </Button>
  );
}
