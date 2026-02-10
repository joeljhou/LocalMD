import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate, WidgetType, hoverTooltip } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { type Range } from '@codemirror/state';

const codeBlockClass = 'cm-code-block-bg';

// --- Helper: Deduplicate Decorations ---
function deduplicateDecorations(decorations: Range<Decoration>[]): Range<Decoration>[] {
  decorations.sort((a, b) => a.from - b.from || a.to - b.to);
  const uniqueDecorations: Range<Decoration>[] = [];
  let lastFrom = -1;
  let lastTo = -1;
  
  for (const deco of decorations) {
    if (deco.from !== lastFrom || deco.to !== lastTo) {
      uniqueDecorations.push(deco);
      lastFrom = deco.from;
      lastTo = deco.to;
    }
  }
  return uniqueDecorations;
}

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

  return Decoration.set(deduplicateDecorations(decorations));
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
  
  return Decoration.set(deduplicateDecorations(decorations));
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

// --- Table Editor Widget ---

class TableWidget extends WidgetType {
  private tableData: string[][];
  private rawTable: string;
  private startPos: number;

  constructor(rawTable: string, startPos: number) {
    super();
    this.rawTable = rawTable;
    this.startPos = startPos;
    this.tableData = this.parseTable(rawTable);
  }

  // Parse markdown table to 2D array
  private parseTable(raw: string): string[][] {
    return raw.split('\n')
      .filter(line => line.trim() !== '')
      .map(line => {
        // Split by pipe, handle escaped pipes if possible (simplified here)
        let row = line.split('|').map(cell => cell.trim());
        // Remove first and last empty strings if they exist (standard markdown table format)
        if (row[0] === '') row.shift();
        if (row[row.length - 1] === '') row.pop();
        return row;
      });
  }

  // Reconstruct markdown table from 2D array
  private generateTable(data: string[][]): string {
    // Simple generation without alignment padding for now
    return data.map(row => `| ${row.join(' | ')} |`).join('\n');
  }

  // Helper to render cell content with markdown links
  private renderCellContent(cell: HTMLElement, text: string) {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    let match;

    // Reset content
    cell.textContent = '';

    while ((match = linkRegex.exec(text)) !== null) {
      // Add text before the link
      if (match.index > lastIndex) {
        cell.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const linkText = match[1];
      const linkUrl = match[2];

      const a = document.createElement('a');
      a.textContent = linkText;
      a.href = linkUrl;
      a.target = '_blank';
      a.className = 'cm-md-link-text'; // Reuse existing link style
      
      // Handle click interactions
      a.addEventListener('click', (e) => {
          // If Ctrl/Cmd + Click: Open URL
          if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              e.stopPropagation();
              window.open(linkUrl, '_blank');
          } else {
              // If simple click: Prevent navigation, let it bubble to cell to trigger edit mode
              e.preventDefault();
          }
      });

      cell.appendChild(a);
      lastIndex = linkRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      cell.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
  }

  toDOM(view: EditorView) {
    const table = document.createElement('table');
    table.className = 'cm-md-table-widget';
    
    this.tableData.forEach((rowData, rowIndex) => {
      // Check if this is the separator row (usually just dashes)
      const isSeparator = rowData.every(cell => /^[-:]+$/.test(cell));
      
      // Skip rendering separator row as data, but we might want to keep it in data structure
      // Ideally we should style the table to look like it has a header
      
      const tr = document.createElement('tr');
      
      rowData.forEach((cellData, colIndex) => {
        const cell = rowIndex === 0 ? document.createElement('th') : document.createElement('td');
        
        // Handle separator row visualization (maybe just skip it in UI but keep in data?)
        // For editing, we need to preserve it.
        // Let's render it as a non-editable row or just hide it?
        // Hiding it is better for "WYSIWYG" feel.
        if (isSeparator) {
            tr.style.display = 'none'; 
            // We still create cells to maintain structure if we were showing it
            return;
        }

        // Render content (text + links)
        this.renderCellContent(cell, cellData);
        
        cell.className = 'cm-md-table-cell';
        
        // Click to edit
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation(); // Prevent editor from grabbing focus
          
          const input = document.createElement('input');
          input.value = cellData;
          input.className = 'cm-md-table-cell-input';
          
          const save = () => {
             const newValue = input.value;
             if (newValue !== cellData) {
                 // Update data
                 this.tableData[rowIndex][colIndex] = newValue;
                 // Reconstruct entire table string
                 const newTableString = this.generateTable(this.tableData);
                 
                 // Dispatch change to editor
                 // We need to calculate the length of the replaced content
                 view.dispatch({
                     changes: {
                         from: this.startPos,
                         to: this.startPos + this.rawTable.length,
                         insert: newTableString
                     }
                 });
             } else {
                 // Restore text if no change (re-render links)
                 this.renderCellContent(cell, cellData);
             }
          };

          input.addEventListener('blur', save);
          input.addEventListener('keydown', (e) => {
              if (e.key === 'Enter') {
                  input.blur();
              }
          });

          cell.textContent = '';
          cell.appendChild(input);
          input.focus();
        });

        tr.appendChild(cell);
      });
      
      table.appendChild(tr);
    });

    return table;
  }

  eq(other: TableWidget) {
    return other.rawTable === this.rawTable && other.startPos === this.startPos;
  }

  ignoreEvent(_event: Event): boolean {
    return true; // Let the widget handle its own events (like clicks)
  }
}

function getTableDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const selection = state.selection.main;

  // Use visibleRanges to avoid scanning entire doc (performance fix)
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
        from, to,
        enter: (node) => {
            if (node.name === 'Table') {
                // Check if cursor is inside the table
                const isCursorInside = selection.head >= node.from && selection.head <= node.to;

                if (!isCursorInside) {
                const tableText = state.sliceDoc(node.from, node.to);
                decorations.push(Decoration.replace({
                    widget: new TableWidget(tableText, node.from)
                }).range(node.from, node.to));
                }
            }
        }
    });
  }

  return Decoration.set(deduplicateDecorations(decorations));
}

export const tableEditorPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;
        constructor(view: EditorView) {
            this.decorations = getTableDecorations(view);
        }
        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = getTableDecorations(update.view);
            }
        }
    },
    { decorations: v => v.decorations }
);

// --- Blockquote Styling ---

function getBlockquoteDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'Blockquote') {
            // Add line decoration for the entire blockquote block
            // We need to identify lines covered by this blockquote
            const startLine = state.doc.lineAt(node.from);
            const endLine = state.doc.lineAt(node.to);

            for (let i = startLine.number; i <= endLine.number; i++) {
                const line = state.doc.line(i);
                decorations.push(Decoration.line({
                    class: 'cm-blockquote-line'
                }).range(line.from));
            }
        }
        
        if (node.name === 'QuoteMark') {
            // Fade out the '>' character
            decorations.push(Decoration.mark({
                class: 'cm-blockquote-mark'
            }).range(node.from, node.to));
        }
      }
    });
  }
  
  return Decoration.set(deduplicateDecorations(decorations));
}

export const blockquotePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getBlockquoteDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = getBlockquoteDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// --- Header Font Size & Styling ---

function getHeaderDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;

  for (const { from, to } of view.visibleRanges) {
    syntaxTree(state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name.startsWith('ATXHeading')) {
            // ATXHeading includes the hashes (e.g. "## Title")
            // We need to determine the level (1-6)
            // The first child is usually HeaderMark ("##")
            const headerMark = node.node.firstChild;
            if (headerMark && headerMark.name === 'HeaderMark') {
                const markText = state.sliceDoc(headerMark.from, headerMark.to);
                const level = markText.trim().length; // Count hashes
                
                if (level >= 1 && level <= 6) {
                     // Apply line decoration for the whole heading line
                     const line = state.doc.lineAt(node.from);
                     decorations.push(Decoration.line({
                         class: `cm-header-${level}`
                     }).range(line.from));
                }
            }
        } else if (node.name === 'SetextHeading1') {
             // Level 1: "Title\n==="
             const line = state.doc.lineAt(node.from);
             decorations.push(Decoration.line({
                 class: `cm-header-1`
             }).range(line.from));
        } else if (node.name === 'SetextHeading2') {
             // Level 2: "Title\n---"
             const line = state.doc.lineAt(node.from);
             decorations.push(Decoration.line({
                 class: `cm-header-2`
             }).range(line.from));
        }
      }
    });
  }

  return Decoration.set(deduplicateDecorations(decorations));
}

export const headerPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getHeaderDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = getHeaderDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// --- Image Preview Plugin ---

class ModifierKeyPluginValue {
    isCtrlPressed = false;
    private _handlers: { [key: string]: EventListener } = {};
    private _doc: Document | null = null;

    constructor(view: EditorView) {
      this._doc = view.contentDOM.ownerDocument;
      
      this._handlers = {
          keydown: (e: Event) => {
              const ke = e as KeyboardEvent;
              this.isCtrlPressed = ke.ctrlKey || ke.metaKey;
          },
          keyup: (e: Event) => {
              const ke = e as KeyboardEvent;
              this.isCtrlPressed = ke.ctrlKey || ke.metaKey;
          },
          mousemove: (e: Event) => {
              const me = e as MouseEvent;
              this.isCtrlPressed = me.ctrlKey || me.metaKey;
          }
      };

      if (this._doc) {
          this._doc.addEventListener('keydown', this._handlers.keydown);
          this._doc.addEventListener('keyup', this._handlers.keyup);
      }
      view.contentDOM.addEventListener('mousemove', this._handlers.mousemove);
    }

    destroy() {
      if (this._doc) {
          this._doc.removeEventListener('keydown', this._handlers.keydown);
          this._doc.removeEventListener('keyup', this._handlers.keyup);
      }
      // Note: contentDOM listeners are cleaned up with the element
    }
}

export const modifierKeyPlugin = ViewPlugin.fromClass(ModifierKeyPluginValue);

export const imagePreviewTooltip = hoverTooltip((view, pos, _side) => {
    // Check if Ctrl/Cmd is pressed using the plugin
    const plugin = view.plugin(modifierKeyPlugin);
    if (!plugin?.isCtrlPressed) return null;

    const { state } = view;
    let node = syntaxTree(state).resolveInner(pos, -1);
    
    // Traverse up to find Image
    while (node && node.name !== 'Image' && node.parent) {
        node = node.parent;
    }
    
    if (node && node.name === 'Image') {
        // Find URL
        const urlNode = node.getChild('URL');
        let url = "";
        
        if (urlNode) {
             url = state.sliceDoc(urlNode.from, urlNode.to);
        }
        
        if (url) {
            return {
                pos: node.from,
                end: node.to,
                above: true,
                create(_view) {
                    const dom = document.createElement("div");
                    dom.className = "cm-image-preview";
                    const img = document.createElement("img");
                    img.src = url;
                    img.style.maxWidth = "300px";
                    img.style.maxHeight = "300px";
                    img.style.display = "block";
                    img.style.borderRadius = "4px";
                    img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
                    img.style.backgroundColor = "var(--c-bg)";
                    dom.appendChild(img);
                    return { dom };
                }
            };
        }
    }
    
    return null;
});

export const imagePreviewPlugin = [
    modifierKeyPlugin,
    imagePreviewTooltip
];
