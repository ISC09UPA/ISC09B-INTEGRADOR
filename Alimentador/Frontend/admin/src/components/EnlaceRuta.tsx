import type { MouseEvent, ReactNode } from 'react';
import { Link } from '@fluentui/react-components';
import type { LinkProps } from '@fluentui/react-components';
import { useHref, useLinkClickHandler } from 'react-router';

interface Props {
  to: string;
  children: ReactNode;
  className?: string;
  appearance?: LinkProps['appearance'];
}

/** Link de Fluent que navega con React Router conservando el href real (clic central, copiar enlace). */
export function EnlaceRuta({ to, children, className, appearance }: Props) {
  const href = useHref(to);
  const manejar = useLinkClickHandler<HTMLAnchorElement>(to);
  return (
    <Link
      href={href}
      className={className}
      appearance={appearance}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => manejar(e)}
    >
      {children}
    </Link>
  );
}
