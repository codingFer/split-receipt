import { AppProvider } from '@/components/app-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppProvider>{children}</AppProvider>;
}
