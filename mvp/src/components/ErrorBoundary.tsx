import { Component, type ReactNode } from 'react';
import { logClientError } from '../logger';
export default class ErrorBoundary extends Component<{ children: ReactNode }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { logClientError('render_failed'); }
  render() {
    if (this.state.failed) return <main className="status-page" role="alert"><h1>Something went wrong</h1><p>Reload the page to try again.</p><button type="button" onClick={() => window.location.assign('/')}>Return home</button></main>;
    return this.props.children;
  }
}
