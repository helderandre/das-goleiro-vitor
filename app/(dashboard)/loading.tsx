/**
 * Esqueleto enquanto a tela carrega: no formato de uma lista do app, em vez
 * de spinner na tela inteira.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Carregando" className="flex animate-pulse flex-col gap-5 pt-4 md:pt-0">
      <div className="flex flex-col gap-2">
        <span className="h-3 w-32 rounded-md bg-muted" />
        <span className="h-8 w-44 rounded-lg bg-muted" />
      </div>
      <span className="h-[46px] rounded-[14px] bg-muted/70" />
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5">
            <span className="size-11 shrink-0 rounded-full bg-muted" />
            <span className="flex grow flex-col gap-2">
              <span className="h-3.5 w-3/5 rounded-md bg-muted" />
              <span className="h-2.5 w-2/5 rounded-md bg-muted" />
            </span>
            <span className="h-3.5 w-14 rounded-md bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
