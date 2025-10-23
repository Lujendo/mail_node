import type { Email } from '../lib/api';

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onEmailSelect: (email: Email) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function EmailList({
  emails,
  selectedEmail,
  onEmailSelect,
  isLoading,
  onRefresh,
}: EmailListProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="email-list">
      <div className="email-list-header">
        <h2>Emails</h2>
        <button onClick={onRefresh} className="btn-icon" title="Refresh">
          🔄
        </button>
      </div>

      {isLoading ? (
        <div className="email-list-loading">
          <div className="loading-spinner"></div>
        </div>
      ) : emails.length === 0 ? (
        <div className="email-list-empty">
          <p>No emails found</p>
        </div>
      ) : (
        <div className="email-list-items">
          {emails.map((email) => (
            <div
              key={email.id}
              className={`email-item ${selectedEmail?.id === email.id ? 'active' : ''} ${
                !email.is_read ? 'unread' : ''
              }`}
              onClick={() => onEmailSelect(email)}
            >
              <div className="email-item-header">
                <span className="email-from">
                  {email.from_name || email.from_email}
                </span>
                <span className="email-date">{formatDate(email.received_at)}</span>
              </div>
              <div className="email-subject">
                {email.is_starred ? '⭐ ' : ''}
                {email.subject || '(No subject)'}
              </div>
              <div className="email-preview">
                {email.body_plaintext?.substring(0, 100) || ''}
              </div>
              {email.has_attachments ? (
                <div className="email-attachment-badge">📎</div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

