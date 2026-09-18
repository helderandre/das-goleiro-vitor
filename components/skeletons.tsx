import { Skeleton } from "@/components/motion"

/**
 * Esqueletos de carregamento no formato de cada tipo de tela. Ficam nos
 * loading.tsx das rotas: aparecem na hora do toque, enquanto o servidor
 * busca os dados.
 */

function Header({ action = false }: { action?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-44 rounded-lg" />
      </div>
      {action && <Skeleton className="size-11 rounded-full" />}
    </div>
  )
}

function Row() {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <Skeleton className="size-11 shrink-0 rounded-full" />
      <span className="flex grow flex-col gap-2">
        <Skeleton className="h-3.5 w-3/5" />
        <Skeleton className="h-2.5 w-2/5" />
      </span>
      <Skeleton className="h-3.5 w-14" />
    </div>
  )
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-4 md:pt-0">
      {children}
    </div>
  )
}

/** Listas: pedidos, produtos, agenda, leads, usuários, blog. */
export function ListSkeleton({ chips = true, rows = 6 }: { chips?: boolean; rows?: number }) {
  return (
    <Wrap>
      <Header action />
      <Skeleton className="h-[46px] rounded-[14px]" />
      {chips && (
        <div className="flex gap-2">
          {[64, 80, 72, 88].map((w) => (
            <Skeleton key={w} className="h-[38px] shrink-0 rounded-full" style={{ width: w }} />
          ))}
        </div>
      )}
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
        {Array.from({ length: rows }, (_, i) => (
          <Row key={i} />
        ))}
      </div>
    </Wrap>
  )
}

/** Início: saudação, período, card de receita, tarefas e atalhos. */
export function OverviewSkeleton() {
  return (
    <Wrap>
      <Header action />
      <Skeleton className="h-11 rounded-[14px]" />
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-[22px]">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-48 rounded-lg" />
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-2.5 rounded-full" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-full" />
        </div>
      </div>
      <Skeleton className="h-[76px] rounded-[20px]" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="aspect-square rounded-[20px]" />
        ))}
      </div>
    </Wrap>
  )
}

/** Financeiro: receita, KPIs e gráfico por mês. */
export function FinanceSkeleton() {
  return (
    <Wrap>
      <Header action />
      <Skeleton className="h-11 rounded-[14px]" />
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-[22px]">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-48 rounded-lg" />
        <Skeleton className="h-2.5 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[20px] border bg-card p-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-2.5 w-16" />
          </div>
        ))}
      </div>
      <div className="flex h-[210px] items-end gap-2.5 rounded-[20px] border bg-card p-4">
        {[30, 45, 25, 60, 40, 85].map((h, i) => (
          <Skeleton key={i} className="grow rounded-lg" style={{ height: `${h}%` }} />
        ))}
      </div>
    </Wrap>
  )
}

/** Detalhes (pedido, produto, evento, lead, usuário, remetente, site). */
export function DetailSkeleton({ hero = false }: { hero?: boolean }) {
  return (
    <Wrap>
      <div className="flex justify-between">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="size-11 rounded-full" />
      </div>
      {hero && <Skeleton className="h-56 rounded-[28px]" />}
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-7 w-4/5 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>
      <Skeleton className="h-28 rounded-[20px]" />
      <div className="flex flex-col divide-y overflow-hidden rounded-[20px] border bg-card">
        <Row />
        <Row />
        <Row />
      </div>
    </Wrap>
  )
}

/** Formulários (novo/editar). */
export function FormSkeleton() {
  return (
    <Wrap>
      <div className="flex items-center justify-between border-b pb-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-40 rounded-[22px]" />
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2.5">
          <Skeleton className="h-3 w-24" />
          <div className="flex flex-col gap-3 rounded-[20px] border bg-card p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </Wrap>
  )
}
