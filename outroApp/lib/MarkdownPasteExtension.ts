import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { DOMParser as PMDOMParser } from '@tiptap/pm/model';
import { marked } from 'marked';

/**
 * Extensão customizada do Tiptap que detecta markdown no paste
 * e converte para HTML automaticamente.
 */
export const MarkdownPaste = Extension.create({
  name: 'markdownPaste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdownPaste'),
        props: {
          handleDOMEvents: {
            paste(view, event: ClipboardEvent) {
              const text = event.clipboardData?.getData('text/plain');
              if (!text) return false;

              // Detecta se parece ser markdown (tem #, **, -, etc)
              const isLikelyMarkdown = /[#\*\->`=~_\[\]]/.test(text);

              if (!isLikelyMarkdown) return false;

              event.preventDefault();

              try {
                // Converte markdown para HTML (marked.lexer + marked.parser é síncrono)
                const tokens = marked.lexer(text);
                const html = marked.parser(tokens);

                // Parse do HTML para ProseMirror nodes
                const { schema } = view.state;
                const domParser = PMDOMParser.fromSchema(schema);
                const doc = new DOMParser().parseFromString(html, 'text/html');
                
                const slice = domParser.parseSlice(doc.body);

                const { $from, $to } = view.state.selection;
                const tr = view.state.tr.replaceRange($from.pos, $to.pos, slice);
                view.dispatch(tr);

                return true;
              } catch (error) {
                console.error('Erro ao parsear markdown:', error);
                return false;
              }
            }
          }
        }
      })
    ];
  }
});
