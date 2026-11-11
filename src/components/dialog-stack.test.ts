import { handleDialogKeyDown, openDialog, tabbableElements } from './dialog-stack';

function makeRoot(html: string): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.append(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('tabbableElements', () => {
  it('skips elements inside a hidden ancestor', () => {
    const root = makeRoot(`
      <div style="display: none"><div><button id="in-not-displayed">x</button></div></div>
      <div style="visibility: hidden"><button id="in-invisible">x</button></div>
      <div style="visibility: hidden"><button style="visibility: visible" id="visible-again">x</button></div>
      <div inert><button id="in-inert">x</button></div>
      <button id="shown">x</button>
    `);

    expect(tabbableElements(root).map((element) => element.id)).toEqual(['visible-again', 'shown']);
  });

  it('keeps only what Tab can reach', () => {
    const root = makeRoot(`
      <button id="a">a</button>
      <input type="hidden" id="hidden-input" />
      <button disabled id="disabled">x</button>
      <fieldset disabled><input id="in-disabled-fieldset" /></fieldset>
      <button tabindex="-1" id="minus-one">x</button>
      <div tabindex="0" id="div">div</div>
      <details><summary id="summary">More</summary></details>
      <div hidden><button id="in-hidden">x</button></div>
      <button style="display: none" id="not-displayed">x</button>
      <a id="no-href">no href</a>
      <a href="#" id="link">link</a>
      <select id="select"></select>
      <textarea id="textarea"></textarea>
    `);

    expect(tabbableElements(root).map((element) => element.id)).toEqual([
      'a',
      'div',
      'summary',
      'link',
      'select',
      'textarea',
    ]);
  });
});

describe('openDialog', () => {
  it('lets only the last open dialog be the topmost', () => {
    const lower = openDialog();
    const upper = openDialog();
    expect(upper.isTopmost()).toBe(true);
    expect(lower.isTopmost()).toBe(false);

    upper.close();
    expect(lower.isTopmost()).toBe(true);
    lower.close();
  });
});

describe('handleDialogKeyDown', () => {
  it('ignores keys when the dialog is not the topmost', () => {
    const onEscape = vi.fn();
    handleDialogKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }), null, false, onEscape);
    expect(onEscape).not.toHaveBeenCalled();

    handleDialogKeyDown(new KeyboardEvent('keydown', { key: 'Escape' }), null, true, onEscape);
    expect(onEscape).toHaveBeenCalledOnce();
  });
});
