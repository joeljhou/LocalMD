import React from 'react';
import { Moon, Sun, FileUp, Save, Columns, Edit3, FolderOpen, Palette, Eye, PanelLeft, PanelLeftClose, Check, Minus, Plus } from 'lucide-react';
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
  onDoubleClick: () => void;
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
  onDoubleClick,
}: HeaderProps) {
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);

  return (
    <header 
      className="flex items-center justify-between px-4 py-3 border-b border-[var(--c-border)] bg-[var(--c-bg)] transition-colors duration-200"
      onDoubleClick={(e) => {
        // Only trigger if clicking the header background or the title area, not buttons
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('h1')) {
             onDoubleClick();
        }
      }}
    >
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
            <div className="absolute right-0 top-full mt-2 w-auto min-w-[120px] bg-[var(--c-bg)] border border-[var(--c-border)] rounded-xl shadow-xl p-2 z-50 flex flex-col gap-2">
              <div className="flex items-center justify-center space-x-2">
                <button 
                    onClick={() => changeAccent('default')} 
                    className={`w-6 h-6 rounded-full bg-[#3eaf7c] flex items-center justify-center transition-all ${accent === 'default' ? 'ring-2 ring-offset-2 ring-[#3eaf7c] ring-offset-[var(--c-bg)] scale-110' : 'hover:scale-110'}`} 
                    title="Green"
                >
                    {accent === 'default' && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
                <button 
                    onClick={() => changeAccent('purple')} 
                    className={`w-6 h-6 rounded-full bg-[#8b5cf6] flex items-center justify-center transition-all ${accent === 'purple' ? 'ring-2 ring-offset-2 ring-[#8b5cf6] ring-offset-[var(--c-bg)] scale-110' : 'hover:scale-110'}`} 
                    title="Purple"
                >
                    {accent === 'purple' && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
                <button 
                    onClick={() => changeAccent('blue')} 
                    className={`w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center transition-all ${accent === 'blue' ? 'ring-2 ring-offset-2 ring-[#3b82f6] ring-offset-[var(--c-bg)] scale-110' : 'hover:scale-110'}`} 
                    title="Blue"
                >
                    {accent === 'blue' && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>
              </div>
              
              <div className="h-px bg-[var(--c-border)] opacity-50" />
              
              <div className="flex items-center justify-between bg-[var(--c-bg-light)] rounded-lg p-1 border border-[var(--c-border)]">
                 <button 
                    onClick={() => setFontSize(Math.max(12, fontSize - 1))}
                    className="p-1 rounded-md hover:bg-[var(--c-bg)] hover:shadow-sm text-[var(--c-text)] transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                    disabled={fontSize <= 12}
                    title="Decrease font size"
                 >
                    <Minus size={14} />
                 </button>
                 <span className="text-xs font-bold text-[var(--c-text)] w-12 text-center tabular-nums">{fontSize}px</span>
                 <button 
                    onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                    className="p-1 rounded-md hover:bg-[var(--c-bg)] hover:shadow-sm text-[var(--c-text)] transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                    disabled={fontSize >= 24}
                    title="Increase font size"
                 >
                    <Plus size={14} />
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
