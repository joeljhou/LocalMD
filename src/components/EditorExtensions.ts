import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate, WidgetType, hoverTooltip } from '@codemirror/view';
import { syntaxTree, ensureSyntaxTree } from '@codemirror/language';
import { type Range, StateField, type EditorState, EditorSelection } from '@codemirror/state';

// --- Helper: Wrap Selection with Symbols ---
export const toggleStyle = (view: EditorView, symbol: string, endSymbol?: string): boolean => {
  const { state } = view;
  const { selection } = state;
  const endSym = endSymbol || symbol;

  const changes = selection.ranges.map(range => {
    const text = state.sliceDoc(range.from, range.to);
    
    // 1. Check if the selection itself is already wrapped
    if (text.startsWith(symbol) && text.endsWith(endSym) && text.length >= (symbol.length + endSym.length)) {
      const innerText = text.slice(symbol.length, -endSym.length);
      return {
        from: range.from,
        to: range.to,
        insert: innerText,
        range: EditorSelection.range(range.from, range.from + innerText.length)
      };
    }

    // 2. Check if symbols are immediately outside the selection
    const before = state.sliceDoc(range.from - symbol.length, range.from);
    const after = state.sliceDoc(range.to, range.to + endSym.length);
    
    if (before === symbol && after === endSym) {
      // Unwrap
      return {
        from: range.from - symbol.length,
        to: range.to + endSym.length,
        insert: text,
        range: EditorSelection.range(range.from - symbol.length, range.to - symbol.length)
      };
    }

    // 3. Otherwise: Wrap
    return {
      from: range.from,
      to: range.to,
      insert: symbol + text + endSym,
      range: EditorSelection.range(range.from + symbol.length, range.to + symbol.length)
    };
  });

  view.dispatch({
    changes: changes.map(c => ({ from: c.from, to: c.to, insert: c.insert })),
    selection: EditorSelection.create(changes.map(c => c.range)),
    userEvent: 'input.style'
  });

  return true;
};

const codeBlockClass = 'cm-code-block-bg';

// --- Helper: Deduplicate Decorations (Optimized) ---
function deduplicateDecorations(decorations: Range<Decoration>[]): Range<Decoration>[] {
  if (decorations.length <= 1) return decorations;
  
  // Sort by 'from' position, then by 'to' position
  // This is the most expensive part, but necessary for Decoration.set
  decorations.sort((a, b) => a.from - b.from || a.to - b.to);
  
  const uniqueDecorations: Range<Decoration>[] = [];
  let lastFrom = -1;
  let lastTo = -1;
  let lastValue = null;
  
  for (const deco of decorations) {
    if (deco.from !== lastFrom || deco.to !== lastTo || deco.value !== lastValue) {
      uniqueDecorations.push(deco);
      lastFrom = deco.from;
      lastTo = deco.to;
      lastValue = deco.value;
    }
  }
  return uniqueDecorations;
}

// --- Code Block Highlighting ---

const codeBlockLineDecoration = Decoration.line({ class: codeBlockClass });

function getDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const doc = state.doc;

  // Ensure syntax tree is available for the current visible ranges
  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(state, to, 50);
    if (!tree) continue;

    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'FencedCode') {
          const startLine = doc.lineAt(node.from);
          const endLine = doc.lineAt(node.to);
          
          const startLineNumber = startLine.number + 1;
          
          let endLineNumber = endLine.number;
          const endLineText = endLine.text.trim();
          if (endLineText.startsWith('```') || endLineText.startsWith('~~~')) {
            endLineNumber = endLine.number - 1;
          }

          const visibleStart = doc.lineAt(from).number;
          const visibleEnd = doc.lineAt(to).number;
          
          const effectiveStart = Math.max(startLineNumber, visibleStart);
          const effectiveEnd = Math.min(endLineNumber, visibleEnd);

          for (let i = effectiveStart; i <= effectiveEnd; i++) {
            if (i > doc.lines) continue;
            
            const line = doc.line(i);
             decorations.push(codeBlockLineDecoration.range(line.from));
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
                decorations.push(codeBlockLineDecoration.range(line.from));
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
    const tree = ensureSyntaxTree(state, to, 50);
    if (!tree) continue;

    tree.iterate({
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
               do {
                   // Look for URL
                   if (cursor.name === 'URL') {
                       urlStart = cursor.from;
                       urlEnd = cursor.to;
                       urlContent = state.sliceDoc(urlStart, urlEnd);
                   }
               } while (cursor.nextSibling());
           }
           
           // 1. Decorate Entire Link (Text + URL) with Blue Color
           decorations.push(Decoration.mark({
             class: 'cm-md-link-text'
           }).range(node.from, node.to));

           // 2. Collapse URL if cursor NOT inside
           if (urlStart !== -1 && urlEnd !== -1 && !isCursorInside) {
              // Ensure the URL doesn't span multiple lines (unlikely for Markdown URLs but safe to check)
              const startLine = state.doc.lineAt(urlStart);
              const endLine = state.doc.lineAt(urlEnd);
              
              if (startLine.number === endLine.number) {
                  decorations.push(Decoration.replace({
                    widget: new EllipsisWidget(urlContent, urlStart)
                  }).range(urlStart, urlEnd));
              }
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

  // Reconstruct markdown table from 2D array
  private generateTable(data: string[][]): string {
    // Simple generation without alignment padding for now
    return data.map(row => `| ${row.join(' | ')} |`).join('\n');
  }

  // Parse markdown table to 2D array
  private parseTable(raw: string): string[][] {
    const lines = raw.split('\n').filter(line => line.trim() !== '');
    return lines.map(line => {
      // Split by pipe, handle escaped pipes if possible (simplified here)
      let row = line.split('|').map(cell => cell.trim());
      // Remove first and last empty strings if they exist (standard markdown table format)
      if (row[0] === '') row.shift();
      if (row[row.length - 1] === '') row.pop();
      return row;
    });
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

function getTableDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const selection = state.selection.main;
  const tree = syntaxTree(state);

  tree.iterate({
    enter: (node) => {
      if (node.name === 'Table') {
        const isCursorInside = selection.head >= node.from && selection.head <= node.to;

        if (!isCursorInside) {
          const tableText = state.sliceDoc(node.from, node.to);
          decorations.push(Decoration.replace({
            widget: new TableWidget(tableText, node.from),
            block: true
          }).range(node.from, node.to));
        } else {
            // Optional: You could add table line styling here if needed, 
            // but for now we'll just keep the default behavior when focused
        }
      }
    }
  });

  return Decoration.set(deduplicateDecorations(decorations));
}

export const tableEditorField = StateField.define<DecorationSet>({
  create(state) {
    return getTableDecorations(state);
  },
  update(decorations, tr) {
    if (tr.docChanged || tr.selection) {
      return getTableDecorations(tr.state);
    }
    return decorations.map(tr.changes);
  },
  provide: f => EditorView.decorations.from(f)
});

// --- Inline Styles (WYSIWYG) ---

// Pre-create common decorations
const inlineCodeDecoration = Decoration.mark({ class: 'cm-inline-code' });
const inlineCodeActiveDecoration = Decoration.mark({ class: 'cm-inline-code cm-semantic-active' });
const boldDecoration = Decoration.mark({ class: 'cm-bold' });
const boldActiveDecoration = Decoration.mark({ class: 'cm-bold cm-semantic-active' });
const italicDecoration = Decoration.mark({ class: 'cm-italic' });
const italicActiveDecoration = Decoration.mark({ class: 'cm-italic cm-semantic-active' });
const strikethroughDecoration = Decoration.mark({ class: 'cm-strikethrough' });
const strikethroughActiveDecoration = Decoration.mark({ class: 'cm-strikethrough cm-semantic-active' });
const underlineDecoration = Decoration.mark({ class: 'cm-underline' });
const underlineActiveDecoration = Decoration.mark({ class: 'cm-underline cm-semantic-active' });
const hiddenSymbolDecoration = Decoration.mark({ class: 'cm-hidden-symbol' });

function getInlineStyleDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const selection = state.selection.main;

  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(state, to, 50);
    if (!tree) continue;

    tree.iterate({
      from,
      to,
      enter: (node) => {
        const isCursorInside = selection.head >= node.from && selection.head <= node.to;

        // 1. Inline Code
        if (node.name === 'InlineCode') {
          decorations.push((isCursorInside ? inlineCodeActiveDecoration : inlineCodeDecoration).range(node.from, node.to));
        }

        // 2. Bold (StrongEmphasis)
        if (node.name === 'StrongEmphasis') {
          decorations.push((isCursorInside ? boldActiveDecoration : boldDecoration).range(node.from, node.to));
          if (!isCursorInside) {
            const cursor = node.node.cursor();
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'EmphasisMark') {
                  decorations.push(hiddenSymbolDecoration.range(cursor.from, cursor.to));
                }
              } while (cursor.nextSibling());
            }
          }
        }

        // 3. Italic (Emphasis)
        if (node.name === 'Emphasis') {
          decorations.push((isCursorInside ? italicActiveDecoration : italicDecoration).range(node.from, node.to));
          if (!isCursorInside) {
            const cursor = node.node.cursor();
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'EmphasisMark') {
                  decorations.push(hiddenSymbolDecoration.range(cursor.from, cursor.to));
                }
              } while (cursor.nextSibling());
            }
          }
        }

        // 4. Strikethrough
        if (node.name === 'Strikethrough') {
          decorations.push((isCursorInside ? strikethroughActiveDecoration : strikethroughDecoration).range(node.from, node.to));
          if (!isCursorInside) {
            const cursor = node.node.cursor();
            if (cursor.firstChild()) {
              do {
                if (cursor.name === 'StrikethroughMark') {
                  decorations.push(hiddenSymbolDecoration.range(cursor.from, cursor.to));
                }
              } while (cursor.nextSibling());
            }
          }
        }

        // 5. Underline (<u>内容</u>)
        if (node.name === 'HTMLTag') {
            const text = state.sliceDoc(node.from, node.to).toLowerCase();
            if (text.startsWith('<u>')) {
                let pos = node.to;
                const endPos = Math.min(state.doc.length, node.to + 1000);
                const docText = state.sliceDoc(pos, endPos);
                const closeIndex = docText.toLowerCase().indexOf('</u>');
                
                if (closeIndex !== -1) {
                    const contentStart = node.to;
                    const contentEnd = node.to + closeIndex;
                    const closeTagStart = contentEnd;
                    const closeTagEnd = closeTagStart + 4;
                    
                    const isAnyPartFocused = (selection.head >= node.from && selection.head <= closeTagEnd);

                    decorations.push((isAnyPartFocused ? underlineActiveDecoration : underlineDecoration).range(contentStart, contentEnd));
                    
                    if (!isAnyPartFocused) {
                        decorations.push(hiddenSymbolDecoration.range(node.from, node.to));
                        decorations.push(hiddenSymbolDecoration.range(closeTagStart, closeTagEnd));
                    }
                } else {
                    if (!isCursorInside) {
                        decorations.push(hiddenSymbolDecoration.range(node.from, node.to));
                    }
                }
            } else if (text === '</u>') {
                const startPos = Math.max(0, node.from - 1000);
                const docTextBefore = state.sliceDoc(startPos, node.from);
                const openIndex = docTextBefore.toLowerCase().lastIndexOf('<u>');
                
                if (openIndex !== -1) {
                    const openTagStart = startPos + openIndex;
                    const isAnyPartFocused = (selection.head >= openTagStart && selection.head <= node.to);
                    if (!isAnyPartFocused) {
                        decorations.push(hiddenSymbolDecoration.range(node.from, node.to));
                    }
                } else {
                    if (!isCursorInside) {
                        decorations.push(hiddenSymbolDecoration.range(node.from, node.to));
                    }
                }
            }
        }
      }
    });
  }

  return Decoration.set(deduplicateDecorations(decorations));
}

export const inlineStylePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = getInlineStyleDecorations(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = getInlineStyleDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);

// --- Blockquote Styling ---

const blockquoteLineDecoration = Decoration.line({ class: 'cm-blockquote-line' });
const blockquoteMarkDecoration = Decoration.mark({ class: 'cm-blockquote-mark' });

function getBlockquoteDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const doc = state.doc;

  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(state, to, 50);
    if (!tree) continue;

    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (node.name === 'Blockquote') {
            const startLine = doc.lineAt(node.from);
            const endLine = doc.lineAt(node.to);

            const visibleStart = doc.lineAt(from).number;
            const visibleEnd = doc.lineAt(to).number;
            
            const effectiveStart = Math.max(startLine.number, visibleStart);
            const effectiveEnd = Math.min(endLine.number, visibleEnd);

            for (let i = effectiveStart; i <= effectiveEnd; i++) {
                const line = doc.line(i);
                decorations.push(blockquoteLineDecoration.range(line.from));
            }
        }
        
        if (node.name === 'QuoteMark') {
            decorations.push(blockquoteMarkDecoration.range(node.from, node.to));
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

// Pre-create common decorations to avoid object allocation during updates
const headerLineDecorations = [
  Decoration.line({ class: 'cm-header-1' }),
  Decoration.line({ class: 'cm-header-2' }),
  Decoration.line({ class: 'cm-header-3' }),
  Decoration.line({ class: 'cm-header-4' }),
  Decoration.line({ class: 'cm-header-5' }),
  Decoration.line({ class: 'cm-header-6' })
];
const headerMarkDecoration = Decoration.mark({ class: 'cm-header-mark' });
const hiddenHeaderReplace = Decoration.replace({});

function getHeaderDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const { state } = view;
  const selection = state.selection.main;

  for (const { from, to } of view.visibleRanges) {
    const tree = ensureSyntaxTree(state, to, 50);
    if (!tree) continue;

    tree.iterate({
      from,
      to,
      enter: (node) => {
        if (node.name.startsWith('ATXHeading')) {
          const level = parseInt(node.name.slice(-1));
          if (isNaN(level) || level < 1 || level > 6) return;

          const line = state.doc.lineAt(node.from);
          const isCursorInside = selection.head >= line.from && selection.head <= line.to;
          
          // Apply heading style to the entire line
          decorations.push(headerLineDecorations[level - 1].range(line.from));

          // Handle # symbols
          const cursor = node.node.cursor();
          if (cursor.firstChild()) {
            do {
              if (cursor.name === 'HeaderMark') {
                if (!isCursorInside) {
                  // Hide # symbols AND the space after them when cursor is NOT inside
                  let end = cursor.to;
                  if (state.doc.sliceString(cursor.to, cursor.to + 1) === ' ') {
                    end++;
                  }
                  decorations.push(hiddenHeaderReplace.range(cursor.from, end));
                } else {
                  // Show # symbols with custom color when cursor IS inside
                  decorations.push(headerMarkDecoration.range(cursor.from, cursor.to));
                }
              }
            } while (cursor.nextSibling());
          }
        } else if (node.name === 'SetextHeading1' || node.name === 'SetextHeading2') {
          const level = node.name.endsWith('1') ? 1 : 2;
          const line = state.doc.lineAt(node.from);
          
          decorations.push(headerLineDecorations[level - 1].range(line.from));

          const nodeIsActive = selection.head >= node.from && selection.head <= node.to;
          if (!nodeIsActive) {
             const cursor = node.node.cursor();
             if (cursor.firstChild()) {
                 do {
                     if (cursor.name === 'HeaderMark') {
                         decorations.push(hiddenHeaderReplace.range(cursor.from, cursor.to));
                     }
                 } while (cursor.nextSibling());
             }
          }
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
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
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
