import { Node } from '@tiptap/core';

export const Fraction = Node.create({
  name: 'fraction',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      numerator: {
        default: '',
      },
      denominator: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span.fraction',
        getAttrs: dom => {
          const element = dom as HTMLElement;
          return {
            numerator: element.querySelector('.fraction-top')?.textContent || '',
            denominator: element.querySelector('.fraction-bottom')?.textContent || '',
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      { class: 'fraction' },
      ['span', { class: 'fraction-top' }, HTMLAttributes.numerator || ''],
      ['span', { class: 'fraction-bottom' }, HTMLAttributes.denominator || ''],
    ];
  },
});
