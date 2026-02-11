import { useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';
import { 
    codeBlockHighlight, 
    linkHighlightPlugin, 
    linkClickHandler, 
    tableEditorField, 
    blockquotePlugin, 
    headerPlugin, 
    imagePreviewPlugin,
    inlineStylePlugin,
    toggleStyle
} from './EditorExtensions';

interface EditorProps {
  value: string;
  onChange: (value: string) => void;
  theme: 'light' | 'dark';
  onScroll?: (scrollTop: number) => void;
  fontSize: number;
}

export function Editor({ value, onChange, theme, onScroll, fontSize }: EditorProps) {
  const editorRef = useRef<EditorView | null>(null);

  const handleCreateEditor = (view: EditorView) => {
    editorRef.current = view;
    
    // Add scroll listener
    const scrollDom = view.scrollDOM;
    if (scrollDom) {
      scrollDom.addEventListener('scroll', () => {
        if (onScroll) {
            // Calculate percentage or pixel value
            // For simple sync, we pass scrollTop. 
            // For ratio sync (better), we might need scrollHeight
            const { scrollTop, scrollHeight, clientHeight } = scrollDom;
            const scrollRatio = scrollTop / (scrollHeight - clientHeight);
            onScroll(scrollRatio);
        }
      });
    }
  };

  const extensions = [
    markdown({ base: markdownLanguage, codeLanguages: languages }),
    codeBlockHighlight,
    linkHighlightPlugin,
    linkClickHandler,
    tableEditorField,
    blockquotePlugin,
    headerPlugin,
    inlineStylePlugin,
    imagePreviewPlugin,
    Prec.highest(keymap.of([
        { key: "Mod-b", run: (view) => toggleStyle(view, "**") },
        { key: "Mod-i", run: (view) => toggleStyle(view, "*") },
        { key: "Mod-u", run: (view) => toggleStyle(view, "<u>", "</u>") },
        { key: "Mod-Shift-x", run: (view) => toggleStyle(view, "~~") },
        { key: "`", run: (view) => {
            if (view.state.selection.main.empty) return false;
            return toggleStyle(view, "`");
        }}
    ])),
    EditorView.theme({
        "&": {
            backgroundColor: "transparent !important",
            height: "100%",
            fontSize: `${fontSize}px`
        },
        ".cm-scroller": {
            fontFamily: "var(--font-code) !important",
            lineHeight: "1.6",
            padding: "0"
        },
        ".cm-content, .cm-gutters": {
            minHeight: "100%",
            paddingTop: "2rem !important",
            paddingBottom: "2rem !important"
        },
        ".cm-content": {
            paddingLeft: "0",
            paddingRight: "0"
        },
        ".cm-gutters": {
            backgroundColor: "transparent !important",
            borderRight: "none !important",
            color: "var(--c-text-lighter)"
        },
        ".cm-line": {
            padding: "0 2px 0 4px"
        },
        ".cm-gutter-element": {
            padding: "0 10px !important"
        },
        // Table Widget Styles
        ".cm-md-table-widget": {
            borderCollapse: "collapse",
            margin: "0",
            fontSize: "0.9em",
            userSelect: "none"
        },
        ".cm-md-table-cell": {
            border: "1px solid var(--c-border)",
            padding: "6px 12px",
            minWidth: "50px",
            cursor: "text",
            transition: "background-color 0.2s"
        },
        ".cm-md-table-cell:hover": {
            backgroundColor: "var(--c-bg-light)"
        },
        ".cm-md-table-cell th": {
            fontWeight: "bold",
            backgroundColor: "var(--c-bg-light)"
        },
        ".cm-md-table-cell-input": {
            width: "100%",
            border: "none",
            background: "var(--c-bg)",
            color: "var(--c-text)",
            fontFamily: "inherit",
            fontSize: "inherit",
            outline: "2px solid var(--c-brand)",
            borderRadius: "2px",
            padding: "2px 4px"
        },
        // Blockquote Styles
        ".cm-blockquote-line": {
            borderLeft: "4px solid var(--c-border)",
            paddingLeft: "1em !important", // Override default padding
            color: "var(--c-text-light)"
        },
        ".cm-blockquote-mark": {
            color: "var(--c-text-lighter)",
            opacity: "0.5",
            marginRight: "0.5em"
        },
        // Header Styles
        ".cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6": {
            textDecoration: "none !important",
            borderBottom: "none !important",
            boxShadow: "none !important",
            outline: "none !important",
            backgroundImage: "none !important",
            borderImage: "none !important",
            color: theme === 'dark' ? "#e6e6e6 !important" : "var(--c-text)"
        },
        // Target the line element directly for themes that apply borders there
        ".cm-line.cm-header-1, .cm-line.cm-header-2, .cm-line.cm-header-3, .cm-line.cm-header-4, .cm-line.cm-header-5, .cm-line.cm-header-6": {
            borderBottom: "none !important",
            boxShadow: "none !important",
            backgroundImage: "none !important"
        },
        ".cm-header-1 span, .cm-header-2 span, .cm-header-3 span, .cm-header-4 span, .cm-header-5 span, .cm-header-6 span": {
            color: "inherit",
            textDecoration: "none !important"
        },
        ".cm-header-mark": { color: "#666666 !important" },
        ".cm-header-1": { fontSize: "2.0em", fontWeight: "bold", lineHeight: "1.2" },
        ".cm-header-2": { fontSize: "1.75em", fontWeight: "bold", lineHeight: "1.2" },
        ".cm-header-3": { fontSize: "1.5em", fontWeight: "bold", lineHeight: "1.2" },
        ".cm-header-4": { fontSize: "1.25em", fontWeight: "bold", lineHeight: "1.2" },
        ".cm-header-5": { fontSize: "1.1em", fontWeight: "bold", lineHeight: "1.2" },
        ".cm-header-6": { fontSize: "1.0em", fontWeight: "bold", fontStyle: "italic", lineHeight: "1.2" },
        // Inline Styles
        ".cm-inline-code": {
            backgroundColor: "var(--c-bg-light)",
            color: "#d9712b",
            fontFamily: "var(--font-code)",
            padding: "2px 4px",
            borderRadius: "4px",
            fontSize: "0.9em"
        },
        ".cm-bold": { fontWeight: "bold" },
        ".cm-italic": { fontStyle: "italic" },
        ".cm-underline": { textDecoration: "underline" },
        ".cm-strikethrough": { textDecoration: "line-through" },
        ".cm-hidden-symbol": { display: "none" },
        ".cm-semantic-active": {
            // No background color to avoid confusion with selection
            // Just having the symbols appear is enough indication of focus
        },
        // Selection highlight enhancement
        // Removed .cm-selectionMatch as highlightSelectionMatches is disabled
    })
  ];

  return (
    <div className="h-full w-full bg-[var(--c-bg)] transition-colors duration-200">
      <CodeMirror
        value={value}
        height="100%"
        extensions={extensions}
        onChange={onChange}
        theme={theme === 'dark' ? oneDark : 'light'}
        onCreateEditor={handleCreateEditor}
        className="h-full"
        basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            history: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: false, // Disable highlighting same content
            closeBracketsKeymap: true,
            defaultKeymap: true,
            searchKeymap: true,
            historyKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
        }}
      />
    </div>
  );
}
