export function prepareHtmlForPrint(html: string): string {
    if (!html) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const boxes = Array.from(doc.querySelectorAll('.canvas-box'));

    // Container novo em fluxo normal
    const container = document.createElement('div');

    boxes
        .sort((a, b) => {
            const topA = parseInt((a as HTMLElement).style.top || '0');
            const topB = parseInt((b as HTMLElement).style.top || '0');
            return topA - topB;
        })
        .forEach((box) => {
            const el = box as HTMLElement;

            const wrapper = document.createElement('div');

            wrapper.style.position = 'relative';
            wrapper.style.marginBottom = '12px';
            wrapper.style.width = '100%';

            wrapper.innerHTML = el.innerHTML;

            container.appendChild(wrapper);
        });

    return container.innerHTML;
}