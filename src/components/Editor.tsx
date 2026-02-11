import { useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { codeBlockHighlight, linkHighlightPlugin, linkClickHandler, tableEditorField, blockquotePlugin, headerPlugin, imagePreviewPlugin } from './EditorExtensions';

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
    imagePreviewPlugin,
    EditorView.theme({
        "&": {
            backgroundColor: "transparent !important",
            height: "100%",
            fontSize: `${fontSize}px`
        },
        ".cm-scroller": {
            fontFamily: "var(--font-code) !important",
            lineHeight: "1.6"
        },
        ".cm-content": {
            padding: "2rem 0"
        },
        ".cm-gutters": {
            backgroundColor: "transparent !important",
            borderRight: "none !important",
            color: "var(--c-text-lighter)"
        },
        // Table Widget Styles
        ".cm-md-table-widget": {
            borderCollapse: "collapse",
            margin: "1em 0",
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
        ".cm-header-1": { fontSize: "2.0em", fontWeight: "bold", color: "var(--c-text)" },
        ".cm-header-2": { fontSize: "1.75em", fontWeight: "bold", color: "var(--c-text)" },
        ".cm-header-3": { fontSize: "1.5em", fontWeight: "bold", color: "var(--c-text)" },
        ".cm-header-4": { fontSize: "1.25em", fontWeight: "bold", color: "var(--c-text)" },
        ".cm-header-5": { fontSize: "1.1em", fontWeight: "bold", color: "var(--c-text)" },
        ".cm-header-6": { fontSize: "1.0em", fontWeight: "bold", color: "var(--c-text-light)", fontStyle: "italic" }
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
            highlightSelectionMatches: true,
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
