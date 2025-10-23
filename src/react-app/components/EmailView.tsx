import type { Email } from '../lib/api';

interface EmailViewProps {
  email: Email;
  onDelete: (id: number) => void;
  onStar: (id: number, isStarred: boolean) => void;
  onReply: () => void;
}

export default function EmailView({ email, onDelete, onStar, onReply }: EmailViewProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="email-view">
      <div className="email-view-header">
        <div className="email-view-actions">
          <button onClick={onReply} className="btn-icon" title="Reply">
            ↩️
          </button>
          <button
            onClick={() => onStar(email.id, !email.is_starred)}
            className="btn-icon"
            title={email.is_starred ? 'Unstar' : 'Star'}
          >
            {email.is_starred ? '⭐' : '☆'}
          </button>
          <button onClick={() => onDelete(email.id)} className="btn-icon" title="Delete">
            🗑️
          </button>
        </div>
      </div>

      <div className="email-view-content">
        <h2 className="email-view-subject">{email.subject || '(No subject)'}</h2>

        <div className="email-view-meta">
          <div className="email-view-from">
            <strong>From:</strong> {email.from_name || email.from_email} &lt;{email.from_email}&gt;
          </div>
          <div className="email-view-to">
            <strong>To:</strong> {email.to_email}
          </div>
          <div className="email-view-date">
            <strong>Date:</strong> {formatDate(email.received_at)}
          </div>
        </div>

        <div className="email-view-body">
          {email.body_html ? (
            <div
              className="email-html-content"
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          ) : (
            <pre className="email-text-content">{email.body_plaintext}</pre>
          )}
        </div>
      </div>
    </div>
  );
}

