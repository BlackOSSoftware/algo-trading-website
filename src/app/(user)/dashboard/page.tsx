export default function UserDashboardPage() {
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="helper">Live snapshot of alerts and strategy status</div>
        </div>
        <button className="btn btn-primary" type="button">
          New Strategy
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <h4>Alerts Today</h4>
          <p>42</p>
        </div>
        <div className="stat-card">
          <h4>Signals Queued</h4>
          <p>6</p>
        </div>
        <div className="stat-card">
          <h4>Active Strategies</h4>
          <p>8</p>
        </div>
        <div className="stat-card">
          <h4>Webhook Latency</h4>
          <p>65 ms</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="page-title">Recent Alerts</div>
          <div className="list">
            <div className="list-item">
              <div>
                <strong>Breakout Scan</strong>
                <div className="helper">3 stocks matched</div>
              </div>
              <div className="badge">2 min ago</div>
            </div>
            <div className="list-item">
              <div>
                <strong>BankNifty Momentum</strong>
                <div className="helper">Auto execute enabled</div>
              </div>
              <div className="badge">5 min ago</div>
            </div>
            <div className="list-item">
              <div>
                <strong>Swing Setup</strong>
                <div className="helper">Risk 1.2%</div>
              </div>
              <div className="badge">12 min ago</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="page-title">Strategy Pulse</div>
          <div className="list">
            <div className="list-item">
              <div>
                <strong>Intraday Trend</strong>
                <div className="helper">Status: Running</div>
              </div>
              <div className="badge">+2.4%</div>
            </div>
            <div className="list-item">
              <div>
                <strong>Gap Scanner</strong>
                <div className="helper">Status: Paused</div>
              </div>
              <div className="badge">Paused</div>
            </div>
            <div className="list-item">
              <div>
                <strong>Options Flow</strong>
                <div className="helper">Status: Live</div>
              </div>
              <div className="badge">+1.1%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Webhook Endpoint</div>
        <div className="list">
          <div className="list-item">
            <span>URL</span>
            <span className="badge">/api/v1/webhooks/chartink</span>
          </div>
          <div className="list-item">
            <span>Last payload</span>
            <span>12:37 PM IST</span>
          </div>
        </div>
      </div>
    </div>
  );
}
