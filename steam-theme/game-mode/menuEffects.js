(() => {
    window.__steamPrimeMenuBackdropDispose?.();
    if (document.title.startsWith('MainMenu_')) {
        const dismiss = event => {
            const root=event.target.closest?.('#MainNavMenuContainer');
            if(!root||event.target.closest('[role="menu"]')||event.button!==0)return;
            let fiber=root[Object.keys(root).find(key=>key.startsWith('__reactFiber'))];
            while(fiber&&!fiber.memoizedProps?.onCancelButton)fiber=fiber.return;
            if(fiber?.memoizedProps.onCancelButton){event.preventDefault();fiber.memoizedProps.onCancelButton();}
        };
        document.addEventListener('click',dismiss);
        window.__steamPrimeMenuBackdropDispose=()=>document.removeEventListener('click',dismiss);
        return;
    }
    if (document.title !== 'Steam Big Picture Mode') return;
    window.__steamPrimeMenuEffects?.dispose();
    const names = new Map([
        ['_1PGlK8mZ0CDISnm-gwJqo', '--prime-main-menu-width'],
        ['_2orc8-PBheKd3BvuGXV6ZL', '--prime-quick-menu-width']
    ]);
    let frame;
    const elements = [];
    const measure = () => {
        frame = 0;
        for (const target of elements) {
            const rect = target.getBoundingClientRect();
            const visibleWidth = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left));
            if (visibleWidth < 1) continue;
            for (const [name, property] of names) if (target.classList.contains(name)) {
                const contentWidth=name==='_1PGlK8mZ0CDISnm-gwJqo'&&!target.classList.contains('_26eRZxfJYfD_NywcU-TRuh')?Math.min(300,visibleWidth):visibleWidth;
                const width = Math.round(contentWidth) + 'px';
                if (document.documentElement.style.getPropertyValue(property) !== width) document.documentElement.style.setProperty(property, width);
            }
        }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    const changes = new MutationObserver(schedule);
    for (const name of names.keys()) {
        const element = document.querySelector('[class~="' + name + '"]');
        if (element) {
            elements.push(element);
            observer.observe(element);
            changes.observe(element, {attributes: true, attributeFilter: ['style', 'class']});
            if (element.parentElement) changes.observe(element.parentElement, {attributes: true, attributeFilter: ['style', 'class']});
            element.addEventListener('transitionend', schedule);
            element.addEventListener('animationend', schedule);
        }
    }
    measure();
    window.__steamPrimeMenuEffects = {refresh: schedule, dispose: () => {
        observer.disconnect();changes.disconnect();cancelAnimationFrame(frame);
        for (const element of elements) {
            element.removeEventListener('transitionend', schedule);
            element.removeEventListener('animationend', schedule);
        }
    }};
})();
