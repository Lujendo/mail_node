import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api, type EmailAccount } from '../lib/api';

interface ComposeEmailProps {
  onSend: () => void;
  onCancel: () => void;
}

export default function ComposeEmail({ onSend, onCancel }: ComposeEmailProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const response = await api.getEmailAccounts();
      setAccounts(response.accounts);

      // Set default account as "from" if available
      const defaultAccount = response.accounts.find(acc => acc.is_default);
      if (defaultAccount) {
        setFrom(defaultAccount.email);
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!to || !subject) {
      setError('Please fill in recipient and subject');
      return;
    }

    setIsSending(true);

    try {
      await api.sendEmail({
        from: from ? { email: from } : undefined,
        to: [{ email: to }],
        subject,
        text: body,
        html: `<p>${body.replace(/\n/g, '<br>')}</p>`,
      });
      onSend();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="compose-email">
      <div className="compose-header">
        <h2>New Message</h2>
        <button onClick={onCancel} className="btn-icon" title="Close">
          <X size={18} />
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={handleSend} className="compose-form">
        {accounts.length > 0 && (
          <div className="compose-field">
            <label>From:</label>
            <select
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            >
              <option value="">Select sender...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.email}>
                  {account.email} {account.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="compose-field">
          <label>To:</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="[email protected]"
            required
          />
        </div>

        <div className="compose-field">
          <label>Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            required
          />
        </div>

        <div className="compose-field compose-body">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={15}
          />
        </div>

        <div className="compose-actions">
          <button type="submit" className="btn btn-primary" disabled={isSending}>
            {isSending ? 'Sending...' : 'Send'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

