/* Studio-only preview rendering and sandbox communication. Never exported into email HTML. */
(function (root) {
  'use strict';
  const C = root.BlockCore;
  // Keep unchanged nodes (especially images) alive during test-value edits.
  function reconcile(current, next) {
    if (current.isEqualNode(next)) return;
    if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName) {
      current.replaceWith(next.cloneNode(true));
      return;
    }
    if (current.nodeType !== 1) {
      current.nodeValue = next.nodeValue;
      return;
    }
    for (const attr of [...current.attributes]) {
      if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
    }
    for (const attr of [...next.attributes]) {
      if (current.getAttribute(attr.name) !== attr.value)
        current.setAttribute(attr.name, attr.value);
    }
    const before = [...current.childNodes],
      after = [...next.childNodes];
    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      if (!after[i]) before[i].remove();
      else if (!before[i]) current.append(after[i].cloneNode(true));
      else reconcile(before[i], after[i]);
    }
  }
  // Runs inside the sandboxed iframe; keep dependencies within this function.
  function previewBridge(updateDOM) {
    window.addEventListener('message', function (event) {
      if (event.source !== parent) return;
      if (
        event.data?.type === 'studio-preview-html' &&
        updateDOM &&
        typeof event.data.html === 'string'
      ) {
        const next = new DOMParser().parseFromString(event.data.html, 'text/html');
        // The parent supplies sanitised preview HTML. Never insert its bridge script again.
        next.querySelectorAll('script').forEach((node) => node.remove());
        const shell = document.body.firstElementChild;
        const nextShell = next.body.firstElementChild;
        if (shell && nextShell) updateDOM(shell, nextShell);
        const styles = document.head.querySelectorAll('style');
        const nextStyles = next.head.querySelectorAll('style');
        for (let i = 0; i < Math.max(styles.length, nextStyles.length); i++) {
          if (!nextStyles[i]) styles[i].remove();
          else if (!styles[i]) document.head.append(nextStyles[i].cloneNode(true));
          else updateDOM(styles[i], nextStyles[i]);
        }
        return;
      }
      if (event.data?.type !== 'studio-select-field') return;
      const id = event.data.fieldId;
      if (id !== null && typeof id !== 'string') return;
      document.querySelectorAll('[data-studio-fields]').forEach(function (node) {
        node.toggleAttribute(
          'data-studio-selected',
          event.data.childKey
            ? JSON.parse(node.dataset.studioChildren || '[]').includes(
                id + ':' + event.data.childKey,
              )
            : JSON.parse(node.dataset.studioFields).includes(id),
        );
      });
    });
    document.addEventListener('click', function (event) {
      event.preventDefault();
      const target = event.target.nodeType === 1 ? event.target : event.target.parentElement;
      const node = target?.closest('[data-studio-fields]');
      if (node) parent.postMessage({ studioFields: JSON.parse(node.dataset.studioFields) }, '*');
    });
    function size() {
      parent.postMessage({ studioHeight: document.documentElement.scrollHeight }, '*');
    }
    window.addEventListener('load', size);
    new ResizeObserver(size).observe(document.body);
  }
  function loopScopes(source) {
    const scopes = [],
      stack = [];
    for (const match of source.matchAll(/{%\s*(?:for\s+(\w+)\s+in\s+([\w.]+)|endfor)\s*%}/g)) {
      if (match[1]) {
        const key = match[2].split('.')[0];
        const scope = {
          alias: match[1],
          key: [...stack].reverse().find((s) => s.alias === key)?.key || key,
          start: match.index + match[0].length,
          end: source.length,
        };
        scopes.push(scope);
        stack.push(scope);
      } else {
        const scope = stack.pop();
        if (scope) scope.end = match.index;
      }
    }
    return scopes;
  }
  function documentHTML(source, m, interactive = false, selectedField = null, live = false) {
    let html = source;
    if (interactive) {
      const nodes = C.parse(source).nodes.filter((n) => !n.hidden),
        edits = [];
      const scopes = loopScopes(source);
      for (const n of nodes) {
        if (['html', 'head', 'body', 'script', 'style', 'meta', 'link', 'title'].includes(n.tag))
          continue;
        const fragment = source.slice(n.start, n.end),
          refs = [],
          childRefs = [];
        if (m.templateMode)
          for (const token of fragment.matchAll(/{{([\s\S]*?)}}|{%([\s\S]*?)%}/g)) {
            const at = n.start + token.index;
            const aliases = new Map(
              scopes
                .filter((scope) => at >= scope.start && at < scope.end)
                .map((scope) => [scope.alias, scope.key]),
            );
            const expression = (token[1] || token[2]).replace(/"[^"\n]*"|'[^'\n]*'/g, '');
            for (const word of expression.matchAll(/\b[a-zA-Z_]\w*(?:\.\w+)*/g)) {
              const key = word[0].split('.')[0];
              refs.push(aliases.get(key) || key);
              const parts = word[0].split('.');
              if (aliases.has(key) && parts.length > 1) {
                const group = m.fields.find((f) => (f.key || f.id) === aliases.get(key));
                if (group) childRefs.push(group.id + ':' + parts[1]);
              }
            }
          }
        const ids = m.fields
          .filter(
            (f) =>
              f.enabled &&
              (f.targets.some((t) => t.nodeId === n.id) ||
                (m.templateMode && refs.includes(f.key || f.id))),
          )
          .map((f) => f.id);
        if (!ids.length) continue;
        const at = n.startEnd - (/\/\s*>$/.test(source.slice(n.start, n.startEnd)) ? 2 : 1);
        edits.push({
          start: at,
          end: at,
          value:
            ' data-studio-fields="' +
            C.escape(JSON.stringify(ids)) +
            '" data-studio-children="' +
            C.escape(JSON.stringify(childRefs)) +
            '" data-studio-editable=""' +
            (ids.includes(selectedField) ? ' data-studio-selected=""' : ''),
        });
      }
      if (m.templateMode) {
        const draft = JSON.parse(JSON.stringify(m));
        C.rebase(draft, edits);
        html = C.render(draft);
      } else
        for (const edit of edits.sort((a, b) => b.start - a.start))
          html = html.slice(0, edit.start) + edit.value + html.slice(edit.end);
    }
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,iframe,object,embed,base,meta,link,form').forEach((n) => {
      if (n.tagName === 'FORM') n.replaceWith(...n.childNodes);
      else n.remove();
    });
    doc.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((a) => {
        if (
          /^on/i.test(a.name) ||
          a.name === 'srcdoc' ||
          a.name === 'nonce' ||
          (a.name === 'href' && /^javascript:/i.test(a.value))
        )
          n.removeAttribute(a.name);
      });
    });
    const style = doc.createElement('style');
    style.textContent =
      'html,body{margin:0;padding:0;min-height:100%;}body{overflow-wrap:break-word;}' +
      (m.contextCss || '');
    doc.head.append(style);
    const shell = doc.createElement('div');
    shell.style.cssText = 'width:' + (Number(m.width) || 600) + 'px;max-width:100%;margin:0 auto;';
    shell.append(...doc.body.childNodes);
    doc.body.append(shell);
    const csp = doc.createElement('meta');
    csp.httpEquiv = 'Content-Security-Policy';
    csp.content =
      "default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; script-src " +
      (interactive || live ? "'nonce-studio-preview'" : "'none'") +
      ';';
    doc.head.prepend(csp);
    if (interactive) {
      const highlights = doc.createElement('style');
      highlights.textContent =
        '[data-studio-editable]{outline:1px dashed #59dbca;outline-offset:4px;cursor:pointer}[data-studio-editable]:hover,[data-studio-selected]{outline:2px solid #080043!important;outline-offset:5px!important}';
      doc.head.append(highlights);
    }
    if (interactive || live) {
      const script = doc.createElement('script');
      script.setAttribute('nonce', 'studio-preview');
      script.textContent =
        '(' + previewBridge.toString() + ')(' + (live ? reconcile.toString() : 'null') + ');';
      doc.body.append(script);
    }
    return '<!doctype html>' + doc.documentElement.outerHTML;
  }
  root.BlockPreview = { documentHTML, previewBridge, reconcile, loopScopes };
})(window);
