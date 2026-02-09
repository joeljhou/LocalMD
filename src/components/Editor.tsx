import { useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { codeBlockHighlight, linkHighlightPlugin, linkClickHandler } from './EditorExtensions';

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
        }
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
