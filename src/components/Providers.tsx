import { ClientProviders } from './ClientProviders';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <ClientProviders>{children}</ClientProviders>;
}
