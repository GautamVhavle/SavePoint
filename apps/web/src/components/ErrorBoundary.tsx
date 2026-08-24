import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArchiveX } from 'lucide-react';

interface State { error: Error | null }

/** Last-resort crash guard: keeps a themed recovery screen instead of a white page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render crash', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="container-shell grid min-h-[70vh] place-items-center text-center" role="alert">
        <div>
          <ArchiveX className="mx-auto text-violet-300" size={42} />
          <div className="eyebrow mt-7 justify-center">Archive glitch</div>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">This view hit a snag.</h1>
          <p className="muted mt-4">Your collection is safe on the server. Reload to re-enter the archive.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload SavePoint
            </button>
            <Link className="btn" to="/">Return home</Link>
          </div>
        </div>
      </div>
    );
  }
}
