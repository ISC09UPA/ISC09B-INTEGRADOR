import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import {
  Button,
  Caption1,
  Card,
  Field,
  Input,
  makeStyles,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Spinner,
  Subtitle1,
  Body1,
  tokens,
} from '@fluentui/react-components';
import { ErrorCircleFilled, WarningRegular } from '@fluentui/react-icons';
import { mensajeDeError, MODO_DEMO } from '../api/cliente';
import { NoEsAdministradorError, useAuth } from '../auth/AuthContext';

const useEstilos = makeStyles({
  raiz: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    padding: tokens.spacingHorizontalXXL,
    rowGap: tokens.spacingVerticalL,
  },
  marca: { display: 'flex', alignItems: 'center', columnGap: tokens.spacingHorizontalM },
  logo: { width: '40px', height: '40px', flexShrink: 0 },
  titulos: { display: 'flex', flexDirection: 'column' },
  titulo: { margin: 0 },
  subtitulo: { color: tokens.colorNeutralForeground2 },
  formulario: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalL },
  cuerpoMensaje: { display: 'flex', flexDirection: 'column', rowGap: tokens.spacingVerticalXXS },
  pie: { color: tokens.colorNeutralForeground3, textAlign: 'center' },
});

export function LoginPage() {
  const s = useEstilos();
  const { sesion, avisoCierre, iniciarSesion } = useAuth();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const desde = (ubicacion.state as { desde?: string } | null)?.desde ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ titulo: string; mensaje: string; aviso?: boolean } | null>(null);
  const [intentado, setIntentado] = useState(false);
  const refEmail = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = 'Iniciar sesión · Alimentador';
    refEmail.current?.focus();
  }, []);

  if (sesion) return <Navigate to={desde} replace />;

  const emailInvalido = intentado && !/^\S+@\S+\.\S+$/.test(email.trim());
  const passwordVacia = intentado && password.length === 0;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setIntentado(true);
    if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion(email.trim(), password);
      navegar(desde, { replace: true });
    } catch (err) {
      if (err instanceof NoEsAdministradorError) {
        setError({ titulo: 'Sin acceso al panel', mensaje: err.message, aviso: true });
      } else {
        setError({ titulo: 'No se pudo iniciar sesión', mensaje: mensajeDeError(err) });
      }
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className={s.raiz}>
      <Card className={s.card} size="large">
        <div className={s.marca}>
          <img src="/favicon.svg" alt="" className={s.logo} />
          <div className={s.titulos}>
            <Subtitle1 as="h1" className={s.titulo}>
              Alimentador · Administración
            </Subtitle1>
            <Body1 className={s.subtitulo}>Inicia sesión con tu cuenta de administrador.</Body1>
          </div>
        </div>

        {avisoCierre && !error && (
          <MessageBar intent="warning" icon={<WarningRegular />} layout="multiline">
            <MessageBarBody>{avisoCierre}</MessageBarBody>
          </MessageBar>
        )}
        {error && (
          <MessageBar
            intent={error.aviso ? 'warning' : 'error'}
            icon={error.aviso ? <WarningRegular /> : <ErrorCircleFilled />}
            layout="multiline"
          >
            <MessageBarBody className={s.cuerpoMensaje}>
              <MessageBarTitle>{error.titulo}</MessageBarTitle>
              {error.mensaje}
            </MessageBarBody>
          </MessageBar>
        )}
        {MODO_DEMO && (
          <MessageBar intent="info" layout="multiline">
            <MessageBarBody className={s.cuerpoMensaje}>
              <MessageBarTitle>Modo demo</MessageBarTitle>
              Usa admin@demo.mx con la contraseña demo1234. Para ver el rechazo, prueba con ana@demo.mx.
            </MessageBarBody>
          </MessageBar>
        )}

        <form className={s.formulario} onSubmit={enviar} noValidate>
          <Field
            label="Correo electrónico"
            required
            validationState={emailInvalido ? 'error' : 'none'}
            validationMessage={emailInvalido ? 'Escribe un correo válido.' : undefined}
          >
            <Input
              ref={refEmail}
              type="email"
              autoComplete="username"
              value={email}
              onChange={(_, d) => setEmail(d.value)}
              disabled={enviando}
            />
          </Field>
          <Field
            label="Contraseña"
            required
            validationState={passwordVacia ? 'error' : 'none'}
            validationMessage={passwordVacia ? 'Escribe tu contraseña.' : undefined}
          >
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(_, d) => setPassword(d.value)}
              disabled={enviando}
            />
          </Field>
          <Button
            type="submit"
            appearance="primary"
            disabled={enviando}
            icon={enviando ? <Spinner size="tiny" /> : undefined}
          >
            {enviando ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </Button>
        </form>
        <Caption1 className={s.pie}>Solo para el equipo que administra los alimentadores.</Caption1>
      </Card>
    </main>
  );
}
