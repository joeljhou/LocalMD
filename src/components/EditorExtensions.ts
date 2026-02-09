import { EditorView, Decoration, type DecorationSet, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { type Range } from '@codemirror/state';

const codeBlockClass = 'cm-code-block-bg';

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
          // If the last line looks like a closing fence (``` or ~~~), exclude it.
          // Otherwise (unclosed block), include it.
          let endLineNumber = endLine.number;
          const endLineText = endLine.text.trim();
          if (endLineText.startsWith('```') || endLineText.startsWith('~~~')) {
            endLineNumber = endLine.number - 1;
          }

          // Apply decoration to content lines
          for (let i = startLineNumber; i <= endLineNumber; i++) {
            // Safety check for invalid line numbers (e.g. empty block where start > end)
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
            // Exclude first line (1) and last line (endLineNumber)
            // Highlight from 2 to endLineNumber - 1
            for (let i = 2; i < endLineNumber; i++) {
                const line = doc.line(i);
                decorations.push(Decoration.line({
                    class: codeBlockClass
                }).range(line.from));
            }
        }
    }
  }

  // Deduplicate and sort
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
