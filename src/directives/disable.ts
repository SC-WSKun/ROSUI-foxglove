import type { Directive, DirectiveBinding } from 'vue';

const setBtnsDisable = (el: Element, disabled: boolean) => {
  const btns = el.querySelectorAll('button');
  btns.forEach((btn: HTMLButtonElement) => {
    const notDisabled = !!btn.getAttribute('data-notDisable');
    if (notDisabled) btn.disabled = false;
    else btn.disabled = disabled;
  });
}

export const disableDirective: Directive = {
  beforeMount(el: Element, binding: DirectiveBinding) {
    setBtnsDisable(el, binding.value);
  },
  updated(el: Element, binding: DirectiveBinding) {
    setBtnsDisable(el, binding.value);
  },
  unmounted(el: Element) {
    setBtnsDisable(el, false);
  }
}