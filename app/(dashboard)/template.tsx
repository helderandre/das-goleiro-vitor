/**
 * Remonta a cada navegação: dá a animação de entrada às telas do painel
 * (ver .page-enter em globals.css).
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>
}
