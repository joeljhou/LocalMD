import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { type Range } from '@codemirror/state';

const codeBlockClass = 'cm-code-block-bg';

// --- Code Block Highlighting ---

function getDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const doc = state.doc;

  // 1. Syntax Tree based highlighting for FencedCode
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'FencedCode') {
          const startLine = doc.lineAt(node.from);
          const endLine = doc.lineAt(node.to);
          
          // Start from the line AFTER the opening delimiter
          const startLineNumber = startLine.number + 1;
          
          // Determine where to end
          let endLineNumber = endLine.number;
          const endLineText = endLine.text.trim();
          if (endLineText.startsWith('```') || endLineText.startsWith('~~~')) {
            endLineNumber = endLine.number - 1;
          }

          // Apply decoration to content lines
          for (let i = startLineNumber; i <= endLineNumber; i++) {
            if (i > doc.lines) continue;
            
            const line = doc.line(i);
             decorations.push(Decoration.line({
              class: codeBlockClass
            }).range(line.from));
          }
        }
      },
    });
  }

  // 2. Regex based highlighting for Front Matter
  if (doc.lines > 0) {
    const firstLine = doc.line(1);
    if (firstLine.text.trim() === '---') {
        let endLineNumber = -1;
        const maxLines = Math.min(doc.lines, 100);
        for (let i = 2; i <= maxLines; i++) {
            const line = doc.line(i);
            if (line.text.trim() === '---') {
                endLineNumber = i;
                break;
            }
        }

        if (endLineNumber !== -1) {
            for (let i = 2; i < endLineNumber; i++) {
                const line = doc.line(i);
                decorations.push(Decoration.line({
                    class: codeBlockClass
                }).range(line.from));
            }
        }
    }
  }

  decorations.sort((a, b) => a.from - b.from);

  const uniqueDecorations: Range<Decoration>[] = [];
  let lastFrom = -1;
  for (const deco of decorations) {
    if (deco.from !== lastFrom) {
      uniqueDecorations.push(deco);
      lastFrom = deco.from;
    }
  }

  return Decoration.set(uniqueDecorations);
}

export const codeBlockHighlight = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = getDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// --- Markdown Link Styling & Interaction ---

class EllipsisWidget extends WidgetType {
  private url: string;
  private urlStart: number;

  constructor(url: string, urlStart: number) {
    super();
    this.url = url;
    this.urlStart = urlStart;
  }

  toDOM(view: EditorView) {
    const span = document.createElement("span");
    span.className = "cm-md-link-url-hidden";
    span.textContent = "...";
    
    // Handle click interactions on the widget
    span.addEventListener("click", (e) => {
      // If Ctrl/Cmd + Click: Open URL
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        
        let url = this.url;
        if (url.startsWith('<') && url.endsWith('>')) {
          url = url.slice(1, -1);
        }
        if (url) {
            window.open(url, '_blank');
        }
      } 
      // Otherwise: Expand (by moving cursor to start of URL)
      else {
        e.preventDefault();
        e.stopPropagation();
        
        // Dispatch transaction to move cursor to start of URL
        view.dispatch({
            selection: { anchor: this.urlStart }
        });
        view.focus();
      }
    });
    
    return span;
  }
  
  eq(other: EllipsisWidget) {
      return other.url === this.url && other.urlStart === this.urlStart;
  }
}

function getLinkDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const selection = state.selection.main;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'Link') {
           const isCursorInside = selection.head >= node.from && selection.head <= node.to;
           
           let urlStart = -1;
           let urlEnd = -1;
           let urlContent = "";

           // Use a cursor to inspect children
           const cursor = node.node.cursor();
           if (cursor.firstChild()) {
               while (cursor.nextSibling()) {
                   // Look for URL
                   if (cursor.name === 'URL') {
                       urlStart = cursor.from;
                       urlEnd = cursor.to;
                       urlContent = state.sliceDoc(urlStart, urlEnd);
                   }
               }
           }
           
           // 1. Decorate Entire Link (Text + URL) with Blue Color
           decorations.push(Decoration.mark({
             class: 'cm-md-link-text'
           }).range(node.from, node.to));

           // 2. Collapse URL if cursor NOT inside
           if (urlStart !== -1 && urlEnd !== -1 && !isCursorInside) {
              decorations.push(Decoration.replace({
                widget: new EllipsisWidget(urlContent, urlStart)
              }).range(urlStart, urlEnd));
           }
        }
      }
    });
  }
  
  return Decoration.set(decorations.sort((a, b) => a.from - b.from));
}

export const linkHighlightPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getLinkDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = getLinkDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

export const linkClickHandler = EditorView.domEventHandlers({
  click: (event, view) => {
    // Only handle Ctrl/Cmd + Click for text part (widget handles itself)
    if (event.ctrlKey || event.metaKey) {
      const { clientX, clientY } = event;
      const pos = view.posAtCoords({ x: clientX, y: clientY });
      if (pos === null) return;

      const tree = syntaxTree(view.state);
      // resolveInner gives us the specific node at position
      let node = tree.resolveInner(pos, -1);
      
      // Traverse up to find Link
      while (node && node.name !== 'Link' && node.parent) {
        node = node.parent;
      }
      
      if (node && node.name === 'Link') {
        const urlNode = node.getChild('URL');
        if (urlNode) {
          let url = view.state.sliceDoc(urlNode.from, urlNode.to);
          if (url.startsWith('<') && url.endsWith('>')) {
            url = url.slice(1, -1);
          }
          if (url) {
             window.open(url, '_blank');
             event.preventDefault();
          }
        }
      }
    }
  }
});
