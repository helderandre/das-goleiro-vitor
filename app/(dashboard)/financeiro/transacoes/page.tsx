import { MobileTransactionList } from "@/components/mobile/finance/transaction-list"
import { getFinanceTransactions } from "../mobile-finance-data"

export default async function TransacoesPage() {
  const { transactions, today } = await getFinanceTransactions()

  return (
    <div className="mx-auto w-full max-w-md">
      <MobileTransactionList transactions={transactions} today={today} />
    </div>
  )
}
