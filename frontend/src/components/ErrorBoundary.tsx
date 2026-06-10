import { Component, type ReactNode } from 'react'

interface State { hasError: boolean }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-6 text-center">
        <div className="text-5xl">🌿</div>
        <div>
          <h2 className="text-2xl font-black text-forest uppercase mb-2">Щось пішло не так</h2>
          <p className="text-gray-500 text-sm max-w-sm">Виникла непередбачена помилка. Спробуйте перезавантажити сторінку.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors"
        >
          Перезавантажити
        </button>
      </div>
    )
    return this.props.children
  }
}
