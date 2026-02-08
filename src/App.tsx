import { useState, useEffect, useRef } from 'react';
import Split from 'react-split';
import { get, set } from 'idb-keyval';
import { Header } from './components/Header';
import { Editor } from './components/Editor';
import { Preview } from './components/Preview';
import { Sidebar } from './components/Sidebar';
import { useTheme } from './hooks/useTheme';

function App() {
  const [markdown, setMarkdown] = useState<string>('# Welcome to LocalMD Pro\n\nStart typing or open a folder...');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [directoryHandle, setDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [pendingDirectoryHandle, setPendingDirectoryHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);
  
  // Initialize from localStorage
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>(() => {
    return (localStorage.getItem('view-mode') as 'split' | 'edit' | 'preview') || 'split';
  });
  const [fontSize, setFontSize] = useState(() => {
    const saved = localStorage.getItem('font-size');
    return saved ? parseInt(saved, 10) : 16;
  });

  const [scrollRatio, setScrollRatio] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, toggleTheme, accent, changeAccent } = useTheme();
  
  const lastModifiedRef = useRef<number>(0);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem('font-size', fontSize.toString());
  }, [fontSize]);

  useEffect(() => {
    const restoreDirectory = async () => {
      try {
        const handle = await get('directory-handle');
        if (handle) {
          // Verify permission
          // @ts-ignore
          const options = { mode: 'read' };
          if ((await handle.queryPermission(options)) === 'granted') {
             setDirectoryHandle(handle);
          } else {
             setPendingDirectoryHandle(handle);
          }
        }
      } catch (err) {
        console.error('Failed to restore directory', err);
      }
    };
    restoreDirectory();
  }, []);

  useEffect(() => {
    if (directoryHandle) {
      set( 'directory-handle', directoryHandle );
    }
  }, [directoryHandle]);

  const handleRestoreSession = async () => {
    if (!pendingDirectoryHandle) return;
    try {
      // @ts-ignore
      const options = { mode: 'read' };
      if ((await pendingDirectoryHandle.requestPermission(options)) === 'granted') {
        setDirectoryHandle(pendingDirectoryHandle);
        setPendingDirectoryHandle(null);
      }
    } catch (err) {
      console.error('Failed to request permission', err);
    }
  };

  const handleCreateNew = () => {
    setFileHandle(null);
    setFileName(null);
    setMarkdown('');
    setIsModified(false);
  };

  const handleOpen = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Markdown Files',
          accept: { 'text/markdown': ['.md', '.markdown'] },
        }],
      });
      await loadFile(handle);
    } catch (err) {
      console.log('Open cancelled', err);
    }
  };

  const handleOpenFolder = async () => {
    try {
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
    } catch (err) {
      console.log('Folder open cancelled', err);
    }
  };

  const loadFile = async (handle: FileSystemFileHandle) => {
    try {
        const file = await handle.getFile();
        const text = await file.text();
        setFileHandle(handle);
        setFileName(file.name);
        setMarkdown(text);
        setIsModified(false);
        lastModifiedRef.current = file.lastModified;
    } catch (err) {
        console.error('Failed to load file', err);
    }
  };

  const handleSave = async () => {
    try {
      let handle = fileHandle;
      if (!handle) {
        // Save As
        handle = await window.showSaveFilePicker({
          types: [{
            description: 'Markdown Files',
            accept: { 'text/markdown': ['.md', '.markdown'] },
          }],
        });
        setFileHandle(handle);
        setFileName(handle.name);
      }
      
      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(markdown);
        await writable.close();
        
        // Update last modified timestamp
        const file = await handle.getFile();
        lastModifiedRef.current = file.lastModified;
      }
      
      setIsModified(false);
    } catch (err) {
      console.error('Save failed', err);
    }
  };

  const handleChange = (value: string) => {
    setMarkdown(value);
    setIsModified(true);
  };

  // Drag and drop
  useEffect(() => {
    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      const item = e.dataTransfer?.items[0];
      if (item?.kind === 'file') {
        // @ts-ignore
        const entry = await item.getAsFileSystemHandle();
        if (entry?.kind === 'file') {
            await loadFile(entry as FileSystemFileHandle);
        } else if (entry?.kind === 'directory') {
            setDirectoryHandle(entry as FileSystemDirectoryHandle);
        }
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [markdown, fileHandle]); 

  // Watch for external changes
  useEffect(() => {
    if (!fileHandle) return;

    const intervalId = setInterval(async () => {
        try {
            const file = await fileHandle.getFile();
            // If file modified on disk AND we haven't modified it in editor (or we want to overwrite?)
            // Requirement: "User switch back... content sync latest".
            // Implementation: If file on disk is newer than our last read
            if (file.lastModified > lastModifiedRef.current) {
                if (!isModified) {
                    const text = await file.text();
                    setMarkdown(text);
                    lastModifiedRef.current = file.lastModified;
                    console.log('Auto-reloaded external changes');
                } else {
                    // Conflict: User has unsaved changes, file changed on disk.
                    // For now, we ignore external changes to protect user work.
                    // Ideally show a notification.
                }
            }
        } catch (err) {
            console.error('Error watching file', err);
        }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [fileHandle, isModified]);

  return (
    <div className="flex flex-col h-screen bg-[var(--c-bg)] text-[var(--c-text)] transition-colors duration-200 font-sans">
      <Header
        onOpen={handleOpen}
        onOpenFolder={handleOpenFolder}
        onSave={handleSave}
        fileName={fileName}
        isModified={isModified}
        viewMode={viewMode}
        setViewMode={setViewMode}
        theme={theme}
        toggleTheme={toggleTheme}
        accent={accent}
        changeAccent={changeAccent}
        sidebarOpen={sidebarOpen}
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        hasFolder={!!directoryHandle}
        fontSize={fontSize}
        setFontSize={setFontSize}
        onDoubleClick={handleCreateNew}
      />
      
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {pendingDirectoryHandle && !directoryHandle && (
           <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center justify-between text-sm text-yellow-800 flex-shrink-0">
              <span className="flex items-center">
                 <span className="font-medium mr-2">Previous session detected:</span> 
                 {pendingDirectoryHandle.name}
              </span>
              <button 
                 onClick={handleRestoreSession}
                 className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-900 rounded border border-yellow-300 transition-colors font-medium text-xs"
              >
                 Restore Session
              </button>
           </div>
        )}
        {directoryHandle && sidebarOpen ? (
          <Split
            className="flex h-full w-full"
            sizes={[20, 80]}
            minSize={200}
            gutterSize={2}
            snapOffset={0}
          >
            <div className="h-full overflow-hidden">
                <Sidebar 
                    directoryHandle={directoryHandle} 
                    onFileSelect={loadFile}
                    currentFile={fileHandle}
                    className="h-full"
                    onCreateFile={handleCreateNew}
                />
            </div>
            <div className="h-full overflow-hidden">
                {viewMode === 'split' ? (
                  <Split
                    className="flex h-full w-full"
                    sizes={[50, 50]}
                    minSize={100}
                    gutterSize={2}
                    snapOffset={0}
                  >
                     <div className="h-full overflow-hidden border-r border-[var(--c-border)]">
                        <Editor 
                            value={markdown} 
                            onChange={handleChange} 
                            theme={theme}
                            onScroll={setScrollRatio}
                            fontSize={fontSize}
                        />
                     </div>
                     <div className="h-full overflow-hidden bg-[var(--c-bg)]">
                        <Preview 
                            content={markdown} 
                            theme={theme}
                            scrollRatio={scrollRatio}
                            fontSize={fontSize}
                        />
                     </div>
                  </Split>
                ) : viewMode === 'edit' ? (
                   <div className="h-full w-full max-w-5xl mx-auto overflow-hidden">
                      <Editor 
                          value={markdown} 
                          onChange={handleChange} 
                          theme={theme}
                          onScroll={setScrollRatio}
                          fontSize={fontSize}
                      />
                   </div>
                ) : (
                   <div className="h-full w-full max-w-5xl mx-auto overflow-hidden bg-[var(--c-bg)]">
                      <Preview 
                          content={markdown} 
                          theme={theme}
                          scrollRatio={scrollRatio}
                          fontSize={fontSize}
                      />
                   </div>
                )}
            </div>
          </Split>
        ) : (
            <div className="flex-1 h-full overflow-hidden">
                {viewMode === 'split' ? (
                  <Split
                    className="flex h-full w-full"
                    sizes={[50, 50]}
                    minSize={100}
                    gutterSize={2}
                    snapOffset={0}
                  >
                     <div className="h-full overflow-hidden border-r border-[var(--c-border)]">
                        <Editor 
                            value={markdown} 
                            onChange={handleChange} 
                            theme={theme}
                            onScroll={setScrollRatio}
                            fontSize={fontSize}
                        />
                     </div>
                     <div className="h-full overflow-hidden bg-[var(--c-bg)]">
                        <Preview 
                            content={markdown} 
                            theme={theme}
                            scrollRatio={scrollRatio}
                            fontSize={fontSize}
                        />
                     </div>
                  </Split>
                ) : viewMode === 'edit' ? (
                   <div className="h-full w-full max-w-5xl mx-auto overflow-hidden">
                      <Editor 
                          value={markdown} 
                          onChange={handleChange} 
                          theme={theme}
                          onScroll={setScrollRatio}
                          fontSize={fontSize}
                      />
                   </div>
                ) : (
                   <div className="h-full w-full max-w-5xl mx-auto overflow-hidden bg-[var(--c-bg)]">
                      <Preview 
                          content={markdown} 
                          theme={theme}
                          scrollRatio={scrollRatio}
                          fontSize={fontSize}
                      />
                   </div>
                )}
            </div>
        )}
      </main>
    </div>
  );
}

export default App;
