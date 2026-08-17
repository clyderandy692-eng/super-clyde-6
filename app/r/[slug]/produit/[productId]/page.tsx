import type { Metadata } from 'next'
import { ProductPage } from '@/components/clyde/public/product-page'
import { DEMO_BUSINESSES } from '@/lib/clyde/demo-data'

interface PageProps {
  params: Promise<{ slug: string; productId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const business = DEMO_BUSINESSES.find((item) => item.slug === slug)
  return { title: business ? `Produit — ${business.name}` : 'Produit — CLYDE' }
}

export default async function ProductRoute({ params }: PageProps) {
  const { slug, productId } = await params
  return <ProductPage slug={slug} productId={productId} />
}
