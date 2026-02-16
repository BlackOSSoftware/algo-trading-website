export default function ProfilePage() {
  return (
    <div className="content">
      <div className="page-header">
        <div>
          <div className="page-title">Profile</div>
          <div className="helper">Manage account and notification settings</div>
        </div>
        <button className="btn btn-primary" type="button">
          Save changes
        </button>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="page-title">User Details</div>
          <div className="form" style={{ marginTop: "16px" }}>
            <div className="input-group">
              <label className="label" htmlFor="name">
                Full name
              </label>
              <input className="input" id="name" defaultValue="Aman" />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input className="input" id="email" defaultValue="aman@trade.com" />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="phone">
                Phone
              </label>
              <input className="input" id="phone" defaultValue="+91 90000 00000" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="page-title">Notification Rules</div>
          <div className="list">
            <div className="list-item">
              <span>Webhook alerts</span>
              <span className="badge">Enabled</span>
            </div>
            <div className="list-item">
              <span>Telegram alerts</span>
              <span className="badge">Linked</span>
            </div>
            <div className="list-item">
              <span>Daily summary</span>
              <span className="badge">On</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
