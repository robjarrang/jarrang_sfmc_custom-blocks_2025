/* Optional, read-only Studio walkthrough. Never opens itself or writes application state. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id),
    trigger = $('start-tour'),
    dialog = $('studio-tour'),
    card = $('tour-card'),
    spotlight = $('tour-spotlight');
  const repository = {
    title: 'Start with the latest repository',
    text: 'Pull the latest changes in Tower. Open your repository folder here to load its templates and connect Save to the right files. If it is already connected, Reload repository refreshes it after a pull.',
    location: 'Open repository / Reload repository',
    targets: ['#connect-repository'],
  };
  const test = {
    title: 'Try the client’s controls',
    text: 'Use Test to change text, images, choices and repeating items as a client would. These temporary values do not replace your starting content. Check Desktop and Mobile, or inspect Generated HTML.',
    location: 'Test (available after Find editable content)',
    targets: ['#trial-fields', '#task-test', '#analyse', '#new-module'],
  };
  const save = {
    title: 'Save, then publish through Tower',
    text: 'Save writes this module to your connected repository. Save template updates the whole suite. Review the changes, commit and push in Tower to update GitHub Pages. Existing SFMC block URLs stay the same; register a new block’s URL once in Installed Packages.',
    location: 'Save → Tower → GitHub Pages',
    targets: ['#save-repository'],
  };
  const tours = {
    create: [
      repository,
      {
        title: 'Choose the client and template',
        text: 'Keep each client’s suite together in a template. Switch between existing templates here, or choose New template. Template settings holds the shared form colours for all its modules.',
        location: 'Clients & templates → New template',
        targets: ['#browse-projects'],
      },
      {
        title: 'Import one email module',
        text: 'Choose New module, give it a name and paste its HTML or choose a file. Import one module rather than a whole email. Find editable content suggests the fields your client can change.',
        location: 'New module → Email HTML → Find editable content',
        targets: ['#source-html', '#new-module'],
      },
      {
        title: 'Choose what the client can edit',
        text: 'Select highlighted content to find its field, then choose Edit. Set a clear label, starting content and the right field type. Drag the handles to reorder fields; remove any the client should not edit.',
        location: 'Fields → Edit (after importing HTML)',
        targets: ['#field-list', '#task-fields', '#analyse', '#new-module'],
      },
      {
        title: 'Add choices and flexible sections',
        text: 'Add field provides colours, dropdowns, optional sections and repeating items. For repeating content, select the complete item, such as one button or list row, and use Make repeating. Review the outlined boundary before saving the field.',
        location: 'Fields → Add field / Make repeating',
        targets: ['#add-template-control', '#task-fields', '#analyse', '#new-module'],
      },
      test,
      {
        title: 'Set the block’s icon and find its URL',
        text: 'Module settings holds the icon, folder, version and module URL. Choose an icon and background colour; both icon files are generated when you save. Keep the folder and version stable for a block already registered in SFMC.',
        location: 'Module settings (after importing HTML)',
        targets: ['#icon-symbol', '#task-export', '[data-step="3"]'],
      },
      save,
    ],
    maintain: [
      repository,
      {
        title: 'Open the existing module',
        text: 'Choose its client and template, then select the module from this list. Use the existing module for a layout fix so its URL and editable fields stay connected. Undo and Restore last exported content provide recovery options.',
        location: 'Clients & templates → Your modules',
        targets: ['#module-list', '#browse-projects'],
      },
      {
        title: 'Make the HTML or CSS fix',
        text: 'Open HTML & CSS and make the correction inline. Connected field values are protected; use Edit on the field for those changes. Apply changes keeps the existing field mappings. Cancel discards the code draft.',
        location: 'HTML & CSS → Apply changes (on an existing module)',
        targets: ['#quick-code-source', '#quick-edit-html', '#module-list'],
      },
      test,
      save,
    ],
  };
  let steps = [],
    index = -1,
    target = null,
    frame = null,
    observer = null;
  const scrollPositions = new Map();
  function rememberScroll(element) {
    for (let node = element; node; node = node.parentElement)
      if (!scrollPositions.has(node))
        scrollPositions.set(node, { top: node.scrollTop, left: node.scrollLeft });
  }
  function visibleTarget(selectors) {
    return selectors
      .map((selector) => document.querySelector(selector))
      .find((element) => {
        if (!element || element.closest('[hidden]')) return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== 'hidden'
        );
      });
  }
  // Keep the card on-screen. Prefer space beside the highlighted control; use a centred card
  // when the screen is small or the target is unavailable in the current workflow stage.
  function position() {
    if (!dialog.open) return;
    const width = dialog.clientWidth || window.innerWidth,
      height = dialog.clientHeight || window.innerHeight,
      margin = 12,
      gap = 16,
      box = card.getBoundingClientRect(),
      clamp = (value, max) => Math.max(margin, Math.min(value, max));
    let left = (width - box.width) / 2,
      top = (height - box.height) / 2;
    const rect = target?.isConnected && target.getBoundingClientRect();
    if (
      rect &&
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.top < height &&
      rect.right > 0 &&
      rect.left < width
    ) {
      const x = Math.max(4, rect.left - 5),
        y = Math.max(4, rect.top - 5),
        right = Math.min(width - 4, rect.right + 5),
        bottom = Math.min(height - 4, rect.bottom + 5);
      spotlight.dataset.target = 'true';
      Object.assign(spotlight.style, {
        left: x + 'px',
        top: y + 'px',
        width: Math.max(0, right - x) + 'px',
        height: Math.max(0, bottom - y) + 'px',
      });
      const beside = clamp(y, height - box.height - margin),
        below = clamp(x, width - box.width - margin);
      const options = [
        [right + gap, beside],
        [x - gap - box.width, beside],
        [below, bottom + gap],
        [below, y - gap - box.height],
      ];
      const fit = options.find(
        ([x, y]) =>
          x >= margin &&
          y >= margin &&
          x + box.width <= width - margin &&
          y + box.height <= height - margin,
      );
      if (fit) [left, top] = fit;
    } else {
      spotlight.dataset.target = 'false';
      Object.assign(spotlight.style, { left: '0px', top: '0px', width: '0px', height: '0px' });
    }
    card.style.left = clamp(left, width - box.width - margin) + 'px';
    card.style.top = clamp(top, height - box.height - margin) + 'px';
  }
  function schedulePosition() {
    if (dialog.open && frame === null)
      frame = requestAnimationFrame(() => {
        frame = null;
        position();
      });
  }
  function show(next) {
    index = next;
    const step = steps[index];
    $('tour-choices').hidden = !!step;
    $('tour-navigation').hidden = !step;
    $('tour-location').hidden = !step;
    $('tour-progress').textContent = step
      ? 'Step ' + (index + 1) + ' of ' + steps.length
      : 'Guided tour';
    $('tour-title').textContent = step?.title || 'A quick look around';
    $('tour-description').textContent =
      step?.text ||
      'Choose a tour. Follow the highlights at your own pace; your work stays unchanged.';
    $('tour-location').textContent = step?.location || '';
    $('tour-next').textContent = index === steps.length - 1 ? 'Finish' : 'Next';
    $('tour-back').textContent = index === 0 ? 'Choose tour' : 'Back';
    target = step ? visibleTarget(step.targets) : null;
    if (target) {
      rememberScroll(target);
      target.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
    }
    observer?.disconnect();
    observer?.observe(card);
    if (target) observer?.observe(target);
    position();
    card.scrollTop = 0;
    $('tour-title').focus({ preventScroll: true });
  }
  trigger.addEventListener('click', () => {
    if (document.querySelector('dialog[open]') || trigger.closest('[inert]')) return;
    rememberScroll(document.scrollingElement);
    dialog.showModal();
    if (window.ResizeObserver) observer = new ResizeObserver(schedulePosition);
    window.addEventListener('resize', schedulePosition);
    window.addEventListener('scroll', schedulePosition, true);
    steps = [];
    show(-1);
  });
  for (const name of ['create', 'maintain'])
    $('tour-' + name).addEventListener('click', () => {
      steps = tours[name];
      show(0);
    });
  $('tour-back').addEventListener('click', () => show(index - 1));
  $('tour-next').addEventListener('click', () => {
    if (index === steps.length - 1) dialog.close();
    else show(index + 1);
  });
  $('tour-exit').addEventListener('click', () => dialog.close());
  // The native dialog owns Escape and focus containment; all exit paths share cleanup.
  dialog.addEventListener('close', () => {
    window.removeEventListener('resize', schedulePosition);
    window.removeEventListener('scroll', schedulePosition, true);
    observer?.disconnect();
    observer = null;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    target = null;
    for (const [node, scroll] of scrollPositions) {
      node.scrollTop = scroll.top;
      node.scrollLeft = scroll.left;
    }
    scrollPositions.clear();
    trigger.focus({ preventScroll: true });
  });
})();
