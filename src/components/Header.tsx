import React from 'react';
import { Moon, Sun, FileUp, Save, Columns, Edit3, FolderOpen, Palette, Eye, PanelLeft, PanelLeftClose } from 'lucide-react';
import type { ThemeMode, AccentColor } from '../hooks/useTheme';

interface HeaderProps {
  onOpen: () => void;
  onOpenFolder: () => void;
  onSave: () => void;
  fileName: string | null;
  isModified: boolean;
  viewMode: 'split' | 'edit' | 'preview';
  setViewMode: (mode: 'split' | 'edit' | 'preview') => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  accent: AccentColor;
  changeAccent: (accent: AccentColor) => void;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  hasFolder: boolean;
  fontSize: number;
  setFontSize: (size: number) => void;
}

export function Header({
  onOpen,
  onOpenFolder,
  onSave,
  fileName,
  isModified,
  viewMode,
  setViewMode,
  theme,
  toggleTheme,
  accent,
  changeAccent,
  sidebarOpen,
  toggleSidebar,
  hasFolder,
  fontSize,
  setFontSize,
}: HeaderProps) {
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-bg)] transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-[var(--c-brand)] flex items-center">
            {hasFolder && (
                <button 
                    onClick={toggleSidebar}
                    className="mr-3 text-[var(--c-text-light)] hover:text-[var(--c-brand)] transition-colors"
                    title={sidebarOpen ? "Collapse Explorer" : "Expand Explorer"}
                >
                    {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
                </button>
            )}
          LocalMD <span className="text-xs text-[var(--c-text-lighter)] font-normal ml-1">Pro</span>
        </h1>
        <div className="h-6 w-px bg-[var(--c-border)]" />
        <div className="flex items-center space-x-2 text-sm text-[var(--c-text-light)]">
          <span className="font-medium">{fileName || 'Untitled.md'}</span>
          {isModified && <span className="text-yellow-500 text-xs">●</span>}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={onOpenFolder}
          className="p-2 rounded-lg hover:bg-[var(--c-bg-light)] text-[var(--c-text-light)] transition-colors"
          title="Open Folder"
        >
          <FolderOpen size={20} />
        </button>
        <button
          onClick={onOpen}
          className="p-2 rounded-lg hover:bg-[var(--c-bg-light)] text-[var(--c-text-light)] transition-colors"
          title="Open File"
        >
          <FileUp size={20} />
        </button>
        <button
          onClick={onSave}
          className="p-2 rounded-lg hover:bg-[var(--c-bg-light)] text-[var(--c-text-light)] transition-colors"
          title="Save File (Cmd/Ctrl + S)"
        >
          <Save size={20} />
        </button>
        
        <div className="h-6 w-px bg-[var(--c-border)] mx-2" />
        
        <div className="flex bg-[var(--c-bg-light)] rounded-lg p-1">
          <button
            onClick={() => setViewMode('edit')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'edit'
                ? 'bg-[var(--c-bg)] shadow-sm text-[var(--c-brand)]'
                : 'text-[var(--c-text-light)] hover:text-[var(--c-text)]'
            }`}
            title="Editor Only"
          >
            <Edit3 size={18} />
          </button>
          <button
            onClick={() => setViewMode('split')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'split'
                ? 'bg-[var(--c-bg)] shadow-sm text-[var(--c-brand)]'
                : 'text-[var(--c-text-light)] hover:text-[var(--c-text)]'
            }`}
            title="Split View"
          >
            <Columns size={18} />
          </button>
          <button
            onClick={() => setViewMode('preview')}
            className={`p-1.5 rounded-md transition-all ${
              viewMode === 'preview'
                ? 'bg-[var(--c-bg)] shadow-sm text-[var(--c-brand)]'
                : 'text-[var(--c-text-light)] hover:text-[var(--c-text)]'
            }`}
            title="Preview Only"
          >
            <Eye size={18} />
          </button>
        </div>

        <div className="h-6 w-px bg-[var(--c-border)] mx-2" />

        <div className="relative">
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="p-2 rounded-lg hover:bg-[var(--c-bg-light)] text-[var(--c-text-light)] transition-colors"
            title="Appearance Settings"
          >
            <Palette size={20} />
          </button>
          {showSettingsMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--c-bg)] border border-[var(--c-border)] rounded-lg shadow-xl p-3 z-50">
              <div className="text-xs text-[var(--c-text-lighter)] mb-2 px-1 uppercase tracking-wider font-bold">Accent Color</div>
              <div className="flex space-x-2 px-1 mb-4">
                <button onClick={() => changeAccent('default')} className={`w-6 h-6 rounded-full bg-[#3eaf7c] ${accent === 'default' ? 'ring-2 ring-offset-2 ring-[#3eaf7c]' : ''}`} title="Green" />
                <button onClick={() => changeAccent('purple')} className={`w-6 h-6 rounded-full bg-[#8b5cf6] ${accent === 'purple' ? 'ring-2 ring-offset-2 ring-[#8b5cf6]' : ''}`} title="Purple" />
                <button onClick={() => changeAccent('blue')} className={`w-6 h-6 rounded-full bg-[#3b82f6] ${accent === 'blue' ? 'ring-2 ring-offset-2 ring-[#3b82f6]' : ''}`} title="Blue" />
              </div>
              
              <div className="text-xs text-[var(--c-text-lighter)] mb-2 px-1 uppercase tracking-wider font-bold">Font Size</div>
              <div className="flex items-center justify-between px-1 mb-1">
                 <button 
                    onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                    className="p-1 rounded hover:bg-[var(--c-bg-light)] text-[var(--c-text)]"
                    disabled={fontSize <= 12}
                 >
                    A-
                 </button>
                 <span className="text-sm font-medium text-[var(--c-text)]">{fontSize}px</span>
                 <button 
                    onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                    className="p-1 rounded hover:bg-[var(--c-bg-light)] text-[var(--c-text)]"
                    disabled={fontSize >= 24}
                 >
                    A+
                 </button>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-[var(--c-bg-light)] text-[var(--c-text-light)] transition-colors"
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </header>
  );
}
