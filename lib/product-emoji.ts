// Map of product keywords to emojis
const emojiMap: Record<string, string> = {
  // Lacteos
  leche: '🥛',
  yogurt: '🥛',
  queso: '🧀',
  mantequilla: '🧈',
  crema: '🥛',
  
  // Helados y postres
  helado: '🍦',
  copa: '🍨',
  pudin: '🍮',
  puding: '🍮',
  flan: '🍮',
  torta: '🎂',
  pastel: '🎂',
  gelatina: '🍮',
  chocolate: '🍫',
  
  // Galletas y snacks
  galleta: '🍪',
  galletita: '🍪',
  oreo: '🍪',
  cookie: '🍪',
  chip: '🍟',
  papa: '🥔',
  papas: '🥔',
  snack: '🍿',
  palomita: '🍿',
  
  // Bebidas
  agua: '💧',
  gaseosa: '🥤',
  coca: '🥤',
  pepsi: '🥤',
  sprite: '🥤',
  fanta: '🥤',
  jugo: '🧃',
  refresco: '🥤',
  cerveza: '🍺',
  vino: '🍷',
  cafe: '☕',
  te: '🍵',
  
  // Carnes
  carne: '🥩',
  pollo: '🍗',
  res: '🥩',
  cerdo: '🥓',
  jamon: '🥓',
  salchicha: '🌭',
  chorizo: '🌭',
  tocino: '🥓',
  pescado: '🐟',
  atun: '🐟',
  
  // Panaderia
  pan: '🍞',
  baguette: '🥖',
  croissant: '🥐',
  dona: '🍩',
  
  // Frutas
  manzana: '🍎',
  banana: '🍌',
  platano: '🍌',
  naranja: '🍊',
  limon: '🍋',
  uva: '🍇',
  fresa: '🍓',
  sandia: '🍉',
  melon: '🍈',
  pina: '🍍',
  mango: '🥭',
  durazno: '🍑',
  pera: '🍐',
  fruta: '🍎',
  
  // Verduras
  tomate: '🍅',
  zanahoria: '🥕',
  brocoli: '🥦',
  lechuga: '🥬',
  cebolla: '🧅',
  ajo: '🧄',
  papa: '🥔',
  verdura: '🥬',
  ensalada: '🥗',
  
  // Granos y cereales
  arroz: '🍚',
  fideo: '🍝',
  pasta: '🍝',
  cereal: '🥣',
  avena: '🥣',
  
  // Huevos
  huevo: '🥚',
  
  // Condimentos
  aceite: '🫒',
  sal: '🧂',
  azucar: '🍬',
  mayonesa: '🥫',
  ketchup: '🥫',
  salsa: '🥫',
  mostaza: '🥫',
  
  // Comidas preparadas
  pizza: '🍕',
  hamburguesa: '🍔',
  sandwich: '🥪',
  sanduich: '🥪',
  taco: '🌮',
  empanada: '🥟',
  sopa: '🍲',
  
  // Limpieza
  jabon: '🧼',
  detergente: '🧴',
  shampoo: '🧴',
  papel: '🧻',
  
  // Default
  default: '📦'
}

export function getProductEmoji(productName: string): string {
  const nameLower = productName.toLowerCase()
  
  // Check each word in the product name
  const words = nameLower.split(/\s+/)
  
  for (const word of words) {
    // Direct match
    if (emojiMap[word]) {
      return emojiMap[word]
    }
    
    // Partial match (for variations like "galletas" matching "galleta")
    for (const [key, emoji] of Object.entries(emojiMap)) {
      if (word.startsWith(key) || key.startsWith(word)) {
        return emoji
      }
    }
  }
  
  return emojiMap.default
}
