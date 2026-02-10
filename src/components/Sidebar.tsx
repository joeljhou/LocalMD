import { useState, useEffect, useRef } from 'react';
import { File, Folder, FolderOpen, Eye, EyeOff, Locate, ChevronsDown, ChevronsUp } from 'lucide-react';

interface SidebarProps {
  directoryHandle: FileSystemDirectoryHandle | null;
  onFileSelect: (handle: FileSystemFileHandle) => void;
  currentFile: FileSystemFileHandle | null;
  className?: string;
  onCreateFile: () => void;
}

interface ExpandSignal {
  type: 'expand' | 'collapse';
  id: number;
}

const TEXT_EXTENSIONS = new Set([
  'md', 'markdown', 'txt', 'text',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'json', 'jsonc',
  'css', 'scss', 'less', 'sass',
  'html', 'htm', 'xhtml',
  'xml', 'yaml', 'yml', 'toml',
  'c', 'cpp', 'h', 'hpp', 'cc', 'cxx',
  'cs', 'go', 'java', 'kt', 'kts',
  'py', 'pyw', 'rb', 'erb',
  'php', 'pl', 'pm',
  'sh', 'bash', 'zsh', 'bat', 'cmd', 'ps1',
  'sql', 'graphql', 'gql',
  'rs', 'swift', 'dart', 'lua', 'r',
  'ini', 'conf', 'config', 'cfg', 'properties',
  'diff', 'patch',
  'log',
  'svg', 'vue', 'svelte', 'astro'
]);

const TEXT_FILENAMES = new Set([
  'license', 'readme', 'makefile', 'dockerfile', 'jenkinsfile',
  'changelog', 'notice', 'authors', 'contributors', 'copying'
]);

const isPreviewable = (name: string) => {
  const lowerName = name.toLowerCase();
  if (TEXT_FILENAMES.has(lowerName)) return true;
  
  const parts = lowerName.split('.');
  if (parts.length > 1) {
    const ext = parts.pop();
    if (ext && TEXT_EXTENSIONS.has(ext)) return true;
  }
  return false;
};

const shouldShow = (handle: FileSystemHandle, showHidden: boolean) => {
  if (showHidden) return true; // Show all
  
  if (handle.name.startsWith('.')) return false; // Always hide dotfiles if not showing hidden
  
  if (handle.kind === 'directory') return true; // Always show directories
  
  return isPreviewable(handle.name);
};

interface FileTreeItemProps {
  handle: FileSystemHandle;
  onFileSelect: (handle: FileSystemFileHandle) => void;
  currentFile: FileSystemFileHandle | null;
  level?: number;
  showHidden: boolean;
  expandedPath?: string[];
  expandSignal?: ExpandSignal | null;
  parentPath?: string;
  currentFilePath?: string | null;
  onToggleExpand?: (path: string, isExpanded: boolean) => void;
  initialExpandedPaths?: Set<string>;
}

function FileTreeItem({ 
  handle, 
  onFileSelect, 
  currentFile, 
  level = 0, 
  showHidden, 
  expandedPath, 
  expandSignal,
  parentPath = '',
  currentFilePath,
  onToggleExpand,
  initialExpandedPaths
}: FileTreeItemProps) {
  const itemPath = parentPath ? `${parentPath}/${handle.name}` : handle.name;
  
  const [isOpen, setIsOpen] = useState(() => {
    return initialExpandedPaths?.has(itemPath) ?? false;
  });
  
  const [children, setChildren] = useState<FileSystemHandle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);

  // Use path comparison for selection if available, fallback to name (though name is buggy for duplicates)
  // If currentFilePath is provided, we use it for exact matching.
  const isSelected = currentFilePath 
    ? currentFilePath === itemPath 
    : currentFile?.name === handle.name;

  // Handle expand/collapse all signal
  useEffect(() => {
    if (expandSignal && handle.kind === 'directory') {
      const newOpen = expandSignal.type === 'expand';
      setIsOpen(newOpen);
      onToggleExpand?.(itemPath, newOpen);
    }
  }, [expandSignal, handle.kind, itemPath, onToggleExpand]);

  // Auto-expand if part of the path
  useEffect(() => {
    if (expandedPath && expandedPath.length > 0 && handle.kind === 'directory') {
      if (expandedPath[level] === handle.name) {
         if (!isOpen) {
             setIsOpen(true);
             onToggleExpand?.(itemPath, true);
         }
      }
    }
  }, [expandedPath, level, handle.name, itemPath, onToggleExpand]);

  // Scroll into view if selected and we just expanded/loaded
  useEffect(() => {
     if (isSelected && expandedPath && expandedPath.length > 0) {
         setTimeout(() => {
             itemRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
         }, 100);
     }
  }, [isSelected, expandedPath]);

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
      const newOpen = !isOpen;
      setIsOpen(newOpen);
      onToggleExpand?.(itemPath, newOpen);
    } else {
      onFileSelect(handle as FileSystemFileHandle);
    }
  };

  return (
    <div>
      <div
        ref={itemRef}
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
            .filter(child => shouldShow(child, showHidden))
            .map((child) => (
            <FileTreeItem
              key={child.name}
              handle={child}
              onFileSelect={onFileSelect}
              currentFile={currentFile}
              level={level + 1}
              showHidden={showHidden}
              expandedPath={expandedPath}
              expandSignal={expandSignal}
              parentPath={itemPath}
              currentFilePath={currentFilePath}
              onToggleExpand={onToggleExpand}
              initialExpandedPaths={initialExpandedPaths}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function Sidebar({ directoryHandle, onFileSelect, currentFile, className }: SidebarProps) {
  const [rootChildren, setRootChildren] = useState<FileSystemHandle[]>([]);
  const [showHidden, setShowHidden] = useState(false);
  const [expandedPath, setExpandedPath] = useState<string[]>([]);
  const [expandSignal, setExpandSignal] = useState<ExpandSignal | null>(null);
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  
  // State for file selection matching
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  
  // State for persistence
  const [initialExpandedPaths, setInitialExpandedPaths] = useState<Set<string>>(new Set());

  // Load expanded paths from localStorage on mount
  useEffect(() => {
      try {
          const saved = localStorage.getItem('localmd-expanded-paths');
          if (saved) {
              setInitialExpandedPaths(new Set(JSON.parse(saved)));
          }
      } catch (e) {
          console.error("Failed to load expanded paths", e);
      }
  }, []);

  // Update persistence helper
  const updateExpandedPaths = (path: string, isExpanded: boolean) => {
      setInitialExpandedPaths(prev => {
          const next = new Set(prev);
          if (isExpanded) {
              next.add(path);
          } else {
              next.delete(path);
          }
          localStorage.setItem('localmd-expanded-paths', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  // Resolve current file path whenever currentFile or directoryHandle changes
  useEffect(() => {
      const resolvePath = async () => {
          if (!directoryHandle || !currentFile) {
              setCurrentFilePath(null);
              return;
          }
          try {
              const path = await directoryHandle.resolve(currentFile);
              if (path) {
                  setCurrentFilePath(path.join('/'));
              } else {
                  setCurrentFilePath(null);
              }
          } catch (e) {
              console.error("Failed to resolve current file path", e);
              setCurrentFilePath(null);
          }
      };
      resolvePath();
  }, [directoryHandle, currentFile]);

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

  const handleLocate = async () => {
      if (!directoryHandle || !currentFile) return;
      try {
          // Resolve returns array of directory names leading to file, e.g. ["sub", "nested", "file.md"]
          const path = await directoryHandle.resolve(currentFile);
          if (path) {
              setExpandedPath(path);
              // Reset after a delay so user can close folders if they want
              setTimeout(() => setExpandedPath([]), 2000);
          }
      } catch (err) {
          console.error("Failed to locate file", err);
      }
  };

  const toggleExpandAll = () => {
    const newType = isAllExpanded ? 'collapse' : 'expand';
    setExpandSignal({ type: newType, id: Date.now() });
    setIsAllExpanded(!isAllExpanded);
  };

  if (!directoryHandle) return null;

  return (
    <>
      <div 
        className={`flex flex-col bg-[var(--c-bg-light)] h-full ${className || ''}`}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--c-border)] flex-shrink-0">
        <span className="text-xs font-bold text-[var(--c-text-light)] uppercase tracking-wider">Explorer</span>
        <div className="flex items-center space-x-1">
            <button
                onClick={handleLocate}
                disabled={!currentFile}
                className={`p-1 rounded transition-colors ${!currentFile ? 'opacity-30 cursor-not-allowed' : 'text-[var(--c-text-light)] hover:bg-[var(--c-bg-lighter)] hover:text-[var(--c-brand)]'}`}
                title="Locate Current File"
            >
                <Locate size={14} />
            </button>
            <button
                onClick={toggleExpandAll}
                className="p-1 rounded transition-colors text-[var(--c-text-light)] hover:bg-[var(--c-bg-lighter)] hover:text-[var(--c-brand)]"
                title={isAllExpanded ? "Collapse All" : "Expand All"}
            >
                {isAllExpanded ? <ChevronsUp size={14} /> : <ChevronsDown size={14} />}
            </button>
            <button 
            onClick={() => setShowHidden(!showHidden)}
            className={`p-1 rounded transition-colors ${showHidden ? 'text-[var(--c-brand)] bg-[var(--c-brand-light)]/10' : 'text-[var(--c-text-light)] hover:bg-[var(--c-bg-lighter)]'}`}
            title={showHidden ? "Hide Hidden Files" : "Show Hidden Files"}
            >
            {showHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2 custom-scrollbar">
        {rootChildren.length === 0 && (
            <div className="px-4 py-2 text-xs text-[var(--c-text-lighter)]">Empty directory</div>
        )}
        {rootChildren
          .filter(child => shouldShow(child, showHidden))
          .map((child) => (
          <FileTreeItem
            key={child.name}
            handle={child}
            onFileSelect={onFileSelect}
            currentFile={currentFile}
            showHidden={showHidden}
            expandedPath={expandedPath}
            expandSignal={expandSignal}
            currentFilePath={currentFilePath}
            onToggleExpand={updateExpandedPaths}
            initialExpandedPaths={initialExpandedPaths}
          />
        ))}
      </div>
      </div>
    </>
  );
}
