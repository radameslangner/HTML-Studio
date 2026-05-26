import { Node, mergeAttributes } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    root: {
      /**
       * Insere uma raiz/radical com índice e radicando.
       * O radicando pode conter conteúdo inline, incluindo frações.
       */
      insertRoot: (options: { index: string; radicand: string }) => ReturnType;
    };
  }
}

export const Root = Node.create({
  name: 'root',
  inline: true,
  group: 'inline',

  // NÃO é atom: o radicando é conteúdo editável real do ProseMirror
  atom: false,
  selectable: true,
  draggable: false,

  // O radicando pode conter qualquer conteúdo inline, inclusive frações
  content: 'inline*',

  addAttributes() {
    return {
      index: {
        default: '2',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="root"]',
        getAttrs: (dom) => {
          const element = dom as HTMLElement;
          return {
            index: element.querySelector('.root-index')?.textContent || '2',
          };
        },
        // O conteúdo (radicando) é extraído do .root-radicand
        contentElement: '.root-radicand',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({ 'data-type': 'root', class: 'math-root' }),
      ['span', { class: 'root-index', contenteditable: 'false' }, HTMLAttributes.index || '2'],
      ['span', { class: 'root-symbol', contenteditable: 'false' }, '√'],
      // O "0" é o "content hole": onde o ProseMirror insere os filhos do nó
      ['span', { class: 'root-radicand' }, 0],
    ];
  },

  addCommands() {
    return {
      insertRoot:
        (options: { index: string; radicand: string }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              index: options.index || '2',
            },
            // O radicando é inserido como conteúdo de texto inicial
            content: options.radicand
              ? [{ type: 'text', text: options.radicand }]
              : [],
          });
        },
    };
  },
});
