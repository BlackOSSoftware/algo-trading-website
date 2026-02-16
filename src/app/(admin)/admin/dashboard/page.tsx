export default function AdminDashboardPage() {
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Admin Dashboard</div>
          <div className="helper">Operational metrics and health checks</div>
        </div>
        <button className="btn btn-primary" type="button">
          Create Broadcast
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <h4>Total Users</h4>
          <p>128</p>
        </div>
        <div className="stat-card">
          <h4>Alerts Today</h4>
          <p>342</p>
        </div>
        <div className="stat-card">
          <h4>Webhook Uptime</h4>
          <p>99.9%</p>
        </div>
        <div className="stat-card">
          <h4>Error Rate</h4>
          <p>0.3%</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="page-title">Latest Alerts</div>
          <div className="list">
            <div className="list-item">
              <div>
                <strong>Breakout Scan</strong>
                <div className="helper">User: aman</div>
              </div>
              <div className="badge">12:37 PM</div>
            </div>
            <div className="list-item">
              <div>
                <strong>Midcap Momentum</strong>
                <div className="helper">User: piyush</div>
              </div>
              <div className="badge">12:35 PM</div>
            </div>
            <div className="list-item">
              <div>
                <strong>Options Flow</strong>
                <div className="helper">User: sara</div>
              </div>
              <div className="badge">12:31 PM</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="page-title">System Health</div>
          <div className="list">
            <div className="list-item">
              <span>Webhook queue</span>
              <span className="badge">0 pending</span>
            </div>
            <div className="list-item">
              <span>Database latency</span>
              <span>24 ms</span>
            </div>
            <div className="list-item">
              <span>Worker status</span>
              <span className="badge">Running</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="page-title">Admin Notes</div>
        <div className="helper">
          Schedule maintenance for Saturday 1:00 AM IST. Alert all users 24
          hours before downtime.
        </div>
      </div>
    </div>
  );
}
