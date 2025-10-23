import { useState, useEffect } from 'react';
import { Mail, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, type Email, type Folder } from '../lib/api';
import Sidebar from './Sidebar';
import EmailList from './EmailList';
import EmailView from './EmailView';
import ComposeEmail from './ComposeEmail';
import AccountSettings from './AccountSettings';
import './EmailClient.css';

export default function EmailClient() {
  const { user, logout } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load folders on mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load emails when folder changes
  useEffect(() => {
    if (selectedFolder) {
      loadEmails(selectedFolder.id);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      const response = await api.getFolders();
      setFolders(response.folders);
      // Select inbox by default
      const inbox = response.folders.find((f) => f.type === 'inbox');
      if (inbox) {
        setSelectedFolder(inbox);
      }
    } catch (error) {
      console.error('Failed to load folders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEmails = async (folderId: number) => {
    try {
      setIsLoading(true);
      const response = await api.getEmails(folderId);
      setEmails(response.emails);
    } catch (error) {
      console.error('Failed to load emails:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSelect = async (email: Email) => {
    setSelectedEmail(email);
    setIsComposing(false);

    // Mark as read if not already
    if (!email.is_read) {
      try {
        await api.markEmailAsRead(email.id, true);
        // Update local state
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, is_read: 1 } : e))
        );
        // Update folder unread count
        setFolders((prev) =>
          prev.map((f) =>
            f.id === email.folder_id
              ? { ...f, unread_count: Math.max(0, f.unread_count - 1) }
              : f
          )
        );
      } catch (error) {
        console.error('Failed to mark email as read:', error);
      }
    }
  };

  const handleCompose = () => {
    setIsComposing(true);
    setSelectedEmail(null);
  };

  const handleSendEmail = async () => {
    setIsComposing(false);
    // Reload sent folder if it's selected
    if (selectedFolder?.type === 'sent') {
      loadEmails(selectedFolder.id);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        setIsLoading(true);
        const response = await api.searchEmails(query);
        setEmails(response.emails);
        setSelectedFolder(null);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setIsLoading(false);
      }
    } else if (selectedFolder) {
      loadEmails(selectedFolder.id);
    }
  };

  const handleDeleteEmail = async (emailId: number) => {
    try {
      await api.deleteEmail(emailId);
      setEmails((prev) => prev.filter((e) => e.id !== emailId));
      setSelectedEmail(null);
      // Reload folders to update counts
      loadFolders();
    } catch (error) {
      console.error('Failed to delete email:', error);
    }
  };

  const handleStarEmail = async (emailId: number, isStarred: boolean) => {
    try {
      await api.starEmail(emailId, isStarred);
      setEmails((prev) =>
        prev.map((e) => (e.id === emailId ? { ...e, is_starred: isStarred ? 1 : 0 } : e))
      );
      if (selectedEmail?.id === emailId) {
        setSelectedEmail({ ...selectedEmail, is_starred: isStarred ? 1 : 0 });
      }
    } catch (error) {
      console.error('Failed to star email:', error);
    }
  };

  return (
    <div className="email-client">
      <div className="email-header">
        <div className="header-left">
          <h1>
            <Mail size={24} className="header-icon" />
            My Mail
          </h1>
        </div>
        <div className="header-center">
          <input
            type="search"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={() => setShowSettings(true)} className="btn-icon" title="Settings">
            <Settings size={18} />
          </button>
          <button onClick={logout} className="btn btn-secondary">
            Logout
          </button>
        </div>
      </div>

      <div className="email-content">
        <Sidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          onCompose={handleCompose}
        />

        <EmailList
          emails={emails}
          selectedEmail={selectedEmail}
          onEmailSelect={handleEmailSelect}
          isLoading={isLoading}
          onRefresh={() => selectedFolder && loadEmails(selectedFolder.id)}
        />

        <div className="email-view-container">
          {showSettings ? (
            <AccountSettings onClose={() => setShowSettings(false)} />
          ) : isComposing ? (
            <ComposeEmail onSend={handleSendEmail} onCancel={() => setIsComposing(false)} />
          ) : selectedEmail ? (
            <EmailView
              email={selectedEmail}
              onDelete={handleDeleteEmail}
              onStar={handleStarEmail}
              onReply={() => {
                // TODO: Implement reply
                setIsComposing(true);
              }}
            />
          ) : (
            <div className="email-view-empty">
              <p>Select an email to read</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

