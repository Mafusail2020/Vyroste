import logo from '../assets/vyroste_symb.png'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showSubtitle?: boolean
}

// The asset is the full lockup (symbol + «ВИРОСТЕ» + subtitle), so we just
// render it at the requested height. `showSubtitle` is kept for callers but
// has no effect now (the subtitle is baked into the image).
export default function Logo({ size = 'md' }: LogoProps) {
  const h = size === 'sm' ? 90 : size === 'lg' ? 168 : 126
  return <img src={logo} alt="Виросте — Сад та город без помилок" style={{ height: h }} className="w-auto select-none" />
}
