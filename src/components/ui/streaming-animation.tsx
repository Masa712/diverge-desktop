'use client'

interface Props {
  className?: string
}

export function StreamingAnimation({ className = '' }: Props) {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <div className="flex flex-col space-y-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-16 h-0.5 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full"
            style={{
              animationDelay: `${i * 0.2}s`,
              animation: `streamingLineLeftToRight 2s ease-in-out infinite ${i * 0.2}s`
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes streamingLineLeftToRight {
          0% {
            transform: scaleX(0);
            transform-origin: left;
            opacity: 0.3;
          }
          70% {
            transform: scaleX(1);
            transform-origin: left;
            opacity: 1;
          }
          100% {
            transform: scaleX(0);
            transform-origin: left;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export function StreamingDots({ className = '' }: Props) {
  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <span className="text-gray-500 text-sm">AI is thinking</span>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s'
            }}
          />
        ))}
      </div>
    </div>
  )
}

export function StreamingBars({ className = '' }: Props) {
  return (
    <div className={`flex items-center space-x-0.5 ${className}`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-gradient-to-t from-blue-400 to-purple-500 rounded-full animate-pulse"
          style={{
            height: `${Math.random() * 20 + 10}px`,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1.2s'
          }}
        />
      ))}
    </div>
  )
}