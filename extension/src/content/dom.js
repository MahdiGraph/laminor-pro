/* Laminor Pro — small DOM helpers shared by the content-script modules. */
(function (root) {
  'use strict';

  const LP = (root.LaminorPro = root.LaminorPro || {});
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

  function setProps(el, props) {
    for (const [key, value] of Object.entries(props || {})) {
      if (value == null || value === false) continue;
      if (key === 'class') el.setAttribute('class', value);
      else if (key === 'dataset') Object.assign(el.dataset, value);
      else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : String(value));
    }
  }

  function append(el, children) {
    for (const child of children.flat(Infinity)) {
      if (child == null || child === false) continue;
      el.append(child instanceof Node ? child : String(child));
    }
  }

  /** h('button', { class: 'x', onclick }, 'label') */
  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    setProps(el, props);
    append(el, children);
    return el;
  }

  function svg(tag, props, ...children) {
    const el = document.createElementNS(SVG_NS, tag);
    setProps(el, props);
    append(el, children);
    return el;
  }

  function faDigits(value) {
    return String(value).replace(/\d/g, (d) => FA_DIGITS[d]);
  }

  LP.dom = { h, svg, faDigits };
})(typeof globalThis !== 'undefined' ? globalThis : this);
