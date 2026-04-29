export default function HexLogo({ size = 32, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" className={className}>
      <polygon points="26,4 47,15.5 47,36.5 26,48 5,36.5 5,15.5" fill="#f5c518"/>
      <circle cx="26" cy="26" r="8" fill="#1a1200"/>
    </svg>
  )
}
