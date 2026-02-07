import { useState, useEffect } from 'react';
import { File, Folder, FolderOpen, Eye, EyeOff, FileUp } from 'lucide-react';

interface SidebarProps {
  directoryHandle: FileSystemDirectoryHandle | null;
  onFileSelect: (handle: FileSystemFileHandle) => void;
  currentFile: FileSystemFileHandle | null;
  className?: string;
  onCreateFile: () => void;
}

interface FileTreeItemProps {
  handle: FileSystemHandle;
  onFileSelect: (handle: FileSystemFileHandle) => void;
  currentFile: FileSystemFileHandle | null;
  level?: number;
  showHidden: boolean;
}

function FileTreeItem({ handle, onFileSelect, currentFile, level = 0, showHidden }: FileTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [children, setChildren] = useState<FileSystemHandle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const isSelected = currentFile?.name === handle.name;

  useEffect(() => {
    if (isOpen && handle.kind === 'directory' && !isLoaded) {
      const loadDir = async () => {
        const dirHandle = handle as FileSystemDirectoryHandle;
        const entries: FileSystemHandle[] = [];
        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          entries.push(entry);
        }
        entries.sort((a, b) => {
          if (a.kind === b.kind) return a.name.localeCompare(b.name);
          return a.kind === 'directory' ? -1 : 1;
        });
        setChildren(entries);
        setIsLoaded(true);
      };
      loadDir();
    }
  }, [isOpen, handle, isLoaded]);

  const handleClick = () => {
    if (handle.kind === 'directory') {
      setIsOpen(!isOpen);
    } else {
      onFileSelect(handle as FileSystemFileHandle);
    }
  };

  return (
    <div>
      <div
        className={`flex items-center py-1 px-2 cursor-pointer select-none text-sm transition-colors whitespace-nowrap
          ${isSelected ? 'bg-[var(--c-brand-light)]/20 text-[var(--c-brand)]' : 'text-[var(--c-text)] hover:bg-[var(--c-bg-lighter)]'}
        `}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={handleClick}
      >
        <span className="mr-1.5 opacity-70 flex-shrink-0">
          {handle.kind === 'directory' ? (
            isOpen ? <FolderOpen size={16} /> : <Folder size={16} />
          ) : (
            <File size={16} />
          )}
        </span>
        <span className="truncate">{handle.name}</span>
      </div>
      {isOpen && (
        <div>
          {children
            .filter(child => showHidden || !child.name.startsWith('.'))
            .map((child) => (
            <FileTreeItem
              key={child.name}
              handle={child}
              onFileSelect={onFileSelect}
              currentFile={currentFile}
              level={level + 1}
              showHidden={showHidden}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ directoryHandle, onFileSelect, currentFile, className, onCreateFile }: SidebarProps) {
  const [rootChildren, setRootChildren] = useState<FileSystemHandle[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; visible: boolean }>({ x: 0, y: 0, visible: false });

  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, visible: true });
  };

  useEffect(() => {
    const loadRoot = async () => {
      if (!directoryHandle) return;
      const entries: FileSystemHandle[] = [];
      // @ts-ignore
      for await (const entry of directoryHandle.values()) {
        entries.push(entry);
      }
      entries.sort((a, b) => {
        if (a.kind === b.kind) return a.name.localeCompare(b.name);
        return a.kind === 'directory' ? -1 : 1;
      });
      setRootChildren(entries);
    };
    loadRoot();
  }, [directoryHandle]);

  if (!directoryHandle) return null;

  return (
    <>
      <div 
        className={`flex flex-col bg-[var(--c-bg-light)] h-full ${className || ''}`}
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--c-border)] flex-shrink-0">
        <span className="text-xs font-bold text-[var(--c-text-light)] uppercase tracking-wider">Explorer</span>
        <button 
           onClick={() => setShowHidden(!showHidden)}
           className={`p-1 rounded transition-colors ${showHidden ? 'text-[var(--c-brand)] bg-[var(--c-brand-light)]/10' : 'text-[var(--c-text-light)] hover:bg-[var(--c-bg-lighter)]'}`}
           title={showHidden ? "Hide Hidden Files" : "Show Hidden Files"}
        >
           {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
        {rootChildren.length === 0 && (
            <div className="px-4 py-2 text-xs text-[var(--c-text-lighter)]">Empty directory</div>
        )}
        {rootChildren
          .filter(child => showHidden || !child.name.startsWith('.'))
          .map((child) => (
          <FileTreeItem
            key={child.name}
            handle={child}
            onFileSelect={onFileSelect}
            currentFile={currentFile}
            showHidden={showHidden}
          />
        ))}
      </div>
      </div>
      {contextMenu.visible && (
        <div 
            className="fixed z-50 bg-[var(--c-bg)] border border-[var(--c-border)] shadow-lg rounded-lg py-1 min-w-[120px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
        >
            <button 
                className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--c-bg-light)] text-[var(--c-text)] flex items-center"
                onClick={() => {
                    onCreateFile();
                    setContextMenu({ ...contextMenu, visible: false });
                }}
            >
                <FileUp size={14} className="mr-2" />
                New File
            </button>
        </div>
      )}
    </>
  );
}
