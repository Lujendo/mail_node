import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Mail } from 'lucide-react';
import { api } from '../lib/api';

interface EmailAccount {
  id: number;
  email: string;
  username: string;
  password: string;
  imap_server: string;
  smtp_server: string;
  smtp_port: number;
  is_default: boolean;
}

interface AccountSettingsProps {
  onClose: () => void;
}

export default function AccountSettings({ onClose }: AccountSettingsProps) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    imap_server: '',
    smtp_server: '',
    smtp_port: 587,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const response = await api.getEmailAccounts();
      setAccounts(response.accounts || []);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.addEmailAccount(formData);
      setSuccess('Email account added successfully!');
      setFormData({
        email: '',
        username: '',
        password: '',
        imap_server: '',
        smtp_server: '',
        smtp_port: 587,
      });
      setShowAddForm(false);
      loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add email account');
    }
  };

  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Are you sure you want to delete this email account?')) {
      return;
    }

    try {
      await api.deleteEmailAccount(accountId);
      setSuccess('Email account deleted successfully!');
      loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email account');
    }
  };

  const handleSetDefault = async (accountId: number) => {
    try {
      await api.setDefaultEmailAccount(accountId);
      setSuccess('Default account updated!');
      loadAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set default account');
    }
  };

  return (
    <div className="account-settings">
      <div className="settings-header">
        <h2>Account Settings</h2>
        <button onClick={onClose} className="btn-icon" title="Close">
          <X size={18} />
        </button>
      </div>

      <div className="settings-content">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <div className="settings-section">
          <div className="section-header">
            <h3>Email Accounts</h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} />
              Add Account
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddAccount} className="add-account-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="[email protected]"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="[email protected]"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>IMAP/POP Server</label>
                  <input
                    type="text"
                    value={formData.imap_server}
                    onChange={(e) => setFormData({ ...formData, imap_server: e.target.value })}
                    placeholder="mail.yourdomain.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>SMTP Server</label>
                  <input
                    type="text"
                    value={formData.smtp_server}
                    onChange={(e) => setFormData({ ...formData, smtp_server: e.target.value })}
                    placeholder="mail.yourdomain.com"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>SMTP Port</label>
                <input
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value) })}
                  placeholder="587"
                  required
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  Add Account
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {isLoading ? (
            <div className="loading-spinner"></div>
          ) : accounts.length === 0 ? (
            <div className="empty-state">
              <Mail size={48} className="empty-icon" />
              <p>No email accounts configured</p>
              <p className="empty-hint">Add your custom domain email accounts to send and receive emails</p>
            </div>
          ) : (
            <div className="accounts-list">
              {accounts.map((account) => (
                <div key={account.id} className="account-card">
                  <div className="account-info">
                    <div className="account-email">
                      <Mail size={18} />
                      {account.email}
                      {account.is_default && <span className="badge badge-primary">Default</span>}
                    </div>
                    <div className="account-details">
                      <span>IMAP: {account.imap_server}</span>
                      <span>SMTP: {account.smtp_server}:{account.smtp_port}</span>
                    </div>
                  </div>
                  <div className="account-actions">
                    {!account.is_default && (
                      <button
                        onClick={() => handleSetDefault(account.id)}
                        className="btn btn-sm btn-secondary"
                      >
                        Set as Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="btn-icon btn-danger"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

