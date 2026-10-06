import React from 'react';

// Catches any render error below it so a single bug shows a recovery screen
// instead of unmounting the whole app (which looks like a blank black page).
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep a trace in the browser console for debugging
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Reset when the route changes so navigating away recovers
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div style={{ minHeight: '80vh', background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 44, color: '#ff007f', marginBottom: 8 }}>Something went wrong</div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
            This page hit an error. Your cart and orders are safe. Try reloading, or go back to the shop.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => window.location.reload()}
              style={{ padding: '12px 24px', background: '#ff007f', border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
              Reload page
            </button>
            <a href="/orders"
              style={{ padding: '12px 24px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
              My orders
            </a>
            <a href="/products"
              style={{ padding: '12px 24px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', fontWeight: 700, textDecoration: 'none' }}>
              Back to shop
            </a>
          </div>
        </div>
      </div>
    );
  }
}
