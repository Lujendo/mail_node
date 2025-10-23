import type { Folder } from '../lib/api';

interface SidebarProps {
  folders: Folder[];
  selectedFolder: Folder | null;
  onFolderSelect: (folder: Folder) => void;
  onCompose: () => void;
}

export default function Sidebar({ folders, selectedFolder, onFolderSelect, onCompose }: SidebarProps) {
  return (
    <div className="sidebar">
      <button onClick={onCompose} className="btn btn-compose">
        ✏️ Compose
      </button>

      <div className="folders-list">
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`folder-item ${selectedFolder?.id === folder.id ? 'active' : ''}`}
            onClick={() => onFolderSelect(folder)}
          >
            <span className="folder-icon">{folder.icon || '📁'}</span>
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

