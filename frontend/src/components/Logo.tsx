interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showSubtitle?: boolean
}

export default function Logo({ size = 'md', showSubtitle = true }: LogoProps) {
  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 52 : 40

  return (
    <div className="flex items-center gap-2.5">
      <svg
        width={iconSize}
        height={Math.round(iconSize * 1.2)}
        viewBox="0 0 40 48"
        fill="none"
        aria-hidden="true"
      >
        {/* Trowel / spade body */}
        <path
          d="M20 44 L7 26 Q7 16 20 16 Q33 16 33 26 Z"
          fill="#1A237E"
        />
        {/* Handle stem */}
        <rect x="18" y="5" width="4" height="14" rx="2" fill="#1A237E" />
        {/* Left leaf */}
        <path
          d="M20 16 C20 16 10 10 12 3 C15 7 20 16 20 16Z"
          fill="#2B6117"
        />
        {/* Right leaf */}
        <path
          d="M20 16 C20 16 30 10 28 3 C25 7 20 16 20 16Z"
          fill="#4CAF50"
        />
        {/* Center stem tip */}
        <circle cx="20" cy="16" r="2" fill="#2B6117" />
      </svg>

      <div className="flex flex-col leading-none">
        <span
          className="font-black tracking-wide text-forest uppercase"
          style={{ fontSize: size === 'sm' ? 16 : size === 'lg' ? 26 : 20 }}
        >
          ВИРОСТЕ
        </span>
        {showSubtitle && (
          <span
            className="text-gray-500 font-normal"
            style={{ fontSize: size === 'sm' ? 9 : size === 'lg' ? 12 : 10 }}
          >
            Сад та город без помилок
          </span>
        )}
      </div>
    </div>
  )
}
