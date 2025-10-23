import { PenSquare, Inbox, Send, FileText, Trash2, AlertTriangle, Folder } from 'lucide-react';
import type { Folder as FolderType } from '../lib/api';

interface SidebarProps {
  folders: FolderType[];
  selectedFolder: FolderType | null;
  onFolderSelect: (folder: FolderType) => void;
  onCompose: () => void;
}

const getFolderIcon = (type: string) => {
  switch (type) {
    case 'inbox':
      return <Inbox size={18} />;
    case 'sent':
      return <Send size={18} />;
    case 'drafts':
      return <FileText size={18} />;
    case 'trash':
      return <Trash2 size={18} />;
    case 'spam':
      return <AlertTriangle size={18} />;
    default:
      return <Folder size={18} />;
  }
};

export default function Sidebar({ folders, selectedFolder, onFolderSelect, onCompose }: SidebarProps) {
  return (
    <div className="sidebar">
      <button onClick={onCompose} className="btn btn-compose">
        <PenSquare size={18} />
        <span>Compose</span>
      </button>

      <div className="folders-list">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolder?.id === folder.id ? 'active' : ''}`}
            onClick={() => onFolderSelect(folder)}
          >
            <span className="folder-icon">{getFolderIcon(folder.type)}</span>
            <span className="folder-name">{folder.name}</span>
            {folder.unread_count > 0 && (
              <span className="folder-badge">{folder.unread_count}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

