// Ilustraciones SVG generadas para la demo (no son fotos reales).
const COLORES = ['#FFE8DA', '#E6F4EA', '#FFF1B8', '#F3E6DF']
export function fotoEjemplo(cuarto: string, momento: 'entrada' | 'salida', i = 0): string {
  const fondo = COLORES[(cuarto.length + i) % COLORES.length]
  const mancha = momento === 'salida' && i % 2 === 0
    ? '<ellipse cx="225" cy="70" rx="26" ry="16" fill="#A88A7D" opacity=".55"/>' : ''
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220"><rect width="320" height="220" fill="${fondo}"/>
<rect x="0" y="168" width="320" height="52" fill="#E9D3C6"/><rect x="40" y="36" width="90" height="70" rx="6" fill="#fff" stroke="#3D2A22" stroke-width="3"/>
<path d="M85 36v70M40 71h90" stroke="#3D2A22" stroke-width="2"/><rect x="170" y="96" width="110" height="56" rx="10" fill="#FF6B35" opacity=".85"/>
<path d="M60 168c0-20 10-30 22-34-2 14-8 24-22 34z" fill="#6FBF8A"/>${mancha}
<text x="160" y="200" text-anchor="middle" font-family="Inter,sans-serif" font-size="16" font-weight="700" fill="#3D2A22">${cuarto} · ${momento}</text></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}
export async function reducirImagen(f: File, max = 560): Promise<string> {
  const url = URL.createObjectURL(f)
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = url })
    const k = Math.min(1, max / Math.max(img.width, img.height))
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
    return c.toDataURL('image/jpeg', 0.72)
  } finally { URL.revokeObjectURL(url) }
}
