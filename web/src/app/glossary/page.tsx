import { BookOpen, CircleHelp } from "lucide-react";

import { IconTile, PageHeader, Section } from "@/components/brand";
import { loadProduct } from "@/lib/product.server";

export default async function GlossaryPage() {
  const product = await loadProduct();

  return (
    <>
      <PageHeader eyebrow="Plain-language terms" title="The terms behind your cover" icon={BookOpen}>
        Short definitions for the words you see in your quote, receipt and worker notice.
      </PageHeader>
      <Section className="pb-14">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {product.glossary.map((item) => (
            <article key={item.term} className="product-card p-5">
              <div className="flex items-start gap-3">
                <IconTile icon={CircleHelp} tone="blue" size="sm" />
                <div>
                  <h2 className="font-heading text-lg font-bold text-ink">{item.term}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.plain}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Section>
    </>
  );
}
