import type { Buyer, Receipt } from '@/lib/types'

export const demoBuyers: Omit<Buyer, 'id'>[] = [
  { name: 'Carlos', color: '#3b82f6' },
  { name: 'Maria', color: '#10b981' },
  { name: 'Juan', color: '#f59e0b' },
]

export const demoReceipt: Omit<Receipt, 'id' | 'createdAt'> = {
  storeName: 'HIPERMAXI S.A.',
  date: '23/02/2026',
  items: [
    {
      id: 'demo-1',
      name: 'LECHE DE SOYA SABO',
      quantity: 1,
      price: 7.70,
      confidence: 0.95,
      assignments: [],
    },
    {
      id: 'demo-2',
      name: 'LECHE SABORIZADA D',
      quantity: 1,
      price: 7.70,
      confidence: 0.92,
      assignments: [],
    },
    {
      id: 'demo-3',
      name: 'GALLETA OREO SELEN',
      quantity: 1,
      price: 12.90,
      confidence: 0.88,
      assignments: [],
    },
    {
      id: 'demo-4',
      name: 'GALLETA OREO VAINI',
      quantity: 1,
      price: 28.50,
      confidence: 0.94,
      assignments: [],
    },
    {
      id: 'demo-5',
      name: 'GALLETA PRINCESA R',
      quantity: 1,
      price: 6.50,
      confidence: 0.91,
      assignments: [],
    },
    {
      id: 'demo-6',
      name: 'HELADO SANDWICH VA',
      quantity: 1,
      price: 6.30,
      confidence: 0.97,
      assignments: [],
    },
    {
      id: 'demo-7',
      name: 'COPA HELADA DELIZI',
      quantity: 1,
      price: 8.40,
      confidence: 0.89,
      assignments: [],
    },
    {
      id: 'demo-8',
      name: 'PUDIN CHOCOLATE PU',
      quantity: 1,
      price: 9.90,
      confidence: 0.93,
      assignments: [],
    },
    {
      id: 'demo-9',
      name: 'HELADO VASITO D/CR',
      quantity: 1,
      price: 1.90,
      confidence: 0.90,
      assignments: [],
    },
  ],
  subtotal: 89.80,
  tax: 0,
  total: 89.80,
}
