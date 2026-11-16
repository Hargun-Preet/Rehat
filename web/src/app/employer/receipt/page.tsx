import { loadJSON } from "@/lib/data";
import { productPlan } from "@/lib/product";
import { loadProduct } from "@/lib/product.server";

import ReceiptView, { type ReceiptIndex } from "./ReceiptView";

type ReceiptPageProps = {
  searchParams: Promise<{ month?: string }>;
};

export default async function ReceiptPage({ searchParams }: ReceiptPageProps) {
  const [index, product, params] = await Promise.all([
    loadJSON<ReceiptIndex[]>("receipts_index.json"),
    loadProduct(),
    searchParams,
  ]);
  const demoReceipts = index.filter((receipt) => receipt.firm === product.demo_firm.name);
  const requestedMonth = params.month && demoReceipts.some((receipt) => receipt.month === params.month)
    ? params.month
    : undefined;
  const plan = productPlan(product);

  return (
    <ReceiptView
      index={demoReceipts}
      defaultMonth={requestedMonth ?? product.demo_clock.month}
      firm={product.demo_firm}
      benefit={product.product.benefit_per_worker_hour}
      planName={plan.name}
      deductibleLabel={plan.deductible_label}
      translationBadge={product.copy.translation_badge}
    />
  );
}
