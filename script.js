const designWidth = 1920;
const designHeight = 72000;
const dotSpacing = 20.95;
const dotSpacingY = 20.88;
const dotSize = 12;

const sectionTops = {
    intro: 0,
    effectiveness: 7150,
    safety: 22250,
    closing: 36900
};

const sections = {
    intro: document.getElementById("section-intro"),
    effectiveness: document.getElementById("section-effectiveness"),
    safety: document.getElementById("section-safety"),
    closing: document.getElementById("section-closing")
};

const sectionLabels = {
    intro: "Intro",
    effectiveness: "Effectiveness",
    safety: "Safety",
    closing: "Closing"
};

const navSections = [
    {
        key: "disease",
        label: "Disease burden",
        getTop: () => getDiseaseNavigationTop()
    },
    {
        key: "effectiveness",
        label: "Effectiveness",
        getTop: () => getSceneNavigationTop(".effectiveness-scrolly", 520)
    },
    {
        key: "safety",
        label: "Safety",
        getTop: () => getSafetyNavigationTop()
    },
    {
        key: "decision",
        label: "Decision",
        getTop: () => getDecisionNavigationTop()
    }
];

function getSceneNavigationTop(selector, visibleOffset) {
    const scene = document.querySelector(selector);
    if (scene === null) {
        return 0;
    }
    const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
    const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
    return Math.max(0, sceneTop - pinOffset + (visibleOffset || 0));
}

function getDiseaseNavigationTop() {
    const visibleOffset = isMobileLayout() ? 80 : 0;
    return getSceneNavigationTop(".disease-scrolly", visibleOffset);
}

function getSafetyNavigationTop() {
    const safetyIntro = typeof SAFETY_SCENE_DEFS !== "undefined"
        ? SAFETY_SCENE_DEFS.find((def) => def.id === "safety-intro")
        : null;
    if (safetyIntro && Number.isFinite(safetyIntro._top)) {
        const fullyVisibleOffset = Math.max(900, (Number(safetyIntro.revealDist) || 1500) * 0.60);
        return safetyIntro._top + fullyVisibleOffset;
    }
    return Number(sectionTops.safety) || SAFETY_PIN_BASE;
}

function getDecisionNavigationTop() {
    const decisionDef = typeof SAFETY_SCENE_DEFS !== "undefined"
        ? SAFETY_SCENE_DEFS.find((def) => def.id === "decision-intro")
        : null;
    if (decisionDef && Number.isFinite(decisionDef._top)) {
        return decisionDef._top + 920;
    }
    return Number(sectionTops.closing) + 1500;
}

function getNavSectionTop(section) {
    if (section && typeof section.getTop === "function") {
        return Number(section.getTop()) || 0;
    }
    return Number(section && section.top) || 0;
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE_MIN_RENDERED_FONT_SIZE = 10;
const MOBILE_CLOSING_MESSAGE_FONT_SIZE = 13;
const MOBILE_SOURCE_TEXT_FONT_SIZE = 12;
const MOBILE_SOURCE_TITLE_FONT_SIZE = 13;

function isMobileLayout() {
    return window.matchMedia("(max-width: 900px), (pointer: coarse) and (max-width: 1180px)").matches;
}

const scrollState = {
    targetDesignY: 0,
    currentDesignY: 0,
    rafId: null,
    lastFrameTime: null
};

function readDesignScrollY() {
    return window.scrollY / getScale();
}

function syncScrollStateToWindow(force) {
    const designY = readDesignScrollY();
    scrollState.targetDesignY = designY;

    if (force || prefersReducedMotion) {
        scrollState.currentDesignY = designY;
    }
}

function getAnimatedDesignY() {
    return scrollState.currentDesignY || 0;
}

function getScenePinnedState(currentDesignY, pinStart, pinEnd) {
    const actualDesignY = readDesignScrollY();
    const actualPinned = actualDesignY >= pinStart && actualDesignY < pinEnd;
    const visualPinned = currentDesignY >= pinStart && currentDesignY < pinEnd;
    return actualPinned || visualPinned;
}

function ensureSceneHandoffVeil() {
    let veil = document.querySelector(".scene-handoff-veil");

    if (veil === null) {
        veil = makeElement("div", "scene-handoff-veil");
        document.body.appendChild(veil);
    }

    return veil;
}

function setSceneHandoffVeil(opacity) {
    const veil = ensureSceneHandoffVeil();
    const safeOpacity = clamp(opacity || 0, 0, 1);
    veil.style.opacity = safeOpacity.toFixed(3);
}

function updateScrollDrivenScenes(currentDesignY) {
    updateProgressRail();
    updateMobileHeroLayer(currentDesignY);
    updateDiseaseScrolly(currentDesignY);
    updateRiskScrolly(currentDesignY);
    updateVaccinationScrolly(currentDesignY);
    updateEffectivenessScrolly(currentDesignY);
    updatePinnedPages(currentDesignY);
}

function requestScrollSceneFrame() {
    if (scrollState.rafId !== null) {
        return;
    }

    scrollState.rafId = requestAnimationFrame(tickScrollScenes);
}

function tickScrollScenes(timestamp) {
    scrollState.rafId = null;

    if (scrollState.lastFrameTime === null || typeof timestamp !== "number") {
        scrollState.lastFrameTime = timestamp;
    }
    let dt = (typeof timestamp === "number") ? (timestamp - scrollState.lastFrameTime) : 16.667;
    scrollState.lastFrameTime = timestamp;
    if (!(dt > 0)) {
        dt = 16.667;
    }

    if (dt > 50) {
        dt = 50;
    }

    const diff = scrollState.targetDesignY - scrollState.currentDesignY;
    if (prefersReducedMotion || Math.abs(diff) < 0.35) {
        scrollState.currentDesignY = scrollState.targetDesignY;
    } else {
        const distance = Math.abs(diff);
        const baseFraction = distance > 2600
            ? MOTION.scrollCatchupLarge
            : distance > 1400
                ? MOTION.scrollCatchupMedium
                : distance > 620
                    ? MOTION.scrollCatchupSmall
                    : MOTION.scrollCatchupFine;
        const factor = 1 - Math.pow(1 - baseFraction, dt / (1000 / 60));
        scrollState.currentDesignY += diff * factor;
    }

    updateScrollDrivenScenes(scrollState.currentDesignY);

    if (Math.abs(scrollState.targetDesignY - scrollState.currentDesignY) >= 0.35) {
        requestScrollSceneFrame();
    } else {
        scrollState.lastFrameTime = null;
    }
}

const scaleCache = {
    scale: 1,
    pinScale: 1,
    pinOffsetY: 0
};

function getScale() {
    return scaleCache.scale;
}

function getPinScale() {
    return scaleCache.pinScale;
}

function getPinOffsetY() {
    return scaleCache.pinOffsetY;
}

function getMobileBackgroundScale() {
    return isMobileLayout() ? 1.10 : 1;
}

function getMatchedPinTop(pinOffset, staticY, pinnedY) {
    const stageScale = getScale();
    const pinScale = getPinScale();
    return (pinOffset * stageScale) + (staticY * stageScale) - (pinnedY * pinScale);
}

function getMatchedPinTopForScale(pinOffset, staticY, pinnedY, targetScale) {
    const stageScale = getScale();
    return (pinOffset * stageScale) + (staticY * stageScale) - (pinnedY * targetScale);
}

function addReveal(element, variant) {
    if (prefersReducedMotion) {
        element.classList.add("is-visible");
        return element;
    }

    element.classList.add(variant || "reveal");
    return element;
}

function addStagger(element, index) {
    if (!prefersReducedMotion) {
        element.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 80}ms`);
    }

    return element;
}

function updateScale() {
    const viewport = window.visualViewport;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;
    const compact = isMobileLayout();
    const horizontalGutter = compact ? 12 : (viewportWidth < 1280 ? 20 : 32);
    const verticalGutter = compact ? 10 : 20;
    const availableWidth = Math.max(280, viewportWidth - (horizontalGutter * 2));
    const availableHeight = Math.max(420, viewportHeight - (verticalGutter * 2));
    const stageScale = Math.min(1, viewportWidth / designWidth);
    const pinScale = Math.min(1, availableWidth / designWidth, availableHeight / 1080);
    const pinOffsetY = Math.max(verticalGutter, (viewportHeight - (1080 * pinScale)) / 2);

    scaleCache.scale = stageScale;
    scaleCache.pinScale = pinScale;
    scaleCache.pinOffsetY = pinOffsetY;

    document.documentElement.style.setProperty("--scale", stageScale.toFixed(5));
    document.documentElement.style.setProperty("--pin-scale", pinScale.toFixed(5));
    document.documentElement.style.setProperty("--pin-offset-y", `${pinOffsetY.toFixed(2)}px`);
    document.documentElement.style.setProperty("--viewport-width", `${viewportWidth.toFixed(2)}px`);
    document.documentElement.style.setProperty("--viewport-height", `${viewportHeight.toFixed(2)}px`);

    document.documentElement.classList.toggle("is-compact", compact);

    window.requestAnimationFrame(() => {
        applyMobileLegendSizing(compact);
        applyMobileFontFloor(compact);
    });
}

function getCumulativeTransformScale(element) {
    let scale = 1;
    let node = element;

    while (node && node.nodeType === 1) {
        const transform = window.getComputedStyle(node).transform;

        if (transform && transform !== "none") {
            const matrix2d = transform.match(/^matrix\(([^)]+)\)$/);
            const matrix3d = transform.match(/^matrix3d\(([^)]+)\)$/);

            if (matrix2d) {
                const values = matrix2d[1].split(",").map(Number);
                const localScale = Math.hypot(values[0], values[1]);
                if (Number.isFinite(localScale) && localScale > 0) {
                    scale *= localScale;
                }
            } else if (matrix3d) {
                const values = matrix3d[1].split(",").map(Number);
                const localScale = Math.hypot(values[0], values[1], values[2]);
                if (Number.isFinite(localScale) && localScale > 0) {
                    scale *= localScale;
                }
            }
        }

        node = node.parentElement;
    }

    return Math.max(0.01, scale);
}

function hasDirectReadableText(element) {
    return Array.from(element.childNodes).some((node) => (
        node.nodeType === Node.TEXT_NODE && node.textContent.trim().length > 0
    ));
}

function applyMobileLegendSizing(compact) {
    const legends = document.querySelectorAll(".legend");

    legends.forEach((legend) => {
        legend.style.removeProperty("font-size");
        legend.style.removeProperty("line-height");
        legend.style.removeProperty("column-gap");
        legend.style.removeProperty("row-gap");
        legend.style.removeProperty("padding-left");
        legend.style.removeProperty("padding-right");
        legend.style.removeProperty("--legend-dot-size");
        legend.style.removeProperty("--legend-icon-gap");
        legend.style.removeProperty("--legend-item-gap");
        legend.style.removeProperty("--legend-row-gap");
        legend.style.removeProperty("--legend-swatch-width");
        legend.style.removeProperty("--legend-swatch-height");
    });

    if (!compact) {
        return;
    }

    legends.forEach((legend) => {
        const renderedScale = Math.max(0.01, getCumulativeTransformScale(legend));
        const toDesignPixels = (physicalPixels) => `${(physicalPixels / renderedScale).toFixed(3)}px`;

        legend.style.setProperty("font-size", toDesignPixels(11), "important");
        legend.style.setProperty("line-height", "1.28", "important");
        legend.style.setProperty("column-gap", toDesignPixels(14), "important");
        legend.style.setProperty("row-gap", toDesignPixels(10), "important");
        legend.style.setProperty("padding-left", toDesignPixels(12), "important");
        legend.style.setProperty("padding-right", toDesignPixels(12), "important");
        legend.style.setProperty("--legend-dot-size", toDesignPixels(8));
        legend.style.setProperty("--legend-icon-gap", toDesignPixels(7));
        legend.style.setProperty("--legend-item-gap", toDesignPixels(14));
        legend.style.setProperty("--legend-row-gap", toDesignPixels(10));
        legend.style.setProperty("--legend-swatch-width", toDesignPixels(42));
        legend.style.setProperty("--legend-swatch-height", toDesignPixels(9));
    });
}

function applyMobileFontFloor(compact) {
    const adjusted = document.querySelectorAll("[data-mobile-font-floor]");
    adjusted.forEach((element) => {
        element.style.removeProperty("font-size");
        element.style.removeProperty("line-height");
        element.removeAttribute("data-mobile-font-floor");
    });

    if (!compact) {
        return;
    }

    const minimumRenderedFontSize = MOBILE_MIN_RENDERED_FONT_SIZE;
    const candidates = document.querySelectorAll("body *:not(script):not(style):not(noscript)");

    candidates.forEach((element) => {
        if (!hasDirectReadableText(element)) {
            return;
        }

        const computed = window.getComputedStyle(element);
        if (computed.display === "none") {
            return;
        }

        const declaredFontSize = Number.parseFloat(computed.fontSize);
        if (!Number.isFinite(declaredFontSize) || declaredFontSize <= 0) {
            return;
        }

        const transformScale = getCumulativeTransformScale(element);
        const renderedFontSize = declaredFontSize * transformScale;

        if (renderedFontSize >= minimumRenderedFontSize - 0.05) {
            return;
        }

        const correctedFontSize = minimumRenderedFontSize / transformScale;
        element.style.setProperty("font-size", `${correctedFontSize.toFixed(3)}px`, "important");

        const declaredLineHeight = Number.parseFloat(computed.lineHeight);
        if (Number.isFinite(declaredLineHeight) && declaredLineHeight < correctedFontSize * 1.18) {
            element.style.setProperty("line-height", "1.2", "important");
        }

        element.setAttribute("data-mobile-font-floor", `${minimumRenderedFontSize}px`);
    });
}

function setBox(element, left, top, width, height) {
    element.style.left = left + "px";
    element.style.top = top + "px";

    if (width !== undefined) {
        element.style.width = width + "px";
    }

    if (height !== undefined) {
        element.style.height = height + "px";
    }
}

function getSection(name) {
    return sections[name];
}

function relativeTop(sectionName, absoluteTop) {
    return absoluteTop - sectionTops[sectionName];
}

function appendElement(sectionName, element, left, absoluteTop, width, height) {
    setBox(element, left, relativeTop(sectionName, absoluteTop), width, height);
    getSection(sectionName).appendChild(element);
    return element;
}

function makeElement(tagName, className, html) {
    const element = document.createElement(tagName);

    if (className !== undefined && className !== "") {
        element.className = className;
    }

    if (html !== undefined) {
        element.innerHTML = html;
    }

    return element;
}

function addTitle(sectionName, html, className, left, top, width) {
    const title = makeElement("h2", "title " + className, html);
    addReveal(title, "reveal");
    return appendElement(sectionName, title, left, top, width);
}

function addParagraph(sectionName, html, className, left, top, width) {
    const paragraph = makeElement("p", className, html);
    addReveal(paragraph, "reveal");
    return appendElement(sectionName, paragraph, left, top, width);
}

function addCard(sectionName, html, top, extraClass) {
    const card = makeElement("section", "text-card " + (extraClass || ""));
    addReveal(card, "reveal-card");
    const paragraph = makeElement("p", "", html);
    card.appendChild(paragraph);
    return appendElement(sectionName, card, 464, top, 993, 301);
}

function addSourceCard(sectionName, html, source, top) {
    const card = makeElement("section", "text-card");
    addReveal(card, "reveal-card");
    card.style.flexDirection = "column";
    card.appendChild(makeElement("p", "", html));
    card.appendChild(makeElement("small", "", source));
    return appendElement(sectionName, card, 464, top, 993, 301);
}

function addImage(sectionName, fileName, altText, left, top, width, height, className) {
    const image = document.createElement("img");
    image.className = "asset " + (className || "");
    addReveal(image, "reveal-scale");
    image.src = "./assets/" + fileName;
    image.alt = altText;
    return appendElement(sectionName, image, left, top, width, height);
}

function addScrollButton(sectionName) {
    const button = makeElement("button", "scroll-button", "<span class=\"scroll-guide\">Keep scrolling as you read to follow the story.</span><span class=\"scroll-label\">Scroll Down</span><span class=\"scroll-arrow\" aria-hidden=\"true\">↓</span>");
    button.type = "button";
    button.id = "scrollButton";
    button.setAttribute("aria-label", "Scroll to the disease burden section");
    return appendElement(sectionName, button, 750, 866, 420);
}

function addIntroPlots() {
    const wrapper = makeElement("div", "intro-plots reveal-card");
    appendElement("intro", wrapper, 68, 5924, 1785, 650);

    const placeboPlot = makeElement("div", "mini-dot-plot fade");
    placeboPlot.dataset.dots = "1000";
    placeboPlot.dataset.cols = "40";
    placeboPlot.dataset.fill = "33";
    placeboPlot.dataset.targetCount = "33";
    placeboPlot.dataset.color = "red";
    setBox(placeboPlot, 0, 0, 830, 515);
    wrapper.appendChild(placeboPlot);

    const vaccinePlot = makeElement("div", "mini-dot-plot fade");
    vaccinePlot.dataset.dots = "1000";
    vaccinePlot.dataset.cols = "40";
    vaccinePlot.dataset.fill = "16";
    vaccinePlot.dataset.targetCount = "16";
    vaccinePlot.dataset.color = "red";
    setBox(vaccinePlot, 955, 0, 830, 515);
    wrapper.appendChild(vaccinePlot);

    const placeboLabel = makeElement("p", "group-label intro-plot-label-primary", "placebo group");
    setBox(placeboLabel, 155, 545, 520);
    wrapper.appendChild(placeboLabel);

    const placeboSubLabel = makeElement("p", "group-label intro-plot-label-secondary", "No vaccination");
    setBox(placeboSubLabel, 155, 600, 520);
    wrapper.appendChild(placeboSubLabel);

    const vaccineLabel = makeElement("p", "group-label intro-plot-label-primary", "vaccinated group");
    setBox(vaccineLabel, 1110, 545, 520);
    wrapper.appendChild(vaccineLabel);

    const vaccineSubLabel = makeElement("p", "group-label intro-plot-label-secondary", "Vaccination");
    setBox(vaccineSubLabel, 1110, 600, 520);
    wrapper.appendChild(vaccineSubLabel);
}

function makeDot(className, left, top) {
    const dot = document.createElement("span");
    dot.className = className;
    dot.style.left = left + "px";
    dot.style.top = top + "px";
    return dot;
}

function getMeanImageFile(colour, target) {
    if (colour === "purple") {
        return target === "legend" ? "mean3.png" : "mean4.png";
    }

    return target === "legend" ? "mean1.png" : "mean2.png";
}

function getRangeBackgroundColour(colour) {
    if (colour === "purple") {
        return "#BCBAC8";
    }

    return "#BFA8A9";
}

function makeRangeBar(plot, start, end, mean, colour) {
    const firstColumn = start - 1;
    const lastColumn = end - 1;
    const meanColumn = mean - 1;
    const rangeLeft = firstColumn * dotSpacing - ((dotSpacing - dotSize) / 2);
    const rangeWidth = (lastColumn - firstColumn + 1) * dotSpacing;
    const meanLeft = meanColumn * dotSpacing + (dotSize / 2) - 7.5;

    const rangeBackground = document.createElement("span");
    rangeBackground.className = "range-background";
    rangeBackground.style.left = rangeLeft + "px";
    rangeBackground.style.width = rangeWidth + "px";
    rangeBackground.style.backgroundColor = getRangeBackgroundColour(colour);
    rangeBackground.style.setProperty("--range-delay", "160ms");
    plot.appendChild(rangeBackground);

    const meanHighlight = document.createElement("img");
    meanHighlight.className = "range-mean-highlight";
    meanHighlight.src = "./assets/" + getMeanImageFile(colour, "plot");
    meanHighlight.alt = "Mean value marker";
    meanHighlight.style.left = meanLeft + "px";
    plot.appendChild(meanHighlight);
}

function fillPlot(plot) {
    const total = parseInt(plot.dataset.dots || "1000", 10);
    const columns = parseInt(plot.dataset.cols || "40", 10);
    const count = parseInt(plot.dataset.count || plot.dataset.fill || "0", 10);
    const colour = plot.dataset.color || "red";
    const rangeStart = parseInt(plot.dataset.rangeStart || "0", 10);
    const rangeEnd = parseInt(plot.dataset.rangeEnd || "0", 10);
    const dotClass = plot.classList.contains("mini-dot-plot") ? "mini-dot" : "dot";

    plot.innerHTML = "";

    if (rangeStart > 0 && rangeEnd >= rangeStart) {
        makeRangeBar(plot, rangeStart, rangeEnd, count, colour);
    }

    for (let index = 0; index < total; index++) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const left = column * dotSpacing;
        const top = row * dotSpacingY;
        let className = dotClass;

        if (rangeStart > 0 && rangeEnd >= rangeStart) {
            const firstRangeIndex = rangeStart - 1;
            const lastRangeIndex = rangeEnd - 1;
            const meanIndex = count - 1;

            if (index < firstRangeIndex) {
                className += colour === "purple" ? " purple-dot" : " red-dot";
            } else if (index >= firstRangeIndex && index <= lastRangeIndex) {
                if (index === meanIndex) {
                    className += colour === "purple" ? " purple-dot" : " red-dot";
                } else {
                    className += colour === "purple" ? " soft-purple" : " soft-red";
                }
            }
        } else if (index < count) {
            className += colour === "purple" ? " purple-dot" : " red-dot";
        }

        const dot = makeDot(className, left, top);

        if (plot.classList.contains("range-dot-plot")) {
            const clusterX = 415;
            const clusterY = 258;
            const swirl = (index % 17) * 0.55;
            dot.style.setProperty("--cluster-dx", `${(clusterX - left + Math.sin(swirl) * 18).toFixed(2)}px`);
            dot.style.setProperty("--cluster-dy", `${(clusterY - top + Math.cos(swirl) * 18).toFixed(2)}px`);
        }

        if (className.includes("red-dot") || className.includes("purple-dot") || className.includes("soft-red") || className.includes("soft-purple")) {
            const revealIndex = rangeStart > 0 ? Math.max(0, index - Math.max(0, rangeStart - 8)) : index;
            dot.style.transitionDelay = `${Math.min(revealIndex, 120) * 7}ms`;
        }

        if (plot.classList.contains("fade") && row > 15) {
            dot.style.opacity = Math.max(0.18, 1 - ((row - 15) * 0.13));
        }

        plot.appendChild(dot);
    }
}

function fillAllPlots() {
    const plots = document.querySelectorAll(".dot-plot, .mini-dot-plot");

    for (const plot of plots) {
        fillPlot(plot);
    }
}

function makeDotPlot(count, colour, rangeStart, rangeEnd) {
    const plot = makeElement("div", "dot-plot");
    plot.dataset.count = String(count);
    plot.dataset.targetCount = String(count);
    plot.dataset.color = colour;
    plot.setAttribute("role", "img");
    plot.setAttribute("aria-label", `${count} highlighted cases per 1,000 people`);

    if (rangeStart !== undefined && rangeEnd !== undefined) {
        plot.dataset.rangeStart = String(rangeStart);
        plot.dataset.rangeEnd = String(rangeEnd);
        plot.classList.add("range-dot-plot");
    }

    return plot;
}

function makeLegend(colour, label, hasRange) {
    const legend = makeElement("p", "legend");
    const dotClass = colour === "purple" ? "purple-bg" : "red-bg";

    const eventItem = makeElement("span", "legend-item legend-event");
    const dot = makeElement("span", "legend-dot " + dotClass);
    const eventText = makeElement("span", "legend-text", label);
    eventItem.appendChild(dot);
    eventItem.appendChild(eventText);
    legend.appendChild(eventItem);

    if (hasRange) {
        const rangeItem = makeElement("span", "legend-item legend-range");
        const range = document.createElement("span");
        range.className = "range-swatch " + (colour === "purple" ? "purple-range" : "red-range");

        const mean = document.createElement("img");
        mean.className = "range-swatch-mean";
        mean.src = "./assets/" + getMeanImageFile(colour, "legend");
        mean.alt = "Mean value marker";

        const rangeText = makeElement(
            "span",
            "legend-text",
            "Range, with the strongest colour indicating the mean value"
        );

        range.appendChild(mean);
        rangeItem.appendChild(range);
        rangeItem.appendChild(rangeText);
        legend.appendChild(rangeItem);
    }

    return legend;
}

function addChart(sectionName, options) {
    const chartClassName = ['chart-section', 'reveal-card', options.className || ''].filter(Boolean).join(' ');
    const chart = makeElement("section", chartClassName);
    appendElement(sectionName, chart, 410, options.top, 1100, 760);

    const heading = makeElement("h3", "", options.title);
    chart.appendChild(heading);

    const plot = makeDotPlot(options.count, options.colour, options.rangeStart, options.rangeEnd);
    chart.appendChild(plot);

    const mean = makeElement("p", "mean", options.mean);
    if (options.hasRange) {
        mean.dataset.rangeCountUp = "true";
        mean.dataset.rangeStart = String(options.rangeStart || 0);
        mean.dataset.rangeEnd = String(options.rangeEnd || 0);
        mean.dataset.countUp = String(options.count);
        mean.dataset.colour = options.colour;
        mean.innerHTML = `<span class="${options.colour}">0~0</span> cases<br>(Mean: <span class="${options.colour}">0</span> cases)`;
    } else {
        mean.dataset.countUp = String(options.count);
        mean.dataset.colour = options.colour;
    }
    chart.appendChild(mean);

    const legend = makeLegend(options.colour, options.legend, options.hasRange);
    chart.appendChild(legend);
}

function addCompare(sectionName, options) {
    const compare = makeElement("section", "compare-section reveal-card");
    appendElement(sectionName, compare, 0, options.top, 1920, 850);

    const title = makeElement("h2", "title compare-title", options.title);
    setBox(title, 425, 0, 1070);
    compare.appendChild(title);

    const leftLabel = makeElement("p", "compare-label", "<span class=\"blue\">Placebo group</span>");
    setBox(leftLabel, 180, 150, 600);
    compare.appendChild(leftLabel);

    const rightLabel = makeElement("p", "compare-label", "<span class=\"blue\">Vaccinated group</span>");
    setBox(rightLabel, 1140, 150, 600);
    compare.appendChild(rightLabel);

    const vsClass = options.colour === "purple" ? "purple-vs" : "red-vs";
    const vs = makeElement("div", "vs " + vsClass, "VS");
    setBox(vs, 906, 105, 108, 108);
    compare.appendChild(vs);

    const leftPlot = makeElement("div", "side-plot");
    setBox(leftPlot, 65, 245, 830, 520);
    leftPlot.appendChild(makeDotPlot(options.left.count, options.colour, options.left.rangeStart, options.left.rangeEnd));
    const leftMean = makeElement("p", "mean", options.left.mean);
    if (options.left.rangeStart === undefined) {
        leftMean.dataset.countUp = String(options.left.count);
        leftMean.dataset.colour = options.colour;
    } else {
        leftMean.dataset.rangeCountUp = "true";
        leftMean.dataset.rangeStart = String(options.left.rangeStart || 0);
        leftMean.dataset.rangeEnd = String(options.left.rangeEnd || 0);
        leftMean.dataset.countUp = String(options.left.count);
        leftMean.dataset.colour = options.colour;
        leftMean.innerHTML = `<span class="${options.colour}">0~0</span> cases<br>(Mean: <span class="${options.colour}">0</span> cases)`;
    }
    leftPlot.appendChild(leftMean);
    compare.appendChild(leftPlot);

    const arrow = document.createElement("img");
    arrow.className = "arrow-icon";
    arrow.alt = options.arrowAlt;
    arrow.src = "./assets/" + options.arrowFile;
    setBox(arrow, 886, 352, 148, 148);
    compare.appendChild(arrow);

    const rightPlot = makeElement("div", "side-plot");
    setBox(rightPlot, 1025, 245, 830, 520);
    rightPlot.appendChild(makeDotPlot(options.right.count, options.colour, options.right.rangeStart, options.right.rangeEnd));
    const rightMean = makeElement("p", "mean", options.right.mean);
    if (options.right.rangeStart === undefined) {
        rightMean.dataset.countUp = String(options.right.count);
        rightMean.dataset.colour = options.colour;
    } else {
        rightMean.dataset.rangeCountUp = "true";
        rightMean.dataset.rangeStart = String(options.right.rangeStart || 0);
        rightMean.dataset.rangeEnd = String(options.right.rangeEnd || 0);
        rightMean.dataset.countUp = String(options.right.count);
        rightMean.dataset.colour = options.colour;
        rightMean.innerHTML = `<span class="${options.colour}">0~0</span> cases<br>(Mean: <span class="${options.colour}">0</span> cases)`;
    }
    rightPlot.appendChild(rightMean);
    compare.appendChild(rightPlot);

    const legend = makeLegend(options.colour, options.legend, true);
    compare.appendChild(legend);
}


function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
    return start + ((end - start) * progress);
}

function smoothStep(edge0, edge1, value) {
    if (edge0 === edge1) {
        return value < edge0 ? 0 : 1;
    }

    const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return progress * progress * (3 - (2 * progress));
}

const MOTION = {
    speechStartY: 940,
    speechEndY: -430,
    speechFadeInStart: 0.025,
    speechFadeInEnd: 0.135,
    speechFadeOutStart: 0.855,
    speechFadeOutEnd: 0.985,
    mobileSpeechStartY: 1140,
    mobileSpeechEndY: -1200,
    mobileSpeechFadeInStart: 0.025,
    mobileSpeechFadeInEnd: 0.135,
    mobileSpeechFadeOutStart: 0.855,
    mobileSpeechFadeOutEnd: 0.985,
    scrollCatchupLarge: 0.72,
    scrollCatchupMedium: 0.52,
    scrollCatchupSmall: 0.30,
    scrollCatchupFine: 0.18
};

function easeScrollMotion(value) {
    const t = clamp(value, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function setHybridSpeechCardMotion(card, progress, startY, endY, fadeOutStart) {
    const safeProgress = clamp(progress, 0, 1);
    const mobile = isMobileLayout();

    const resolvedStartY = mobile ? MOTION.mobileSpeechStartY : startY;
    const resolvedEndY = mobile ? MOTION.mobileSpeechEndY : endY;
    const fadeInStart = mobile ? MOTION.mobileSpeechFadeInStart : MOTION.speechFadeInStart;
    const fadeInEnd = mobile ? MOTION.mobileSpeechFadeInEnd : MOTION.speechFadeInEnd;
    const resolvedFadeOutStart = mobile ? MOTION.mobileSpeechFadeOutStart : fadeOutStart;
    const fadeOutEnd = mobile ? MOTION.mobileSpeechFadeOutEnd : MOTION.speechFadeOutEnd;

    const eased = smoothStep(0, 1, safeProgress);
    const y = lerp(resolvedStartY, resolvedEndY, eased);
    const fadeIn = smoothStep(fadeInStart, fadeInEnd, safeProgress);
    const fadeOut = 1 - smoothStep(resolvedFadeOutStart, fadeOutEnd, safeProgress);
    const opacity = Math.min(fadeIn, fadeOut);

    card.style.opacity = opacity.toFixed(3);
    card.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
}

function makeDiseaseCard(html, className) {
    const card = makeElement("section", "text-card disease-card " + className);
    card.appendChild(makeElement("p", "", html));
    card.setAttribute("aria-hidden", "true");
    return card;
}

function makeDiseaseDiagramContent(className, titleTop, imageTop, includeCards) {
    const wrapper = makeElement("div", className);

    const title = makeElement("h2", "title question-title disease-title", "What is herpes zoster?");
    title.id = includeCards ? "burden-title-pin" : "burden-title";
    setBox(title, 500, titleTop, 920);
    wrapper.appendChild(title);

    const baseImage = document.createElement("img");
    baseImage.className = "disease-base-image";
    baseImage.src = "./assets/shingles_diagram_transparent_highres.png";
    baseImage.alt = "Shingles symptoms diagram showing pain, blistering rash, persistent neuralgia, and complications.";
    setBox(baseImage, 435, imageTop, 1050, 689);
    wrapper.appendChild(baseImage);

    if (includeCards) {
        const firstCard = makeDiseaseCard(
            "Herpes zoster, also known as shingles, is caused<br>by the same virus that causes chickenpox. After a<br>person has chickenpox, the virus stays inactive in<br>the nerve cells for many years",
            "disease-card-one"
        );
        wrapper.appendChild(firstCard);

        const secondCard = makeDiseaseCard(
            "It can cause severe pain and a blistering rash. Persistent, often debilitating nerve pain may persist after the rash heals, making it very uncomfortable and affecting one’s daily life. Complications such as vision damage and encephalitis may also remain.",
            "disease-card-two"
        );
        wrapper.appendChild(secondCard);
    }

    return wrapper;
}

function createDiseasePinLayer() {
    const existingLayer = document.querySelector(".disease-pin-layer");

    if (existingLayer !== null) {
        return existingLayer;
    }

    const layer = makeElement("div", "disease-pin-layer");
    const content = makeDiseaseDiagramContent("disease-pin-content", 160, 220, true);
    layer.appendChild(content);
    document.body.appendChild(layer);
    return layer;
}

function addDiseaseScrollScene(sectionName, absoluteTop) {
    const sceneHeight = 2800;
    const pinOffset = 150;
    const pinDuration = 2500;
    const transitionOutStart = 0.84;
    const scene = makeElement("div", "disease-scrolly");
    scene.dataset.absoluteTop = String(absoluteTop);
    scene.dataset.sceneHeight = String(sceneHeight);
    scene.dataset.pinOffset = String(pinOffset);
    scene.dataset.pinDuration = String(pinDuration);
    scene.dataset.transitionOutStart = String(transitionOutStart);

    const staticLayer = makeDiseaseDiagramContent("disease-static-layer", 10, 70, false);
    scene.appendChild(staticLayer);

    appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
    createDiseasePinLayer();
    return scene;
}

function setDiseaseCardScrollPosition(card, progress) {
    setVaccineCardScrollPosition(card, progress, MOTION.speechStartY, -260);
}

function updateDiseaseScrolly(currentDesignY) {
    const scene = document.querySelector(".disease-scrolly");
    const pinLayer = document.querySelector(".disease-pin-layer");

    if (scene === null || pinLayer === null) {
        return;
    }

    const scale = getScale();
    const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
    const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
    const pinDuration = parseFloat(scene.dataset.pinDuration || "1");
    const transitionOutStart = parseFloat(scene.dataset.transitionOutStart || "0.86");
    currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
    const pinStart = sceneTop - pinOffset;
    const pinEnd = pinStart + pinDuration;
    const overallProgress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
    const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);
    const transitionProgress = smoothStep(transitionOutStart, 0.93, overallProgress);
    const contentOpacity = isPinned ? (1 - transitionProgress) : 0;
    const staticLayer = scene.querySelector(".disease-static-layer");
    const content = pinLayer.querySelector(".disease-pin-content");
    const firstCard = pinLayer.querySelector(".disease-card-one");
    const secondCard = pinLayer.querySelector(".disease-card-two");

    pinLayer.classList.toggle("is-active", isPinned);
    pinLayer.style.opacity = isPinned ? "1" : "0";

    if (content !== null) {
        const diseaseBlur = lerp(0, 1.15, transitionProgress);
        if (isMobileLayout()) {
            content.style.top = `${Math.round(getPinOffsetY())}px`;
            content.style.transform = "translate3d(-50%, 0, 0) scale(var(--pin-scale))";
        } else {
            const diseaseScale = getScale();
            content.style.top = `${Math.round(getMatchedPinTopForScale(pinOffset, 10, 160, diseaseScale))}px`;
            content.style.transform = "translateX(-50%) scale(var(--scale))";
        }
        content.style.opacity = contentOpacity.toFixed(3);
        content.style.filter = `blur(${diseaseBlur.toFixed(2)}px)`;
    }

    if (staticLayer !== null) {
        staticLayer.classList.toggle("is-hidden", isPinned);
    }

    if (firstCard !== null) {
    setDiseaseCardScrollPosition(firstCard, clamp((overallProgress - 0.02) / 0.42, 0, 1));
    }

    if (secondCard !== null) {
        setDiseaseCardScrollPosition(secondCard, clamp((overallProgress - 0.54) / 0.42, 0, 1));
    }
}


function makeRiskCard(html, className) {
    const card = makeElement("section", "text-card risk-card " + className);
    card.appendChild(makeElement("p", "", html));
    card.setAttribute("aria-hidden", "true");
    return card;
}

function makeRiskGroupContent(className, titleTop, imageTop, includeCards) {
    const wrapper = makeElement("div", className);

    const title = makeElement("h2", "title question-title risk-title", "Who is more likely to get it?");
    title.id = includeCards ? "risk-title-pin" : "risk-title";
    setBox(title, 500, titleTop, 920);
    wrapper.appendChild(title);

    const baseImage = document.createElement("img");
    baseImage.className = "risk-base-image";
    baseImage.src = "./assets/people_risk_groups_smooth_highres_transparent.png";
    baseImage.alt = "Risk groups for shingles: older people, and people with weakened immunity, and people with some chronic diseases.";
    setBox(baseImage, 210, imageTop, 1500, 750);
    wrapper.appendChild(baseImage);

    if (includeCards) {
        const firstCard = makeRiskCard(
            "The risk of developing herpes zoster is higher in adults aged 50 and older, and people with weakened immune systems.",
            "risk-card-one"
        );
        wrapper.appendChild(firstCard);

        const secondCard = makeRiskCard(
            "Medical conditions such as diabetes, chronic kidney disease, or lung disease may also increase the risk.",
            "risk-card-two"
        );
        wrapper.appendChild(secondCard);
    }

    return wrapper;
}

function createRiskPinLayer() {
    const existingLayer = document.querySelector(".risk-pin-layer");

    if (existingLayer !== null) {
        return existingLayer;
    }

    const layer = makeElement("div", "risk-pin-layer");
    const content = makeRiskGroupContent("risk-pin-content", 72, 124, true);
    layer.appendChild(content);
    document.body.appendChild(layer);
    return layer;
}

function addRiskScrollScene(sectionName, absoluteTop) {
    const sceneHeight = 2300;
    const pinOffset = 120;
    const pinDuration = 2180;
    const transitionOutStart = 0.94;
    const scene = makeElement("div", "risk-scrolly");
    scene.dataset.absoluteTop = String(absoluteTop);
    scene.dataset.sceneHeight = String(sceneHeight);
    scene.dataset.pinOffset = String(pinOffset);
    scene.dataset.pinDuration = String(pinDuration);
    scene.dataset.transitionOutStart = String(transitionOutStart);

    const staticLayer = makeRiskGroupContent("risk-static-layer", 72, 124, false);
    scene.appendChild(staticLayer);

    appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
    createRiskPinLayer();
    return scene;
}

function setRiskCardScrollPosition(card, progress) {
    setVaccineCardScrollPosition(card, progress, MOTION.speechStartY, -340);
}

function updateRiskScrolly(currentDesignY) {
    const scene = document.querySelector(".risk-scrolly");
    const pinLayer = document.querySelector(".risk-pin-layer");

    if (scene === null || pinLayer === null) {
        return;
    }

    const scale = getScale();
    const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
    const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
    const pinDuration = parseFloat(scene.dataset.pinDuration || "1");
    const transitionOutStart = parseFloat(scene.dataset.transitionOutStart || "0.88");
    currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
    const pinStart = sceneTop - pinOffset;
    const pinEnd = pinStart + pinDuration;
    const overallProgress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
    const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);
    const sceneBottom = sceneTop + parseFloat(scene.dataset.sceneHeight || "0");
    const shouldKeepStaticHidden = currentDesignY >= pinStart && currentDesignY < sceneBottom;
    const diseaseScene = document.querySelector(".disease-scrolly");
    let riskHandoffOpacity = 1;

    if (diseaseScene !== null) {
        const diseaseTop = parseFloat(diseaseScene.dataset.absoluteTop || "0");
        const diseasePinOffset = parseFloat(diseaseScene.dataset.pinOffset || "0");
        const diseasePinDuration = parseFloat(diseaseScene.dataset.pinDuration || "1");
        const diseasePinStart = diseaseTop - diseasePinOffset;
        const riskHandoffStartY = diseasePinStart + (diseasePinDuration * 0.86);
        const riskHandoffEndY = diseasePinStart + (diseasePinDuration * 0.985);
        const veilInY = diseasePinStart + (diseasePinDuration * 0.84);
        const veilPeakY = diseasePinStart + (diseasePinDuration * 0.91);
        const veilOutY = diseasePinStart + (diseasePinDuration * 0.99);
        const veilIn = smoothStep(veilInY, veilPeakY, currentDesignY);
        const veilOut = 1 - smoothStep(veilPeakY, veilOutY, currentDesignY);
        const veilOpacity = Math.min(veilIn, veilOut) * 0.72;

        riskHandoffOpacity = smoothStep(riskHandoffStartY, riskHandoffEndY, currentDesignY);
        setSceneHandoffVeil(veilOpacity);
    }

    if (diseaseScene === null) {
        setSceneHandoffVeil(0);
    }

    const contentOpacity = isPinned ? riskHandoffOpacity : 0;
    const staticLayer = scene.querySelector(".risk-static-layer");
    const content = pinLayer.querySelector(".risk-pin-content");
    const riskTitle = pinLayer.querySelector(".risk-title");
    const riskImage = pinLayer.querySelector(".risk-base-image");
    const firstCard = pinLayer.querySelector(".risk-card-one");
    const secondCard = pinLayer.querySelector(".risk-card-two");

    pinLayer.classList.toggle("is-active", isPinned);
    pinLayer.style.opacity = isPinned ? "1" : "0";

    const firstCardStart = 0.34;
    const firstCardEnd = 0.60;
    const secondCardStart = 0.62;
    const secondCardEnd = 0.88;
    const sceneExitStart = 0.89;
    const sceneExitEnd = 0.98;

    if (content !== null) {
        const exitLift = smoothStep(sceneExitStart, sceneExitEnd, overallProgress);
        const exitY = Math.round(lerp(0, -30, exitLift));
        const enterY = Math.round(lerp(16, 0, riskHandoffOpacity));
        const riskFadeIn = smoothStep(0.00, 0.20, overallProgress);
        const riskFadeOut = 1 - smoothStep(sceneExitStart, sceneExitEnd, overallProgress);
        const riskOpacity = contentOpacity * riskFadeIn * riskFadeOut;
        const incomingBlur = lerp(5.5, 0, Math.min(riskHandoffOpacity, riskFadeIn));
        content.style.top = isMobileLayout()
            ? `${Math.round(getPinOffsetY())}px`
            : `${Math.round(getMatchedPinTop(pinOffset, 72, 72))}px`;
        content.style.opacity = riskOpacity.toFixed(3);
        content.style.transform = `translate3d(-50%, ${enterY + exitY}px, 0) scale(var(--pin-scale))`;

        if (riskTitle !== null) {
            riskTitle.style.filter = `blur(${incomingBlur.toFixed(2)}px)`;
        }
        if (riskImage !== null) {
            riskImage.style.filter = `blur(${incomingBlur.toFixed(2)}px)`;
            riskImage.style.transform = `scale(${getMobileBackgroundScale().toFixed(4)})`;
            riskImage.style.transformOrigin = 'center center';
        }
    }

    if (staticLayer !== null) {
        staticLayer.classList.toggle("is-hidden", shouldKeepStaticHidden);
        staticLayer.style.opacity = shouldKeepStaticHidden ? "0" : riskHandoffOpacity.toFixed(3);
    }

    if (firstCard !== null) {
        const firstCardProgress = clamp((overallProgress - firstCardStart) / (firstCardEnd - firstCardStart), 0, 1);
        setRiskCardScrollPosition(firstCard, firstCardProgress);
    }

    if (secondCard !== null) {
        const secondCardProgress = clamp((overallProgress - secondCardStart) / (secondCardEnd - secondCardStart), 0, 1);
        setRiskCardScrollPosition(secondCard, secondCardProgress);
    }
}



function makeIntroPlotsElement(className) {
    const wrapper = makeElement("div", "intro-plots " + (className || ""));

    const placeboPlot = makeElement("div", "mini-dot-plot fade");
    placeboPlot.dataset.dots = "1000";
    placeboPlot.dataset.cols = "40";
    placeboPlot.dataset.fill = "33";
    placeboPlot.dataset.targetCount = "33";
    placeboPlot.dataset.color = "red";
    setBox(placeboPlot, 0, 0, 830, 515);
    wrapper.appendChild(placeboPlot);

    const vaccinePlot = makeElement("div", "mini-dot-plot fade");
    vaccinePlot.dataset.dots = "1000";
    vaccinePlot.dataset.cols = "40";
    vaccinePlot.dataset.fill = "16";
    vaccinePlot.dataset.targetCount = "16";
    vaccinePlot.dataset.color = "red";
    setBox(vaccinePlot, 955, 0, 830, 515);
    wrapper.appendChild(vaccinePlot);

    const placeboLabel = makeElement("p", "group-label intro-plot-label-primary", "placebo group");
    setBox(placeboLabel, 155, 545, 520);
    wrapper.appendChild(placeboLabel);

    const placeboSubLabel = makeElement("p", "group-label intro-plot-label-secondary", "No vaccination");
    setBox(placeboSubLabel, 155, 600, 520);
    wrapper.appendChild(placeboSubLabel);

    const vaccineLabel = makeElement("p", "group-label intro-plot-label-primary", "vaccinated group");
    setBox(vaccineLabel, 1110, 545, 520);
    wrapper.appendChild(vaccineLabel);

    const vaccineSubLabel = makeElement("p", "group-label intro-plot-label-secondary", "Vaccination");
    setBox(vaccineSubLabel, 1110, 600, 520);
    wrapper.appendChild(vaccineSubLabel);

    return wrapper;
}

function makeVaccineTitle() {
    const title = makeElement("h2", "title question-title vaccine-title", "Can vaccination prevent the infection effectively and safely?");
    setBox(title, 500, 0, 920);
    return title;
}

function makeVaccineCard(html, className, source) {
    const card = makeElement("section", "text-card vaccine-card " + className);
    card.style.flexDirection = source ? "column" : "";
    card.appendChild(makeElement("p", "", html));

    if (source) {
        card.appendChild(makeElement("small", "", source));
    }

    card.setAttribute("aria-hidden", "true");
    return card;
}

function createVaccinePinLayer() {
    const existingLayer = document.querySelector(".vaccine-pin-layer");

    if (existingLayer !== null) {
        return existingLayer;
    }

    const layer = makeElement("div", "vaccine-pin-layer");
    const content = makeElement("div", "vaccine-pin-content");

    const title = makeVaccineTitle();
    content.appendChild(title);

    const plots = makeIntroPlotsElement("vaccine-plots");
    setBox(plots, 68, 388, 1785, 650);
    content.appendChild(plots);

    const sourceCard = makeVaccineCard(
        "Here, we walk through data from several studies on the effectiveness and safety of the herpes zoster vaccine in adults aged 60 years and older over a period of 3.1 years.",
        "vaccine-card-source",
        "Source: Cochrane Database of Systematic reviews (2023)"
    );
    content.appendChild(sourceCard);

    const comparisonCard = makeVaccineCard(
        "This data compares the number of herpes zoster cases and serious adverse effects between the vaccine group and the placebo group who did not receive the actual vaccine but were given a harmless substance.",
        "vaccine-card-comparison"
    );
    content.appendChild(comparisonCard);

    const comparisonDetailCard = makeVaccineCard(
        "The clinical trial findings are shown as the number of people affected per 1000 participants, to facilitate comparison between the vaccine and placebo groups.",
        "vaccine-card-detail"
    );
    content.appendChild(comparisonDetailCard);

    layer.appendChild(content);
    document.body.appendChild(layer);
    return layer;
}

function addVaccinationScrollScene(sectionName, absoluteTop) {
    const sceneHeight = 1950;
    const pinOffset = 0;
    const pinDuration = 1950;
    const scene = makeElement("div", "vaccine-scrolly");
    scene.dataset.absoluteTop = String(absoluteTop);
    scene.dataset.sceneHeight = String(sceneHeight);
    scene.dataset.pinOffset = String(pinOffset);
    scene.dataset.pinDuration = String(pinDuration);

    appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
    createVaccinePinLayer();
    return scene;
}

function setVaccineCardScrollPosition(card, progress, startY, endY) {
    setHybridSpeechCardMotion(card, progress, startY, endY, 0.84);
}

function setOpaqueSpeechCardScrollPosition(card, progress, startY, endY) {
    setHybridSpeechCardMotion(card, progress, startY, endY, 0.925);
    card.style.background = '#ffffff';
}

function updateVaccinationScrolly(currentDesignY) {
    const scene = document.querySelector(".vaccine-scrolly");
    const pinLayer = document.querySelector(".vaccine-pin-layer");

    if (scene === null || pinLayer === null) {
        return;
    }

    const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
    const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
    const pinDuration = parseFloat(scene.dataset.pinDuration || "1");
    currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
    const pinStart = sceneTop - pinOffset;
    const pinEnd = pinStart + pinDuration;
    const overallProgress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
    const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);
    const content = pinLayer.querySelector(".vaccine-pin-content");
    const title = pinLayer.querySelector(".vaccine-title");
    const plots = pinLayer.querySelector(".vaccine-plots");
    const sourceCard = pinLayer.querySelector(".vaccine-card-source");
    const comparisonCard = pinLayer.querySelector(".vaccine-card-comparison");
    const comparisonDetailCard = pinLayer.querySelector(".vaccine-card-detail");

    const sceneFadeIn = smoothStep(0.00, 0.10, overallProgress);
    const sceneFadeOut = 1 - smoothStep(0.965, 1.0, overallProgress);
    const sceneOpacity = isPinned ? Math.min(sceneFadeIn, sceneFadeOut) : 0;

    pinLayer.classList.toggle("is-active", isPinned);
    pinLayer.style.opacity = sceneOpacity.toFixed(3);

    if (content !== null) {
        content.style.top = `${Math.round(getPinOffsetY())}px`;
        content.style.opacity = sceneOpacity.toFixed(3);
    }

    if (title !== null) {
        const titleMoveProgress = smoothStep(0.30, 0.50, overallProgress);
        const titleTop = Math.round(lerp(408, 126, titleMoveProgress));
        title.style.top = `${titleTop}px`;
        title.style.opacity = sceneOpacity.toFixed(3);
    }

    if (plots !== null) {
        const plotProgress = smoothStep(0.44, 0.60, overallProgress);
        const plotY = lerp(54, 0, plotProgress);
        const plotScale = lerp(1.02, 1.0, plotProgress);
        const plotBlur = lerp(8, 0, plotProgress);
        plots.style.opacity = plotProgress.toFixed(3);
        plots.style.transform = `translate3d(0, ${plotY.toFixed(2)}px, 0) scale(${(plotScale * getMobileBackgroundScale()).toFixed(4)})`;
        plots.style.filter = `blur(${plotBlur.toFixed(2)}px)`;
        plots.querySelectorAll(".mini-dot-plot").forEach((plot) => {
            plot.classList.toggle("plot-animated", plotProgress > 0.18);
        });
    }

    if (sourceCard !== null) {
    setVaccineCardScrollPosition(sourceCard, clamp((overallProgress - 0.12) / 0.28, 0, 1), 940, -340);
    }

    if (comparisonCard !== null) {
        setVaccineCardScrollPosition(comparisonCard, clamp((overallProgress - 0.40) / 0.36, 0, 1), 940, -340);
    }

    if (comparisonDetailCard !== null) {
        setVaccineCardScrollPosition(comparisonDetailCard, clamp((overallProgress - 0.76) / 0.36, 0, 1), 940, -340);
    }
}


function makeEffectivenessQuestionBlock() {
    const block = makeElement("div", "effectiveness-question-block");

    const title = makeElement("h2", "title section-title effectiveness-question-title", "The <span class=\"blue\">Effectiveness</span> of Vaccination");
    setBox(title, 500, 0, 920);
    block.appendChild(title);

    const subtitle = makeElement("p", "subtitle effectiveness-question-subtitle", "How many people <span class=\"blue\">developed herpes zoster</span><br>in the placebo group and in the vaccinated group?");
    setBox(subtitle, 410, 115, 1100);
    block.appendChild(subtitle);

    return block;
}

function makeEffectivenessPinnedChart(options) {
    const chart = makeElement("section", "chart-section effectiveness-pinned-chart " + (options.className || ""));

    const heading = makeElement("h3", "", options.title);
    chart.appendChild(heading);

    const plot = makeDotPlot(options.count, "red");
    chart.appendChild(plot);

    const mean = makeElement("p", "mean", options.mean);
    mean.dataset.countUp = String(options.count);
    mean.dataset.colour = "red";
    chart.appendChild(mean);

    const legend = makeLegend("red", "Case of herpes zoster", false);
    chart.appendChild(legend);

    return chart;
}

function makeEffectivenessPinnedCard(html, className) {
    const card = makeElement("section", "text-card effectiveness-pinned-card " + (className || ""));
    card.appendChild(makeElement("p", "", html));
    card.setAttribute("aria-hidden", "true");
    return card;
}

function makeEffectivenessPinnedCompare() {
    const compare = makeElement("section", "compare-section effectiveness-pinned-compare is-visible");

    const title = makeElement("h2", "title compare-title", "The Effectiveness of Vaccination");
    setBox(title, 425, 0, 1070);
    compare.appendChild(title);

    const leftLabel = makeElement("p", "compare-label", "<span class=\"blue\">Placebo group</span>");
    setBox(leftLabel, 180, 150, 600);
    compare.appendChild(leftLabel);

    const rightLabel = makeElement("p", "compare-label", "<span class=\"blue\">Vaccinated group</span>");
    setBox(rightLabel, 1140, 150, 600);
    compare.appendChild(rightLabel);

    const vs = makeElement("div", "vs red-vs", "VS");
    setBox(vs, 906, 105, 108, 108);
    compare.appendChild(vs);

    const leftPlot = makeElement("div", "side-plot effectiveness-compare-left");
    setBox(leftPlot, 65, 245, 830, 520);
    leftPlot.appendChild(makeDotPlot(33, "red"));
    const leftMean = makeElement("p", "mean", "Mean: <span class=\"red\">33</span> cases");
    leftMean.dataset.countUp = "33";
    leftMean.dataset.colour = "red";
    leftPlot.appendChild(leftMean);
    compare.appendChild(leftPlot);

    const arrow = document.createElement("img");
    arrow.className = "arrow-icon";
    arrow.alt = "A down arrow showing reduction after vaccination";
    arrow.src = "./assets/arrow1.png";
    setBox(arrow, 886, 352, 148, 148);
    compare.appendChild(arrow);

    const rightPlot = makeElement("div", "side-plot effectiveness-compare-right");
    setBox(rightPlot, 1025, 245, 830, 520);
    rightPlot.appendChild(makeDotPlot(16, "red"));
    const rightMean = makeElement("p", "mean", "Mean: <span class=\"red\">16</span> cases");
    rightMean.dataset.countUp = "16";
    rightMean.dataset.colour = "red";
    rightPlot.appendChild(rightMean);
    compare.appendChild(rightPlot);

    const legend = makeLegend("red", "Case of herpes zoster", true);
    compare.appendChild(legend);

    return compare;
}


function makeEffectivenessSummaryCard() {
    const card = makeElement("section", "text-card effectiveness-pinned-card effectiveness-summary-card");
    card.appendChild(makeElement("p", "", "For every 1000 people, vaccination reduced<br>an average of <span class=\"red\">17</span> herpes zoster cases<br>compared to the placebo group."));
    card.setAttribute("aria-hidden", "true");
    return card;
}

function setEffectivenessSummaryCardState(card, progress) {
    if (card === null) {
        return;
    }

    const holdY = 430;
    const enterProgress = smoothStep(0.948, 0.968, progress);
    const exitProgress = smoothStep(0.968, 0.996, progress);
    const y = exitProgress > 0
        ? lerp(holdY, -420, exitProgress)
        : lerp(1080, holdY, enterProgress);
    const fadeIn = smoothStep(0.948, 0.960, progress);
    const fadeOut = 1 - smoothStep(0.990, 0.996, progress);
    const opacity = Math.min(fadeIn, fadeOut);

    card.style.opacity = opacity.toFixed(3);
    card.style.visibility = opacity > 0.02 ? "visible" : "hidden";
    card.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
}
function createEffectivenessPinLayer() {
    const existingLayer = document.querySelector(".effectiveness-pin-layer");

    if (existingLayer !== null) {
        return existingLayer;
    }

    const layer = makeElement("div", "effectiveness-pin-layer");
    const content = makeElement("div", "effectiveness-pin-content");

    const canvas = document.createElement("canvas");
    canvas.className = "effectiveness-dot-canvas";
    canvas.width = 1920;
    canvas.height = 1080;
    canvas.setAttribute("aria-hidden", "true");
    content.appendChild(canvas);

    const questionBlock = makeEffectivenessQuestionBlock();
    setBox(questionBlock, 0, 410, 1920, 260);
    content.appendChild(questionBlock);

    const placeboChart = makeEffectivenessPinnedChart({
        className: "effectiveness-main-chart morph-chart",
        title: "Herpes Zoster Cases<br>in the <span class=\"blue\">Placebo</span> Group",
        count: 33,
        mean: "Mean: <span class=\"red\">33</span> cases"
    });
    setBox(placeboChart, 410, 150, 1100, 760);
    content.appendChild(placeboChart);

    const placeboCard = makeEffectivenessPinnedCard(
        "The study suggests that among people who do not receive the vaccine, about <span class=\"red\">33</span> per 1000 may develop herpes zoster.",
        "effectiveness-placebo-card"
    );
    content.appendChild(placeboCard);


    const vaccinatedCard = makeEffectivenessPinnedCard(
        "It was estimated that about <span class=\"red\">16</span> out of every 1000 people who receive the vaccine would develop herpes zoster.",
        "effectiveness-vaccinated-card"
    );
    content.appendChild(vaccinatedCard);

    layer.appendChild(content);
    document.body.appendChild(layer);
    return layer;
}

function addEffectivenessIntroScene(sectionName, absoluteTop) {
    const sceneHeight = 8500;
    const pinOffset = 0;
    const pinDuration = 8500;
    const scene = makeElement("div", "effectiveness-scrolly");
    scene.dataset.absoluteTop = String(absoluteTop);
    scene.dataset.sceneHeight = String(sceneHeight);
    scene.dataset.pinOffset = String(pinOffset);
    scene.dataset.pinDuration = String(pinDuration);

    appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
    createEffectivenessPinLayer();
    return scene;
}

function applyDotMorph(plot, progress, options) {
    if (plot === null) {
        return;
    }

    const dots = plot.querySelectorAll(".dot, .mini-dot");
    let plotWidth = parseFloat(plot.dataset.cachedWidth || "0");
    let plotHeight = parseFloat(plot.dataset.cachedHeight || "0");
    if (!(plotWidth > 0) || !(plotHeight > 0)) {
        plotWidth = plot.offsetWidth || 830;
        plotHeight = plot.offsetHeight || 515;
        plot.dataset.cachedWidth = String(plotWidth);
        plot.dataset.cachedHeight = String(plotHeight);
    }
    const clusterX = options && options.clusterX !== undefined ? options.clusterX : plotWidth / 2;
    const clusterY = options && options.clusterY !== undefined ? options.clusterY : plotHeight / 2;
    const clusterRadius = options && options.radius !== undefined ? options.radius : 42;
    const eased = smoothStep(0, 1, progress);
    const startScale = options && options.startScale !== undefined ? options.startScale : 0.18;
    const scale = lerp(startScale, 1, eased);
    const curveStrength = options && options.curve !== undefined ? options.curve : 18;
    const arc = Math.sin(eased * Math.PI);

    plot.classList.add("dot-morphing", "plot-animated");
    plot.style.setProperty("--morph-progress", eased.toFixed(3));

    dots.forEach((dot, index) => {
        const targetX = parseFloat(dot.style.left || "0");
        const targetY = parseFloat(dot.style.top || "0");
        const angle = index * 2.3999632297;
        const spiralDistance = Math.sqrt(index % 1000) / Math.sqrt(999);
        const radius = spiralDistance * clusterRadius;
        const startX = clusterX + Math.cos(angle) * radius;
        const startY = clusterY + Math.sin(angle) * radius;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const length = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));
        const direction = (index % 2 === 0 ? 1 : -1);
        const px = -dy / length;
        const py = dx / length;
        const curve = arc * curveStrength * direction * (0.35 + (0.65 * spiralDistance));
        const currentX = startX + (dx * eased) + (px * curve);
        const currentY = startY + (dy * eased) + (py * curve);
        const x = currentX - targetX;
        const y = currentY - targetY;

        dot.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        dot.style.opacity = (0.22 + (0.78 * eased)).toFixed(3);
    });
}

function resetDotMorph(plot) {
    if (plot === null) {
        return;
    }

    plot.classList.remove("dot-morphing");

    if (plot.classList.contains("range-dot-plot")) {
        plot.classList.remove("plot-animated");
    }

    plot.style.removeProperty("--morph-progress");

    plot.querySelectorAll(".dot, .mini-dot").forEach((dot) => {
        dot.style.transform = "";
        dot.style.opacity = "";
    });
}

function updateEffectivenessChartContent(chart, mode) {
    if (chart === null) {
        return;
    }

    const isVaccinated = mode === "vaccinated";
    const count = isVaccinated ? 16 : 33;
    const groupLabel = isVaccinated ? "Vaccinated" : "Placebo";
    const heading = chart.querySelector("h3");
    const mean = chart.querySelector(".mean");
    const plot = chart.querySelector(".dot-plot");

    if (chart.dataset.mode === mode) {
        return;
    }

    chart.dataset.mode = mode;

    if (heading !== null) {
        heading.innerHTML = `Herpes Zoster Cases<br>in the <span class="blue">${groupLabel}</span> Group`;
    }

    if (mean !== null) {
        mean.innerHTML = `Mean: <span class="red">0</span> cases`;
        mean.dataset.countUp = String(count);
        mean.dataset.colour = "red";
        delete mean.dataset.counted;
    }

    if (plot !== null) {
        plot.dataset.fill = String(count);
        plot.querySelectorAll(".dot").forEach((dot, index) => {
            dot.classList.remove("red-dot", "purple-dot", "soft-red", "soft-purple");
            if (index < count) {
                dot.classList.add("red-dot");
            }
        });
    }
}


function easeInOutCubic(value) {
    const t = clamp(value, 0, 1);
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const effectivenessCanvasModel = {
    total: 1000,
    cols: 40,
    singleOrigin: { x: 551, y: 298 },
    compareLeftOrigin: { x: 65, y: 370 },
    compareRightOrigin: { x: 1025, y: 370 },
    cluster: { x: 960, y: 535, radius: 58 },
    dotRadius: 6
};

function getEffectivenessGridPoint(index, origin) {
    return {
        x: origin.x + ((index % effectivenessCanvasModel.cols) * dotSpacing),
        y: origin.y + (Math.floor(index / effectivenessCanvasModel.cols) * dotSpacingY)
    };
}

function getEffectivenessClusterPoint(index, offsetAngle) {
    const angle = (index * 2.3999632297) + (offsetAngle || 0);
    const ring = Math.sqrt((index % effectivenessCanvasModel.total) / (effectivenessCanvasModel.total - 1));
    const wobble = Math.sin(index * 0.37) * 1.4;
    return {
        x: effectivenessCanvasModel.cluster.x + Math.cos(angle) * ((effectivenessCanvasModel.cluster.radius * ring) + wobble),
        y: effectivenessCanvasModel.cluster.y + Math.sin(angle) * ((effectivenessCanvasModel.cluster.radius * ring) + wobble)
    };
}

function drawEffectivenessDot(ctx, x, y, isCase, opacity, scale) {
    ctx.globalAlpha = clamp(opacity, 0, 1);
    ctx.beginPath();
    ctx.arc(x, y, effectivenessCanvasModel.dotRadius * (scale || 1), 0, Math.PI * 2);
    ctx.fillStyle = isCase ? "#d52935" : "#d7d7d7";
    ctx.fill();
}

function drawEffectivenessDotSet(ctx, options) {
    const total = effectivenessCanvasModel.total;
    const caseCount = options.caseCount || 0;
    const origin = options.origin || effectivenessCanvasModel.singleOrigin;
    const progress = clamp(options.progress === undefined ? 1 : options.progress, 0, 1);
    const opacity = options.opacity === undefined ? 1 : options.opacity;
    const mode = options.mode || "grid";
    const targetOrigin = options.targetOrigin || origin;
    const splitAngle = options.splitAngle || 0;

    for (let index = 0; index < total; index += 1) {
        const target = getEffectivenessGridPoint(index, targetOrigin);
        let current = target;
        let local = progress;
        let scale = 1;
        let dotOpacity = opacity;

        if (mode === "cluster-to-grid") {
            const start = getEffectivenessClusterPoint(index, splitAngle);
            local = easeInOutCubic(progress);
            const arc = Math.sin(local * Math.PI);
            current = {
                x: lerp(start.x, target.x, local) + (Math.sin(index * 0.31) * arc * 4),
                y: lerp(start.y, target.y, local) + (Math.cos(index * 0.29) * arc * 3)
            };
            scale = lerp(0.45, 1, local);
            dotOpacity = opacity * smoothStep(0.04, 0.26, local);
        } else if (mode === "grid-to-cluster") {
            const end = getEffectivenessClusterPoint(index, splitAngle);
            local = easeInOutCubic(progress);
            const arc = Math.sin(local * Math.PI);
            current = {
                x: lerp(target.x, end.x, local) + (Math.sin(index * 0.31) * arc * 4),
                y: lerp(target.y, end.y, local) + (Math.cos(index * 0.29) * arc * 3)
            };
            scale = lerp(1, 0.48, local);
            dotOpacity = opacity;
        } else if (mode === "cluster-to-target-stagger") {
            const start = getEffectivenessClusterPoint(index + (options.indexOffset || 0), splitAngle);
            const stagger = ((index % 41) / 40) * 0.08;
            local = easeInOutCubic(clamp((progress - stagger) / 0.92, 0, 1));
            const arc = Math.sin(local * Math.PI);
            const dx = target.x - start.x;
            const dy = target.y - start.y;
            const length = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));
            const px = -dy / length;
            const py = dx / length;
            const side = target.x < effectivenessCanvasModel.cluster.x ? -1 : 1;
            current = {
                x: lerp(start.x, target.x, local) + (px * arc * 18 * side),
                y: lerp(start.y, target.y, local) + (py * arc * 8)
            };
            scale = lerp(0.42, 1, local);
            dotOpacity = opacity * smoothStep(0.02, 0.40, local);
        }

        drawEffectivenessDot(ctx, current.x, current.y, index < caseCount, dotOpacity, scale);
    }

    ctx.globalAlpha = 1;
}

function renderEffectivenessCanvas(progress) {
    const canvas = document.querySelector(".effectiveness-dot-canvas");
    if (canvas === null) {
        return;
    }

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(1920 * ratio) || canvas.height !== Math.round(1080 * ratio)) {
        canvas.width = Math.round(1920 * ratio);
        canvas.height = Math.round(1080 * ratio);
        canvas.style.width = "1920px";
        canvas.style.height = "1080px";
    }

    const ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, 1920, 1080);

    const singleOpacity = smoothStep(0.10, 0.22, progress) * (1 - smoothStep(0.880, 0.905, progress));

    if (progress < 0.440) {
        const expand = smoothStep(0.140, 0.300, progress);
        drawEffectivenessDotSet(ctx, {
            mode: "cluster-to-grid",
            targetOrigin: effectivenessCanvasModel.singleOrigin,
            progress: expand,
            caseCount: 33,
            opacity: singleOpacity
        });
    } else if (progress < 0.620) {
        const collapse = smoothStep(0.560, 0.620, progress);
        drawEffectivenessDotSet(ctx, {
            mode: collapse > 0 ? "grid-to-cluster" : "grid",
            targetOrigin: effectivenessCanvasModel.singleOrigin,
            progress: collapse,
            caseCount: 33,
            opacity: singleOpacity
        });
    } else if (progress < 0.880) {
        const expand = smoothStep(0.620, 0.700, progress);
        drawEffectivenessDotSet(ctx, {
            mode: "cluster-to-grid",
            targetOrigin: effectivenessCanvasModel.singleOrigin,
            progress: expand,
            caseCount: 16,
            opacity: singleOpacity
        });
    } else if (progress < 0.905) {
        const collapse = smoothStep(0.880, 0.905, progress);
        drawEffectivenessDotSet(ctx, {
            mode: collapse > 0 ? "grid-to-cluster" : "grid",
            targetOrigin: effectivenessCanvasModel.singleOrigin,
            progress: collapse,
            caseCount: 16,
            opacity: singleOpacity
        });
    }

    if (progress >= 0.620 && progress < 0.640) {
        drawEffectivenessDotSet(ctx, {
            mode: "grid-to-cluster",
            targetOrigin: effectivenessCanvasModel.singleOrigin,
            progress: 1,
            caseCount: 33,
            opacity: singleOpacity
        });
    }

    if (progress >= 0.905 && progress < 0.920) {
        drawEffectivenessDotSet(ctx, {
            mode: "grid-to-cluster",
            targetOrigin: effectivenessCanvasModel.singleOrigin,
            progress: 1,
            caseCount: 16,
            opacity: singleOpacity
        });
    }
}

function setUnifiedEffectivenessChartState(chart, progress) {
    if (chart === null) {
        return;
    }

    const mode = progress < 0.620 ? "placebo" : "vaccinated";
    updateEffectivenessChartContent(chart, mode);

    const plot = chart.querySelector(".dot-plot");
    const entranceOpacity = smoothStep(0.10, 0.22, progress);
    const splitOut = smoothStep(0.880, 0.905, progress);
    const opacity = entranceOpacity * (1 - splitOut);
    let morphProgress = 1;
    let metadataOpacity = 0;

    if (progress < 0.440) {
        morphProgress = smoothStep(0.140, 0.300, progress);
        metadataOpacity = smoothStep(0.270, 0.330, progress);
    } else if (progress < 0.620) {
        morphProgress = 1 - smoothStep(0.560, 0.620, progress);
        metadataOpacity = 1 - smoothStep(0.585, 0.620, progress);
    } else if (progress < 0.880) {
        morphProgress = smoothStep(0.620, 0.700, progress);
        metadataOpacity = progress < 0.780
            ? smoothStep(0.640, 0.700, progress)
            : 1 - smoothStep(0.845, 0.880, progress);
    } else {
        morphProgress = 1 - smoothStep(0.880, 0.905, progress);
        metadataOpacity = 1 - smoothStep(0.880, 0.905, progress);
    }

    metadataOpacity *= opacity;

    chart.style.opacity = opacity.toFixed(3);
    chart.style.visibility = opacity > 0.02 ? "visible" : "hidden";
    chart.style.transform = `translate3d(0, 0, 0) scale(${getMobileBackgroundScale().toFixed(4)})`;

    chart.querySelectorAll("h3").forEach((element) => {
        element.style.opacity = opacity.toFixed(3);
        element.style.transform = opacity > 0.01 ? "translate3d(0, 0, 0)" : "translate3d(0, -8px, 0)";
    });

    chart.querySelectorAll(".mean, .legend").forEach((element) => {
        element.style.opacity = metadataOpacity.toFixed(3);
        element.style.transform = metadataOpacity > 0.01 ? "translate3d(0, 0, 0)" : "translate3d(0, 10px, 0)";
    });

    const meanElement = chart.querySelector(".mean[data-count-up]");
    if (meanElement !== null) {
        const target = parseInt(meanElement.dataset.countUp || "0", 10);
        const colour = meanElement.dataset.colour || "red";
        const countProgress = mode === "placebo"
            ? (progress - 0.285) / 0.040
            : (progress - 0.655) / 0.040;
        setScrollTiedMeanCount(meanElement, target, colour, countProgress);
    }

    if (plot !== null) {
        plot.style.opacity = "0";
        resetDotMorph(plot);
    }

}

function setScrollTiedMeanCount(meanElement, target, colour, countProgress) {
    if (meanElement === null) {
        return;
    }

    const eased = smoothStep(0, 1, clamp(countProgress, 0, 1));
    const value = Math.round(lerp(0, target, eased));
    meanElement.innerHTML = `Mean: <span class="${colour}">${value}</span> cases`;

    if (eased >= 0.999) {
        meanElement.dataset.counted = "true";
    } else {
        delete meanElement.dataset.counted;
    }
}

function setScrollTiedRangeCount(meanElement, rangeStart, rangeEnd, targetMean, colour, countProgress) {
    if (meanElement === null) {
        return;
    }

    const eased = smoothStep(0, 1, clamp(countProgress, 0, 1));
    const startValue = Math.round(lerp(0, rangeStart, eased));
    const endValue = Math.round(lerp(0, rangeEnd, eased));
    const meanValue = Math.round(lerp(0, targetMean, eased));
    meanElement.innerHTML = `<span class="${colour}">${startValue}~${endValue}</span> cases<br>(Mean: <span class="${colour}">${meanValue}</span> cases)`;

    if (eased >= 0.999) {
        meanElement.dataset.counted = "true";
    } else {
        delete meanElement.dataset.counted;
    }
}

function applyDotSplitFromSourceGrid(plot, progress, source, options) {
    if (plot === null || source === null) {
        return;
    }

    const dots = plot.querySelectorAll(".dot");
    const eased = smoothStep(0, 1, progress);
    const arc = Math.sin(eased * Math.PI);
    const curveStrength = options && options.curve !== undefined ? options.curve : 46;
    const opacityBase = options && options.opacityBase !== undefined ? options.opacityBase : 1;
    const sourceMode = options && options.sourceMode ? options.sourceMode : "cluster";
    const targetOriginX = source.targetOriginX;
    const targetOriginY = source.targetOriginY;
    const clusterCenterX = source.centerX !== undefined ? source.centerX : source.originX + 415;
    const clusterCenterY = source.centerY !== undefined ? source.centerY : source.originY + 258;
    const clusterRadius = options && options.radius !== undefined ? options.radius : 58;
    const sideBias = options && options.sideBias !== undefined ? options.sideBias : 0;

    plot.classList.add("dot-morphing", "plot-animated");
    plot.style.setProperty("--morph-progress", eased.toFixed(3));

    dots.forEach((dot, index) => {
        const targetX = parseFloat(dot.style.left || "0");
        const targetY = parseFloat(dot.style.top || "0");
        const targetGlobalX = targetOriginX + targetX;
        const targetGlobalY = targetOriginY + targetY;

        let sourceX;
        let sourceY;

        if (sourceMode === "grid") {
            const sourceColumn = index % 40;
            const sourceRow = Math.floor(index / 40);
            sourceX = source.originX + (sourceColumn * dotSpacing);
            sourceY = source.originY + (sourceRow * dotSpacingY);
        } else {
            const angle = (index * 2.3999632297) + (sideBias * 0.34);
            const ring = Math.sqrt((index % 1000) / 999);
            const swirl = Math.sin((index % 29) * 0.52) * 4;
            sourceX = clusterCenterX + Math.cos(angle) * (clusterRadius * ring + swirl);
            sourceY = clusterCenterY + Math.sin(angle) * (clusterRadius * ring + swirl);
        }

        const dx = targetGlobalX - sourceX;
        const dy = targetGlobalY - sourceY;
        const length = Math.max(1, Math.sqrt((dx * dx) + (dy * dy)));
        const px = -dy / length;
        const py = dx / length;
        const stagger = ((index % 37) / 36) * 0.065;
        const local = smoothStep(0, 1, clamp((progress - stagger) / 0.92, 0, 1));
        const localArc = Math.sin(local * Math.PI);
        const sideDirection = dx < 0 ? -1 : 1;
        const travelRatio = Math.min(1, length / 900);
        const curve = localArc * curveStrength * sideDirection * (0.45 + (0.55 * travelRatio));
        const drift = localArc * 18 * Math.sin(index * 0.41 + sideBias);
        const currentX = sourceX + (dx * local) + (px * curve) + (py * drift * 0.35);
        const currentY = sourceY + (dy * local) + (py * curve) - (px * drift * 0.35);
        const transformX = currentX - targetGlobalX;
        const transformY = currentY - targetGlobalY;
        const scale = lerp(0.45, 1, local);
        const reveal = smoothStep(0.04, 0.40, local);

        dot.style.transform = `translate3d(${transformX.toFixed(2)}px, ${transformY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`;
        dot.style.opacity = (opacityBase * reveal).toFixed(3);
    });
}

function setMorphingChartState(chart, expandStart, gridEnd, collapseStart, collapseEnd, fadeEnd, progress) {
    if (chart === null) {
        return;
    }

    const reveal = smoothStep(expandStart, gridEnd, progress);
    const collapse = smoothStep(collapseStart, collapseEnd, progress);
    const fadeOut = 1 - smoothStep(collapseEnd, fadeEnd, progress);
    const opacity = Math.min(smoothStep(expandStart - 0.02, expandStart + 0.03, progress), fadeOut);
    const morphProgress = collapseStart >= 1 ? reveal : Math.min(reveal, 1 - collapse);
    const plot = chart.querySelector(".dot-plot");

    chart.style.opacity = opacity.toFixed(3);
    chart.style.transform = `translate3d(0, ${Math.round(lerp(34, 0, reveal))}px, 0) scale(${getMobileBackgroundScale().toFixed(4)})`;

    if (opacity > 0.01) {
        applyDotMorph(plot, morphProgress);
    } else {
        resetDotMorph(plot);
    }

    if (reveal > 0.35) {
        chart.querySelectorAll(".mean[data-count-up]").forEach(runCountUp);
    }
}

function setMorphingCompareState(compare, expandStart, gridEnd, fadeStart, fadeEnd, progress) {
    if (compare === null) {
        return;
    }

    const splitProgress = smoothStep(expandStart, gridEnd, progress);
    const fade = 1 - smoothStep(fadeStart, fadeEnd, progress);
    const opacity = Math.min(smoothStep(expandStart - 0.015, expandStart + 0.035, progress), fade);
    const detailOpacity = smoothStep(0.58, 0.88, splitProgress) * opacity;

    compare.style.opacity = opacity.toFixed(3);
    compare.style.visibility = opacity > 0.02 ? "visible" : "hidden";
    compare.style.transform = `translate3d(0, 0, 0) scale(${getMobileBackgroundScale().toFixed(4)})`;

    const compareLeft = parseFloat(compare.style.left || "0");
    const compareTop = parseFloat(compare.style.top || "0");
    const sourceOriginX = 410 + 141;
    const sourceOriginY = 150 + 148;
    const sourceCenterX = sourceOriginX + 415;
    const sourceCenterY = sourceOriginY + 258;

    compare.querySelectorAll(".side-plot").forEach((sidePlot) => {
        const plot = sidePlot.querySelector(".dot-plot");
        const mean = sidePlot.querySelector(".mean");

        if (plot === null) {
            return;
        }

        const sideLeft = parseFloat(sidePlot.style.left || "0");
        const sideTop = parseFloat(sidePlot.style.top || "0");
        const targetOriginX = compareLeft + sideLeft;
        const targetOriginY = compareTop + sideTop;

        plot.style.opacity = "0";
        resetDotMorph(plot);

        if (mean !== null) {
            mean.style.opacity = detailOpacity.toFixed(3);
            mean.style.transform = detailOpacity > 0.01 ? "translate3d(0, 0, 0)" : "translate3d(0, 10px, 0)";
        }
    });

    compare.querySelectorAll(".compare-label, .vs, .arrow-icon, .legend").forEach((element) => {
        element.style.opacity = detailOpacity.toFixed(3);
        element.style.transform = detailOpacity > 0.01 ? "translate3d(0, 0, 0) scale(1)" : "translate3d(0, 10px, 0) scale(0.94)";
    });

    if (splitProgress > 0.92 && detailOpacity > 0.5) {
        compare.querySelectorAll(".mean[data-count-up]").forEach(runCountUp);
    }
}

function updateEffectivenessScrolly(currentDesignY) {
    const scene = document.querySelector(".effectiveness-scrolly");
    const pinLayer = document.querySelector(".effectiveness-pin-layer");

    if (scene === null || pinLayer === null) {
        return;
    }

    const scale = getScale();
    const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
    const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
    const pinDuration = parseFloat(scene.dataset.pinDuration || "1");
    currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
    const pinStart = sceneTop - pinOffset;
    const pinEnd = pinStart + pinDuration;
    const overallProgress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
    const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);

    const content = pinLayer.querySelector(".effectiveness-pin-content");
    const questionBlock = pinLayer.querySelector(".effectiveness-question-block");
    const mainChart = pinLayer.querySelector(".effectiveness-main-chart");
    const placeboCard = pinLayer.querySelector(".effectiveness-placebo-card");
    const vaccinatedCard = pinLayer.querySelector(".effectiveness-vaccinated-card");
    const compare = pinLayer.querySelector(".effectiveness-pinned-compare");
    const summaryCard = pinLayer.querySelector(".effectiveness-summary-card");

    const scrollDist = currentDesignY - pinStart;
    const CARD_PASS = 2000;
    const F1 = 2600;
    const F2 = 4100;
    let chartScroll;
    let placeboCardP = 0;
    let vaccCardP = 0;
    if (scrollDist < F1) {
        chartScroll = scrollDist;
    } else if (scrollDist < F1 + CARD_PASS) {
        chartScroll = F1;
        placeboCardP = (scrollDist - F1) / CARD_PASS;
    } else if (scrollDist < (F1 + CARD_PASS) + (F2 - F1)) {
        chartScroll = F1 + (scrollDist - (F1 + CARD_PASS));
    } else if (scrollDist < (F1 + CARD_PASS) + (F2 - F1) + CARD_PASS) {
        chartScroll = F2;
        vaccCardP = (scrollDist - ((F1 + CARD_PASS) + (F2 - F1))) / CARD_PASS;
    } else {
        chartScroll = F2 + (scrollDist - ((F1 + CARD_PASS) + (F2 - F1) + CARD_PASS));
    }
    const contentProgress = clamp(chartScroll / 5150, 0, 1);
    const vaccCardEnd = (F1 + CARD_PASS) + (F2 - F1) + CARD_PASS;
    const layerExitFade = 1 - clamp((scrollDist - vaccCardEnd) / 400, 0, 1);

    pinLayer.classList.toggle("is-active", isPinned);
    pinLayer.style.opacity = isPinned ? layerExitFade.toFixed(3) : "0";

    if (content !== null) {
        content.style.top = `${Math.round(getPinOffsetY())}px`;
        content.style.opacity = isPinned ? layerExitFade.toFixed(3) : "0";
        content.style.transform = `translate3d(-50%, 0px, 0) scale(var(--pin-scale))`;
    }

    if (questionBlock !== null) {
        const questionOpacity = 1 - smoothStep(0.10, 0.18, contentProgress);
        const questionLift = smoothStep(0.10, 0.18, contentProgress);
        questionBlock.style.opacity = questionOpacity.toFixed(3);
        questionBlock.style.transform = `translate3d(0, ${Math.round(lerp(0, -24, questionLift))}px, 0)`;
    }

    setUnifiedEffectivenessChartState(mainChart, contentProgress);
    renderEffectivenessCanvas(contentProgress);

    if (placeboCard !== null) {
        setVaccineCardScrollPosition(placeboCard, clamp(placeboCardP, 0, 1), 1080, -470);
    }

    if (vaccinatedCard !== null) {
        setVaccineCardScrollPosition(vaccinatedCard, clamp(vaccCardP, 0, 1), 1080, -470);
    }
}


function createMobileHeroLayer() {
    const existingLayer = document.querySelector(".mobile-hero-layer");

    if (existingLayer !== null) {
        return existingLayer;
    }

    const layer = makeElement("div", "mobile-hero-layer");
    const content = makeElement("div", "mobile-hero-content");
    const title = makeElement("h1", "title main-title", "How Effective and Safe is<br>the Herpes Zoster<br>Vaccine?");
    setBox(title, 455, 399, 1010);
    content.appendChild(title);

    const hint = makeElement("div", "mobile-scroll-hint", "<span class=\"scroll-guide\">Keep scrolling as you read to follow the story.</span><span class=\"scroll-label\">Scroll Down</span><span class=\"scroll-arrow\" aria-hidden=\"true\">↓</span>");
    hint.setAttribute("aria-hidden", "true");

    layer.appendChild(content);
    layer.appendChild(hint);
    document.body.appendChild(layer);
    return layer;
}

function updateMobileHeroLayer(currentDesignY) {
    const layer = document.querySelector(".mobile-hero-layer");

    if (layer === null) {
        return;
    }

    if (!isMobileLayout()) {
        layer.classList.remove("is-active");
        layer.style.opacity = "0";
        return;
    }

    const firstPinnedScene = document.querySelector(".disease-scrolly");
    const firstSceneTop = firstPinnedScene !== null
        ? parseFloat(firstPinnedScene.dataset.absoluteTop || "1260")
        : 1260;
    const firstPinOffset = firstPinnedScene !== null
        ? parseFloat(firstPinnedScene.dataset.pinOffset || "150")
        : 150;
    const heroEnd = firstSceneTop - firstPinOffset;
    const actualDesignY = readDesignScrollY();
    const heroProgressY = Math.max(currentDesignY || 0, actualDesignY || 0);
    const isActive = heroProgressY < heroEnd;
    const fadeOut = smoothStep(heroEnd - 260, heroEnd, heroProgressY);
    const opacity = isActive ? (1 - fadeOut) : 0;
    const content = layer.querySelector(".mobile-hero-content");

    layer.classList.toggle("is-active", opacity > 0.01);
    layer.style.opacity = opacity.toFixed(3);

    if (content !== null) {
        content.style.top = `${Math.round(getPinOffsetY())}px`;
        content.style.opacity = opacity.toFixed(3);
    }
}

function scrollToBurden() {
    const scene = document.querySelector(".disease-scrolly");

    if (scene !== null) {
        const scale = getScale();
        const targetDesignY = getDiseaseNavigationTop();
        scrollState.targetDesignY = targetDesignY;
        if (prefersReducedMotion) {
            scrollState.currentDesignY = targetDesignY;
        }
        window.scrollTo({ top: targetDesignY * scale, behavior: prefersReducedMotion ? "auto" : "smooth" });
        requestScrollSceneFrame();
    }
}

function renderIntro() {
    const mainTitle = makeElement("h1", "title main-title", "How Effective and Safe is<br>the Herpes Zoster<br>Vaccine?");
    appendElement("intro", mainTitle, 455, 399, 1010);

    addScrollButton("intro");

    addDiseaseScrollScene("intro", 1260);

    addRiskScrollScene("intro", 3140);

    addVaccinationScrollScene("intro", 5200);
}

function renderEffectiveness() {
    addEffectivenessIntroScene("effectiveness", 7150);
}

function runRangeCountUp(meanElement) {
    if (prefersReducedMotion || meanElement.dataset.counted === "true") {
        return;
    }

    const targetStart = parseInt(meanElement.dataset.rangeStart || "0", 10);
    const targetEnd = parseInt(meanElement.dataset.rangeEnd || "0", 10);
    const targetMean = parseInt(meanElement.dataset.countUp || "0", 10);
    const colour = meanElement.dataset.colour || "red";
    const duration = 950;
    const startTime = performance.now();
    meanElement.dataset.counted = "true";

    function render(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const startValue = Math.round(targetStart * eased);
        const endValue = Math.round(targetEnd * eased);
        const meanValue = Math.round(targetMean * eased);
        meanElement.innerHTML = `<span class="${colour}">${startValue}~${endValue}</span> cases<br>(Mean: <span class="${colour}">${meanValue}</span> cases)`;

        if (progress < 1) {
            requestAnimationFrame(render);
        }
    }

    requestAnimationFrame(render);
}

function runCountUp(meanElement) {
    if (prefersReducedMotion || meanElement.dataset.counted === "true") {
        return;
    }

    const target = parseInt(meanElement.dataset.countUp || "0", 10);
    const colour = meanElement.dataset.colour || "red";
    const duration = 850;
    const startTime = performance.now();
    meanElement.dataset.counted = "true";

    function render(now) {
        const progress = Math.min((now - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(target * eased);
        meanElement.innerHTML = `Mean: <span class="${colour}">${value}</span> cases`;

        if (progress < 1) {
            requestAnimationFrame(render);
        }
    }

    requestAnimationFrame(render);
}

function activatePlot(plot) {
    if (plot.dataset.animated === "true") {
        return;
    }

    plot.dataset.animated = "true";
    plot.classList.add("plot-animated");

    const host = plot.closest(".chart-section, .side-plot, .intro-plots, .compare-section");
    if (host !== null) {
        host.querySelectorAll(".mean[data-range-count-up]").forEach(runRangeCountUp);
        host.querySelectorAll(".mean[data-count-up]:not([data-range-count-up])").forEach(runCountUp);
    }
}

function setupRevealObserver() {
    if (prefersReducedMotion) {
        document.querySelectorAll(".reveal, .reveal-card, .reveal-scale").forEach((element) => {
            element.classList.add("is-visible");
        });
        document.querySelectorAll(".dot-plot, .mini-dot-plot").forEach((plot) => {
            plot.classList.add("plot-animated");
        });
        return;
    }

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: "0px 0px -16% 0px",
        threshold: 0.10
    });

    document.querySelectorAll(".reveal, .reveal-card, .reveal-scale").forEach((element, index) => {
        addStagger(element, index % 4);
        revealObserver.observe(element);
    });

    const plotObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                activatePlot(entry.target);
                plotObserver.unobserve(entry.target);
            }
        });
    }, {
        root: null,
        rootMargin: "0px 0px -20% 0px",
        threshold: 0.18
    });

    document.querySelectorAll(".dot-plot, .mini-dot-plot").forEach((plot) => {
        if (plot.classList.contains("pin-managed-plot")) {
            return;
        }
        plotObserver.observe(plot);
    });
}

function addProgressRail() {
    const rail = makeElement("nav", "progress-rail");
    rail.setAttribute("aria-label", "Story sections");

    navSections.forEach((section) => {
        const button = makeElement("button", "progress-dot", `<span>${section.label}</span>`);
        button.type = "button";
        button.dataset.section = section.key;
        button.setAttribute("aria-label", `Go to ${section.label} section`);
        button.addEventListener("click", () => {
            const designTop = getNavSectionTop(section);
            const top = designTop * getScale();
            scrollState.targetDesignY = designTop;
            if (prefersReducedMotion) {
                scrollState.currentDesignY = designTop;
            }
            window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
            requestScrollSceneFrame();
        });
        rail.appendChild(button);
    });

    document.body.appendChild(rail);
    updateProgressRail();
}

function updateProgressRail() {
    const scale = getScale();
    const currentY = window.scrollY / scale;
    let activeKey = navSections[0].key;

    navSections.forEach((section) => {
        const sectionTop = getNavSectionTop(section);
        if (currentY >= sectionTop - 400) {
            activeKey = section.key;
        }
    });

    document.querySelectorAll(".progress-dot").forEach((button) => {
        const active = button.dataset.section === activeKey;
        button.classList.toggle("is-active", active);
        if (active) {
            button.setAttribute("aria-current", "step");
        } else {
            button.removeAttribute("aria-current");
        }
    });
}

let storyScroller = null;
const SCROLLAMA_STEP_SIZE = 900;

function getTotalDesignHeight() {
    const canvas = document.getElementById("canvas");
    const inlineHeight = canvas ? parseFloat(canvas.style.height || "0") : 0;
    return inlineHeight || designHeight;
}

function buildScrollamaSteps() {
    let container = document.getElementById("scrollama-steps");
    if (container !== null) {
        container.remove();
    }

    container = makeElement("div", "scrollama-steps");
    container.id = "scrollama-steps";
    container.setAttribute("aria-hidden", "true");

    const total = getTotalDesignHeight();
    const count = Math.ceil(total / SCROLLAMA_STEP_SIZE);

    for (let index = 0; index < count; index += 1) {
        const start = index * SCROLLAMA_STEP_SIZE;
        const end = Math.min(total, start + SCROLLAMA_STEP_SIZE);
        const step = makeElement("div", "scrollama-step");
        step.dataset.designStart = String(start);
        step.dataset.designEnd = String(end);
        step.dataset.stepIndex = String(index);
        step.style.top = `calc(${start}px * var(--scale))`;
        step.style.height = `calc(${Math.max(1, end - start)}px * var(--scale))`;
        container.appendChild(step);
    }

    document.querySelector(".page").appendChild(container);
    return container;
}

function renderFromScrollama() {
    const designY = readDesignScrollY();
    scrollState.targetDesignY = designY;
    scrollState.currentDesignY = designY;
    updateScrollDrivenScenes(designY);
}

function setActiveScrollamaStep(response) {
    document.querySelectorAll(".scrollama-step.is-active").forEach((step) => {
        step.classList.remove("is-active");
    });
    if (response && response.element) {
        response.element.classList.add("is-active");
    }
}

function setupScrollamaState() {
    buildScrollamaSteps();
    syncScrollStateToWindow(true);

    if (typeof window.scrollama !== "function") {
        window.addEventListener("scroll", renderFromScrollama, { passive: true });
        renderFromScrollama();
        return;
    }

    storyScroller = window.scrollama();
    storyScroller
        .setup({
            step: ".scrollama-step",
            offset: 0.5,
            progress: true,
            threshold: 4,
            once: false
        })
        .onStepEnter((response) => {
            setActiveScrollamaStep(response);
            renderFromScrollama();
        })
        .onStepProgress(() => {
            renderFromScrollama();
        })
        .onStepExit((response) => {
            if (response && response.element) {
                response.element.classList.remove("is-active");
            }
            renderFromScrollama();
        });

    renderFromScrollama();
}

const EFFECTIVENESS_HANDOFF_OVERLAP = 400;
const SAFETY_PIN_BASE = 15650 - EFFECTIVENESS_HANDOFF_OVERLAP;
const PAGE_REVEAL = 2600;
const STANDARD_BUBBLE_TRAVEL = 2000;
const PAGE_BUBBLE = STANDARD_BUBBLE_TRAVEL;
const PAGE_FADE = 1100;

const SAFETY_SCENE_DEFS = [
    {
        id: 'effectiveness-compare', kind: 'compare', revealDist: 1400,
        transparentLayer: true,
        fadeBackgroundWithLastBubble: true,
        backgroundFadeBubbleProgress: 0.80,
        backgroundFadeDuration: 800,
        compare: {
            title: 'The Effectiveness of Vaccination', colour: 'red', hasRange: false,
            arrowFile: 'arrow1.png', arrowAlt: 'A down arrow showing fewer herpes zoster cases after vaccination',
            left: { count: 33, mean: 33 },
            right: { count: 16, mean: 16 }
        },
        bubbles: [
            'So for every 1,000 people, vaccination reduced an average of <span class="red">17</span> herpes zoster cases compared to the placebo group.',
            'Overall, this study shows that the herpes zoster vaccine appears to prevent the risk of developing it.'
        ]
    },
    {
        id: 'safety-intro', kind: 'intro-with-bubble', revealDist: 1500,
        title: 'The <span class="blue">Safety</span> of Vaccination',
        subtitle: 'How many people experienced a <span class="blue">serious adverse effect</span><br>in the placebo group and in the vaccinated group?',
        bubbles: [
            'Serious adverse effects refer to severe outcomes such as death, life-threatening conditions, hospitalisation, disability or permanent damage, congenital anomalies or birth defects, or other important medical events.'
        ]
    },
    {
        id: 'sfa-1', kind: 'chart', revealDist: 420, bubbleStart: 420, bubbleTravel: STANDARD_BUBBLE_TRAVEL,
        chart: { title: 'Serious Adverse Effect<br>in the <span class="blue">Placebo</span> Group', count: 22, colour: 'purple', mean: 22, hasRange: false },
        bubbles: ['The study shows that about <span class="purple">22</span> in every 1,000 people who did not receive the vaccine had a serious adverse event.']
    },
    {
        id: 'sfa-2', kind: 'chart', bubbleTravel: STANDARD_BUBBLE_TRAVEL,
        chart: { title: 'Serious Adverse Effect<br>in the <span class="blue">Vaccinated</span> Group', count: 23, colour: 'purple', mean: 23, hasRange: false },
        bubbles: ['The study shows that about <span class="purple">23</span> in every 1,000 people who received the vaccine had a serious adverse event.']
    },
    {
        id: 'sfa-compare', kind: 'compare', revealDist: 2200, bubbleTravel: STANDARD_BUBBLE_TRAVEL,
        compare: {
            title: 'The Serious Adverse Effect of Vaccination', colour: 'purple', hasRange: false,
            hideArrow: true,
            left: { count: 22, mean: 22 },
            right: { count: 23, mean: 23 }
        },
        bubbles: [
            'For every 1,000 people, the vaccinated group had an average of <span class="purple">1</span> more serious adverse event than the placebo group.',
            'Overall, the study shows no clear difference<br>between the vaccinated and placebo groups in<br>serious adverse events.'
        ]
    },
    {
        id: 'decision-intro', kind: 'intro',
        overlapBefore: 900,
        title: 'Making a Vaccination <span class="blue">Decision</span>',
        subtitle: 'How should these study findings be interpreted when making a vaccination decision?'
    },
    {
        id: 'decision-conclusion', kind: 'bubbles',
        bubbleSpacing: 1900,
        bubbleTravel: 2300,
        bubbles: [
            'This study found fewer herpes zoster cases after vaccination, while the average numbers of serious adverse events were similar between the two groups.'
        ]
    },
    {
        id: 'sfa-7', kind: 'closing', bubbleStart: 0,
        overlapBefore: 720,
        revealDist: 1800,
        bgStart: 300,
        bubbleSpacing: 1900,
        bubbleTravel: 2200,
        imageFile: 'own_factors_transparent_highres.png', imageAlt: 'Personal factors for vaccination decision',
        bubbles: [
            'However, these findings describe average outcomes in the study population, and the expected benefit varies with personal risk of herpes zoster influenced by age, immune status, and medical history.',
            'Vaccination decisions can be better informed by weighing the expected benefits, possible harms, and individual context.'
        ]
    },
    {
        id: 'sfa-msg', kind: 'message',
        message: 'Thank you for reading the article.<br>Please return to the original survey page<br>and answer the questions.',
        sources: [
            {
                label: 'Cochrane Library — Vaccines for preventing herpes zoster in older adults',
                url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD008858.pub5/full'
            },
            {
                label: 'World Health Organization — Shingles (herpes zoster)',
                url: 'https://www.who.int/news-room/fact-sheets/detail/shingles-(herpes-zoster)'
            }
        ]
    }
];

const PAGE_MESSAGE_REVEAL = 1200;  
const PAGE_MESSAGE_HOLD = 3500;

function getPinnedBackgroundFadeTiming(def, bubbleBase, bubbleSpacing, bubbleTravel, bubbleCount) {
    const defaultStart = bubbleBase + (bubbleCount > 0
        ? (((bubbleCount - 1) * bubbleSpacing) + bubbleTravel)
        : 0);
    const lastBubbleStart = bubbleBase + (bubbleCount > 0
        ? ((bubbleCount - 1) * bubbleSpacing)
        : 0);
    const start = def.fadeBackgroundWithLastBubble === true && bubbleCount > 0
        ? lastBubbleStart + (bubbleTravel * clamp(Number(def.backgroundFadeBubbleProgress) || 0.80, 0, 1))
        : defaultStart;
    const duration = Math.max(1, Number(def.backgroundFadeDuration) || PAGE_FADE);

    return { start, duration };
}

function safetyPageDuration(def) {
    if (def.kind === 'message') {
        return PAGE_MESSAGE_REVEAL + PAGE_MESSAGE_HOLD;
    }
    if (def.kind === 'intro') {
        return 3000;
    }
    const nB = def.bubbles ? def.bubbles.length : 0;
    const bubbleSpacing = def.bubbleSpacing !== undefined ? def.bubbleSpacing : PAGE_BUBBLE;
    const bubbleTravel = def.bubbleTravel !== undefined ? def.bubbleTravel : PAGE_BUBBLE;
    const bubbleRun = nB > 0 ? (((nB - 1) * bubbleSpacing) + bubbleTravel) : 0;
    if (def.kind === 'bubbles') {
        return bubbleRun + 400;
    }
    const base = def.bubbleStart !== undefined ? def.bubbleStart : PAGE_REVEAL;
    const fadeTiming = getPinnedBackgroundFadeTiming(def, base, bubbleSpacing, bubbleTravel, nB);
    const bubbleEnd = base + bubbleRun;
    return Math.max(bubbleEnd, fadeTiming.start + fadeTiming.duration);
}

function makeSafetyChart(cfg) {
    const chart = makeElement('section', 'chart-section pinned-page-chart');
    chart.appendChild(makeElement('h3', '', cfg.title));

    const plot = makeDotPlot(cfg.count, cfg.colour, cfg.rangeStart, cfg.rangeEnd);
    plot.classList.add('pin-managed-plot');
    chart.appendChild(plot);

    const mean = makeElement('p', 'mean', '');
    if (cfg.hasRange) {
        mean.dataset.rangeCountUp = 'true';
        mean.dataset.rangeStart = String(cfg.rangeStart);
        mean.dataset.rangeEnd = String(cfg.rangeEnd);
        mean.dataset.countUp = String(cfg.mean);
        mean.dataset.colour = cfg.colour;
        mean.innerHTML = `<span class="${cfg.colour}">0~0</span> cases<br>(Mean: <span class="${cfg.colour}">0</span> cases)`;
    } else {
        mean.dataset.countUp = String(cfg.mean);
        mean.dataset.colour = cfg.colour;
        mean.innerHTML = `Mean: <span class="${cfg.colour}">0</span> cases`;
    }
    chart.appendChild(mean);
    chart.appendChild(makeLegend(cfg.colour, 'Case of serious adverse effect', !!cfg.hasRange));
    return chart;
}

function makeSafetyCompare(cfg) {
    const compare = makeElement('section', 'compare-section pinned-page-compare');

    const title = makeElement('h2', 'title compare-title', cfg.title);
    setBox(title, 425, 0, 1070);
    compare.appendChild(title);

    const leftLabel = makeElement('p', 'compare-label', '<span class="blue">Placebo group</span>');
    setBox(leftLabel, 180, 150, 600);
    compare.appendChild(leftLabel);

    const rightLabel = makeElement('p', 'compare-label', '<span class="blue">Vaccinated group</span>');
    setBox(rightLabel, 1140, 150, 600);
    compare.appendChild(rightLabel);

    const vs = makeElement('div', 'vs ' + (cfg.colour === 'purple' ? 'purple-vs' : 'red-vs'), 'VS');
    setBox(vs, 906, 105, 108, 108);
    compare.appendChild(vs);

    const hasRange = cfg.hasRange === true;
    const makeSide = (side, sideClass, left) => {
        const sidePlot = makeElement('div', 'side-plot ' + sideClass);
        setBox(sidePlot, left, 245, 830, 520);
        const dots = hasRange
            ? makeDotPlot(side.count, cfg.colour, side.rangeStart, side.rangeEnd)
            : makeDotPlot(side.count, cfg.colour);
        dots.classList.add('pin-managed-plot');
        sidePlot.appendChild(dots);

        const mean = makeElement('p', 'mean', '');
        mean.dataset.countUp = String(side.mean);
        mean.dataset.colour = cfg.colour;
        if (hasRange) {
            mean.dataset.rangeCountUp = 'true';
            mean.dataset.rangeStart = String(side.rangeStart);
            mean.dataset.rangeEnd = String(side.rangeEnd);
            mean.innerHTML = `<span class="${cfg.colour}">0~0</span> cases<br>(Mean: <span class="${cfg.colour}">0</span> cases)`;
        } else {
            mean.innerHTML = `Mean: <span class="${cfg.colour}">0</span> cases`;
        }
        sidePlot.appendChild(mean);
        return sidePlot;
    };

    compare.appendChild(makeSide(cfg.left, 'pinned-page-compare-left', 65));

    if (cfg.hideArrow !== true) {
        const arrow = document.createElement('img');
        arrow.className = 'arrow-icon';
        arrow.alt = cfg.arrowAlt || '';
        arrow.src = './assets/' + (cfg.arrowFile || 'arrow2.png');
        setBox(arrow, 886, 352, 148, 148);
        compare.appendChild(arrow);
    }

    compare.appendChild(makeSide(cfg.right, 'pinned-page-compare-right', 1025));
    compare.appendChild(makeLegend(cfg.colour, cfg.colour === 'red' ? 'Case of herpes zoster' : 'Case of serious adverse effect', hasRange));
    return compare;
}

function makePinnedStoryCard(html, extraClass) {
    const className = ['text-card', extraClass || ''].filter(Boolean).join(' ');
    const card = makeElement('section', className);
    card.appendChild(makeElement('p', '', html));
    card.setAttribute('aria-hidden', 'true');
    return card;
}

function buildPinnedPageLayer(def) {
    const layer = makeElement('div', 'pinned-page-layer');
    if (def.kind === 'intro') {
        layer.classList.add('pinned-page-layer--decision-intro');
    }
    if (def.transparentLayer === true) {
        layer.classList.add('pinned-page-layer--transparent');
    }
    layer.dataset.sceneId = def.id;
    const content = makeElement('div', 'pinned-page-content');

    if (def.kind === 'chart') {
        const chart = makeSafetyChart(def.chart);
        setBox(chart, 410, 160, 1100, 760);
        content.appendChild(chart);
        def._bgSelector = '.pinned-page-chart';
    } else if (def.kind === 'compare') {
        const compare = makeSafetyCompare(def.compare);
        setBox(compare, 0, 112, 1920, 850);
        content.appendChild(compare);
        def._bgSelector = '.pinned-page-compare';
    } else if (def.kind === 'intro' || def.kind === 'intro-with-bubble') {
        const introClass = def.kind === 'intro-with-bubble' ? 'decision-intro-block safety-intro-block' : 'decision-intro-block';
        const intro = makeElement('section', introClass);
        const titleClass = def.kind === 'intro-with-bubble'
            ? 'title section-title decision-intro-title safety-intro-title'
            : 'title section-title decision-intro-title';
        const subtitleClass = def.kind === 'intro-with-bubble'
            ? 'subtitle decision-intro-subtitle safety-intro-subtitle'
            : 'subtitle decision-intro-subtitle';
        const title = makeElement('h2', titleClass, def.title);
        intro.appendChild(title);
        const subtitle = makeElement('p', subtitleClass, def.subtitle);
        intro.appendChild(subtitle);
        setBox(intro, 260, 0, 1400, 1080);
        content.appendChild(intro);
        def._bgSelector = def.kind === 'intro-with-bubble' ? '.safety-intro-block' : '.decision-intro-block';
    } else if (def.kind === 'closing') {
        const img = document.createElement('img');
        img.className = 'asset pinned-page-illustration';
        img.src = './assets/' + def.imageFile;
        img.alt = def.imageAlt || '';
        setBox(img, 435, 118, 1050, 847);
        content.appendChild(img);
        def._bgSelector = '.pinned-page-illustration';
    } else if (def.kind === 'message') {
        const msg = makeElement('p', 'closing final-message pinned-page-message', def.message);
        setBox(msg, 260, 330, 1400, 300);
        content.appendChild(msg);

        if (Array.isArray(def.sources) && def.sources.length > 0) {
            const sources = makeElement('aside', 'data-sources');
            sources.setAttribute('aria-label', 'Data sources');
            sources.appendChild(makeElement('p', 'data-sources-title', 'You can also click on the links below for more information on.'));
            const list = makeElement('ul', 'data-sources-list');
            def.sources.forEach((source) => {
                const item = makeElement('li', '');
                const link = makeElement('a', '', source.label);
                link.href = source.url;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
                link.setAttribute('aria-label', `${source.label} (opens in a new tab)`);
                item.appendChild(link);
                list.appendChild(item);
            });
            sources.appendChild(list);
            setBox(sources, 260, 700, 1400, 190);
            content.appendChild(sources);
        }
        def._bgSelector = '.pinned-page-message';
    }

    (def.bubbles || []).forEach((html, i) => {
        const card = makePinnedStoryCard(html, 'pinned-page-bubble pinned-page-bubble-' + i);
        setBox(card, 464, 0, 993, 301);
        content.appendChild(card);
    });

    layer.appendChild(content);
    document.body.appendChild(layer);
}

function revealPinnedChart(chart, p, layerOpacity) {
    if (chart === null) {
        return;
    }
    const reveal = smoothStep(0.0, 0.14, p);
    const opacity = reveal * layerOpacity;
    chart.style.opacity = opacity.toFixed(3);
    chart.style.visibility = opacity > 0.02 ? 'visible' : 'hidden';
    chart.style.transform = `translate3d(0, 0, 0) scale(${getMobileBackgroundScale().toFixed(4)})`;

    const plot = chart.querySelector('.dot-plot');
    const dotProgress = clamp(p / 0.62, 0, 1);
    if (plot !== null) {
        applyDotMorph(plot, dotProgress, { clusterX: 415, clusterY: 258, radius: 60, startScale: 0.35, curve: 20 });
        plot.style.opacity = opacity.toFixed(3);
    }

    const rangeReveal = smoothStep(0.62, 0.84, p);
    chart.querySelectorAll('.range-background').forEach((el) => {
        el.style.opacity = (opacity * rangeReveal).toFixed(3);
        el.style.transform = `scaleX(${rangeReveal.toFixed(3)})`;
    });
    chart.querySelectorAll('.range-mean-highlight').forEach((el) => {
        el.style.opacity = (opacity * rangeReveal).toFixed(3);
        el.style.transform = `scaleY(${(0.7 + (rangeReveal * 0.3)).toFixed(3)})`;
    });

    const countProgress = clamp((p - 0.45) / 0.45, 0, 1);
    const mean = chart.querySelector('.mean');
    if (mean !== null) {
        if (mean.dataset.rangeCountUp === 'true') {
            setScrollTiedRangeCount(mean, parseInt(mean.dataset.rangeStart, 10), parseInt(mean.dataset.rangeEnd, 10), parseInt(mean.dataset.countUp, 10), mean.dataset.colour, countProgress);
        } else {
            const eased = smoothStep(0, 1, countProgress);
            const value = Math.round(lerp(0, parseInt(mean.dataset.countUp, 10), eased));
            mean.innerHTML = `Mean: <span class="${mean.dataset.colour}">${value}</span> cases`;
        }
        mean.style.opacity = opacity.toFixed(3);
    }
    chart.querySelectorAll('h3, .legend').forEach((el) => {
        el.style.opacity = opacity.toFixed(3);
    });
}

function revealPinnedCompare(compare, p, layerOpacity) {
    if (compare === null) {
        return;
    }
    const reveal = smoothStep(0.10, 0.24, p);
    const opacity = reveal * layerOpacity;
    compare.style.opacity = opacity.toFixed(3);
    compare.style.visibility = opacity > 0.02 ? 'visible' : 'hidden';

    const dotProgress = clamp(p / 0.66, 0, 1);
    compare.querySelectorAll('.dot-plot').forEach((plot) => {
        applyDotMorph(plot, dotProgress, { clusterX: 415, clusterY: 258, radius: 50, startScale: 0.30, curve: 24 });
        plot.style.opacity = opacity.toFixed(3);
    });

    const rangeReveal = smoothStep(0.66, 0.84, p);
    compare.querySelectorAll('.range-background').forEach((el) => {
        el.style.opacity = (opacity * rangeReveal).toFixed(3);
        el.style.transform = `scaleX(${rangeReveal.toFixed(3)})`;
    });
    compare.querySelectorAll('.range-mean-highlight').forEach((el) => {
        el.style.opacity = (opacity * rangeReveal).toFixed(3);
        el.style.transform = `scaleY(${(0.7 + (rangeReveal * 0.3)).toFixed(3)})`;
    });

    const countProgress = clamp((p - 0.50) / 0.42, 0, 1);
    compare.querySelectorAll('.mean[data-count-up]').forEach((mean) => {
        if (mean.dataset.rangeCountUp === 'true') {
            setScrollTiedRangeCount(
                mean,
                parseInt(mean.dataset.rangeStart, 10),
                parseInt(mean.dataset.rangeEnd, 10),
                parseInt(mean.dataset.countUp, 10),
                mean.dataset.colour,
                countProgress
            );
        } else {
            setScrollTiedMeanCount(
                mean,
                parseInt(mean.dataset.countUp, 10),
                mean.dataset.colour,
                countProgress
            );
        }
        mean.style.opacity = opacity.toFixed(3);
    });

    compare.querySelectorAll('h2, .compare-label, .vs, .legend').forEach((el) => {
        el.style.opacity = (opacity * reveal).toFixed(3);
        el.style.transform = reveal > 0.01 ? 'translate3d(0, 0, 0)' : 'translate3d(0, 10px, 0)';
    });

    const arrow = compare.querySelector('.arrow-icon');
    if (arrow !== null) {
        const arrowReveal = smoothStep(0.74, 0.90, p);
        arrow.style.opacity = (opacity * arrowReveal).toFixed(3);
        arrow.style.transform = `translate3d(0, ${Math.round(lerp(14, 0, arrowReveal))}px, 0)`;
    }
}

function updatePinnedPage(def, currentDesignY, progressDesignY) {
    const layer = document.querySelector(`.pinned-page-layer[data-scene-id="${def.id}"]`);
    if (layer === null) {
        return;
    }
    const pinStart = def._top;
    const pinDuration = def._pinDuration;
    const pinEnd = pinStart + pinDuration;
    const scrollDist = progressDesignY - pinStart;
    const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);
    const content = layer.querySelector('.pinned-page-content');

    const overall = clamp(scrollDist / pinDuration, 0, 1);
    const layerOpacity = isPinned ? smoothStep(0.0, 0.02, overall) : 0;
    layer.classList.toggle('is-active', isPinned);
    layer.style.opacity = layerOpacity.toFixed(3);
    if (content !== null) {
        content.style.top = `${Math.round(getPinOffsetY())}px`;
        content.style.opacity = layerOpacity.toFixed(3);
    }

    if (def.kind === 'intro') {
        const intro = content.querySelector('.decision-intro-block');
        const reveal = smoothStep(0.00, 0.30, overall);
        const fade = 1 - smoothStep(0.80, 0.96, overall);
        const o = reveal * fade * layerOpacity;
        if (intro !== null) {
            intro.style.opacity = o.toFixed(3);
            intro.style.visibility = o > 0.02 ? 'visible' : 'hidden';
            intro.style.transform = `translate3d(0, ${lerp(18, 0, reveal).toFixed(1)}px, 0)`;
        }
        return;
    }

    if (def.kind === 'message') {
        const msg = content.querySelector('.pinned-page-message');
        const revealP = clamp(scrollDist / PAGE_MESSAGE_REVEAL, 0, 1);
        const eased = smoothStep(0, 1, revealP);
        const o = eased * layerOpacity;
        if (msg !== null) {
            msg.style.opacity = o.toFixed(3);
            msg.style.visibility = o > 0.02 ? 'visible' : 'hidden';
            msg.style.transform = `translate3d(0, ${lerp(18, 0, eased).toFixed(1)}px, 0)`;
        }
        const sources = content.querySelector('.data-sources');
        if (sources !== null) {
            const sourceReveal = smoothStep(0.35, 1.0, revealP);
            const sourceOpacity = sourceReveal * layerOpacity;
            sources.style.opacity = sourceOpacity.toFixed(3);
            sources.style.visibility = sourceOpacity > 0.02 ? 'visible' : 'hidden';
            sources.style.transform = `translate3d(0, ${lerp(14, 0, sourceReveal).toFixed(1)}px, 0)`;
        }
        return;
    }

    const nB = def.bubbles ? def.bubbles.length : 0;
    const bubbleBase = (def.kind === 'bubbles') ? 0 : (def.bubbleStart !== undefined ? def.bubbleStart : PAGE_REVEAL);
    const revealDist = def.revealDist !== undefined ? def.revealDist : PAGE_REVEAL;
    const bubbleSpacing = def.bubbleSpacing !== undefined ? def.bubbleSpacing : PAGE_BUBBLE;
    const bubbleTravel = def.bubbleTravel !== undefined ? def.bubbleTravel : PAGE_BUBBLE;
    const bgFadeTiming = getPinnedBackgroundFadeTiming(def, bubbleBase, bubbleSpacing, bubbleTravel, nB);
    const bgFadeStart = bgFadeTiming.start;
    const bgFadeDuration = bgFadeTiming.duration;

    if (def.kind !== 'bubbles') {
        const revealP = clamp(scrollDist / revealDist, 0, 1);
        const bg = content.querySelector(def._bgSelector);
        const bgHold = 1 - clamp((scrollDist - bgFadeStart) / bgFadeDuration, 0, 1);

        if (def.kind === 'chart') {
            revealPinnedChart(bg, revealP, layerOpacity);
        } else if (def.kind === 'compare') {
            revealPinnedCompare(bg, revealP, layerOpacity);
        } else if (def.kind === 'intro-with-bubble') {
            const reveal = smoothStep(0.00, 0.48, revealP);
            const o = reveal * layerOpacity;
            if (bg !== null) {
                bg.style.opacity = o.toFixed(3);
                bg.style.visibility = o > 0.02 ? 'visible' : 'hidden';
                bg.style.transform = `translate3d(0, ${lerp(20, 0, reveal).toFixed(1)}px, 0)`;
            }
        } else if (def.kind === 'closing') {
            const bgStart = def.bgStart || 0;
            const bgRevealP = clamp((scrollDist - bgStart) / revealDist, 0, 1);
            const introReveal = smoothStep(0.0, 1.0, bgRevealP);
            const o = introReveal * layerOpacity;
            if (bg !== null) {
                bg.style.opacity = o.toFixed(3);
                bg.style.visibility = o > 0.02 ? 'visible' : 'hidden';
                bg.style.transform = `translate3d(0, ${lerp(42, 0, introReveal).toFixed(1)}px, 0) scale(${(lerp(1.035, 1, introReveal) * getMobileBackgroundScale()).toFixed(4)})`;
                bg.style.filter = `blur(${lerp(12, 0, introReveal).toFixed(2)}px)`;
            }
        }

        if (bg !== null && scrollDist >= bgFadeStart) {
            const o = layerOpacity * bgHold;
            bg.style.opacity = o.toFixed(3);
            bg.style.visibility = o > 0.02 ? 'visible' : 'hidden';
        }
    }

    (def.bubbles || []).forEach((_, i) => {
        const card = content.querySelector('.pinned-page-bubble-' + i);
        if (card === null) {
            return;
        }
        const p = clamp((scrollDist - bubbleBase - (i * bubbleSpacing)) / bubbleTravel, 0, 1);
        setVaccineCardScrollPosition(card, p, 1080, -470);
    });
}

function updatePinnedPages(currentDesignY) {
    currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
    const actualDesignY = readDesignScrollY();
    const progressDesignY = actualDesignY > currentDesignY ? actualDesignY : currentDesignY;
    SAFETY_SCENE_DEFS.forEach((def) => updatePinnedPage(def, currentDesignY, progressDesignY));
}

function buildSafetyScenes() {
    let cursor = SAFETY_PIN_BASE;
    SAFETY_SCENE_DEFS.forEach((def) => {
        const overlapBefore = Number(def.overlapBefore) || 0;
        def._pinDuration = safetyPageDuration(def);
        def._top = Math.max(SAFETY_PIN_BASE, cursor - overlapBefore);
        buildPinnedPageLayer(def);
        cursor = def._top + def._pinDuration;
    });

    const safetyDef = SAFETY_SCENE_DEFS.find((d) => d.id === 'safety-intro');
    if (safetyDef) {
        sectionTops.safety = safetyDef._top;
    }

    const closingDef = SAFETY_SCENE_DEFS.find((d) => d.kind === 'closing');
    if (closingDef) {
        sectionTops.closing = closingDef._top;
    }

    const msgDef = SAFETY_SCENE_DEFS[SAFETY_SCENE_DEFS.length - 1];
    const designViewport = window.innerHeight / getScale();
    const messageRevealEnd = msgDef._top + PAGE_MESSAGE_REVEAL;
    const totalDesign = messageRevealEnd + 800 + designViewport;
    const canvas = document.getElementById('canvas');
    const stage = document.getElementById('stage');
    if (canvas !== null) {
        canvas.style.height = totalDesign + 'px';
    }
    if (stage !== null) {
        stage.style.height = `calc(${totalDesign}px * var(--scale))`;
    }
    return cursor;
}

function addScrollTopButton() {
    if (document.querySelector('.scroll-top-button') !== null) {
        return;
    }
    const button = makeElement('button', 'scroll-top-button');
    button.type = 'button';
    button.setAttribute('aria-label', 'Scroll back to the top');
    button.innerHTML = '<span aria-hidden="true">\u2191</span>';
    button.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
    document.body.appendChild(button);

    const toggle = function () {
        const scrollTop = Math.max(
            window.scrollY || 0,
            window.pageYOffset || 0,
            document.documentElement ? document.documentElement.scrollTop : 0,
            document.body ? document.body.scrollTop : 0
        );
        const revealThreshold = isMobileLayout() ? 80 : 500;
        button.classList.toggle('is-visible', scrollTop > revealThreshold);
    };
    window.addEventListener('scroll', toggle, { passive: true });
    window.addEventListener('touchmove', toggle, { passive: true });
    window.addEventListener('resize', toggle, { passive: true });
    window.addEventListener('orientationchange', toggle, { passive: true });
    if (window.visualViewport) {
        window.visualViewport.addEventListener('scroll', toggle, { passive: true });
        window.visualViewport.addEventListener('resize', toggle, { passive: true });
    }
    toggle();
}

function applyResponsiveCardSizing() {
    const pinScale = Math.max(0.01, getPinScale());
    const compact = isMobileLayout();
    const viewport = window.visualViewport;
    const viewportWidth = viewport ? viewport.width : window.innerWidth;
    const viewportHeight = viewport ? viewport.height : window.innerHeight;

    const phoneLike = viewportWidth <= 600;
    const narrowPhone = viewportWidth <= 420;
    const ultraNarrow = viewportWidth <= 360;
    const landscapeCompact = compact && viewportWidth > viewportHeight;

    const horizontalMargin = compact
        ? (ultraNarrow ? 20 : narrowPhone ? 24 : 28)
        : 80;
    const desiredPhysicalWidth = compact
        ? clamp(viewportWidth - horizontalMargin, 288, landscapeCompact ? 560 : 430)
        : Math.min(993 * pinScale, viewportWidth - horizontalMargin);
    const cardW = compact
        ? Math.min(1840, Math.round(desiredPhysicalWidth / pinScale))
        : 993;
    const cardLeft = Math.round((1920 - cardW) / 2);

    const targetPhysicalFont = compact ? 14 : 33;
    const targetPhysicalSmall = compact ? 12 : 22;
    const targetPhysicalPadY = compact
        ? (landscapeCompact ? 16 : ultraNarrow ? 18 : 20)
        : 30;
    const targetPhysicalPadX = compact
        ? (ultraNarrow ? 18 : narrowPhone ? 20 : 24)
        : 50;
    const targetPhysicalRadius = compact
        ? (ultraNarrow ? 18 : 20)
        : 36;
    const targetPhysicalMinHeight = compact
        ? (landscapeCompact ? 112 : ultraNarrow ? 132 : 144)
        : 301;

    const fontPx = compact
        ? Math.round(targetPhysicalFont / pinScale)
        : 33;
    const smallFontPx = compact
        ? Math.round(targetPhysicalSmall / pinScale)
        : 22;
    const paddingY = compact
        ? Math.round(targetPhysicalPadY / pinScale)
        : 30;
    const paddingX = compact
        ? Math.round(targetPhysicalPadX / pinScale)
        : 50;
    const borderRadius = compact
        ? Math.round(targetPhysicalRadius / pinScale)
        : 36;
    const minHeight = compact
        ? Math.round(targetPhysicalMinHeight / pinScale)
        : 301;
    const lineHeight = compact ? 1.35 : 1.2;
    const paragraphMaxWidth = compact ? '100%' : '900px';

    const selector = [
        '.text-card',
        '.pinned-page-bubble',
        '.effectiveness-pinned-card'
    ].join(', ');

    document.querySelectorAll(selector).forEach(function (card) {
        const responsiveCardW = cardW;
        const responsiveCardLeft = Math.round((1920 - responsiveCardW) / 2);

        card.style.setProperty('width', responsiveCardW + 'px', 'important');
        card.style.setProperty('left', responsiveCardLeft + 'px', 'important');
        card.style.setProperty('font-size', fontPx + 'px', 'important');
        card.style.setProperty('line-height', String(lineHeight), 'important');
        card.style.setProperty('padding', `${paddingY}px ${paddingX}px`, 'important');
        card.style.setProperty('border-radius', borderRadius + 'px', 'important');
        if (compact) {
            card.style.setProperty('height', 'auto', 'important');
        } else {
            card.style.removeProperty('height');
        }
        card.style.setProperty('min-height', minHeight + 'px', 'important');
        if (compact) {
            card.style.setProperty('box-shadow', `0 ${Math.round(4 / pinScale)}px ${Math.round(18 / pinScale)}px rgba(0, 0, 0, 0.16)`, 'important');
        } else {
            card.style.removeProperty('box-shadow');
        }

        const paragraph = card.querySelector('p');
        if (paragraph !== null) {
            paragraph.style.maxWidth = paragraphMaxWidth;
            paragraph.style.width = compact ? '100%' : '';
            paragraph.style.lineHeight = String(lineHeight);
            paragraph.style.letterSpacing = compact ? '-0.01em' : '';
            paragraph.style.textWrap = compact ? 'balance' : '';
        }

        card.querySelectorAll('small').forEach(function (small) {
            small.style.fontSize = smallFontPx + 'px';
            small.style.lineHeight = compact ? '1.35' : '';
            small.style.marginTop = compact ? Math.round((ultraNarrow ? 10 : 12) / pinScale) + 'px' : '';
        });
    });

    const introScrollButton = document.getElementById("scrollButton");
    if (introScrollButton !== null) {
        if (compact) {
            const buttonScale = Math.max(0.01, getCumulativeTransformScale(introScrollButton));
            introScrollButton.style.setProperty("min-height", `${Math.ceil(48 / buttonScale)}px`, "important");
            introScrollButton.style.setProperty("min-width", `${Math.ceil(160 / buttonScale)}px`, "important");
            introScrollButton.style.setProperty("padding", `${Math.ceil(10 / buttonScale)}px ${Math.ceil(14 / buttonScale)}px`, "important");
        } else {
            introScrollButton.style.removeProperty("min-height");
            introScrollButton.style.removeProperty("min-width");
            introScrollButton.style.removeProperty("padding");
        }
    }

    document.querySelectorAll('.final-message').forEach((message) => {
        if (compact) {
            const messageScale = Math.max(0.01, getCumulativeTransformScale(message));
            message.style.setProperty(
                'font-size',
                `${(MOBILE_CLOSING_MESSAGE_FONT_SIZE / messageScale).toFixed(3)}px`,
                'important'
            );
            message.style.setProperty('line-height', '1.25', 'important');
        } else {
            message.style.removeProperty('font-size');
            message.style.removeProperty('line-height');
        }
    });

    const dataSources = document.querySelector('.data-sources');
    if (dataSources !== null) {
        const sourcePhysicalFont = compact ? MOBILE_SOURCE_TEXT_FONT_SIZE : 18;
        const sourcePhysicalTitle = compact ? MOBILE_SOURCE_TITLE_FONT_SIZE : 20;
        dataSources.style.fontSize = compact
            ? Math.round(sourcePhysicalFont / pinScale) + 'px'
            : sourcePhysicalFont + 'px';
        const sourceTitle = dataSources.querySelector('.data-sources-title');
        if (sourceTitle !== null) {
            sourceTitle.style.fontSize = compact
                ? Math.round(sourcePhysicalTitle / pinScale) + 'px'
                : sourcePhysicalTitle + 'px';
        }

        dataSources.querySelectorAll('a').forEach((link) => {
            if (compact) {
                link.style.display = 'inline-flex';
                link.style.alignItems = 'center';
                link.style.justifyContent = 'center';
                link.style.minHeight = Math.ceil(44 / pinScale) + 'px';
                link.style.padding = `0 ${Math.ceil(6 / pinScale)}px`;
                link.style.lineHeight = '1.35';
            } else {
                link.style.removeProperty('display');
                link.style.removeProperty('align-items');
                link.style.removeProperty('justify-content');
                link.style.removeProperty('min-height');
                link.style.removeProperty('padding');
                link.style.removeProperty('line-height');
            }
        });
    }
}

function renderArticle() {
    renderIntro();
    createMobileHeroLayer();
    renderEffectiveness();
    buildSafetyScenes();
    fillAllPlots();
    setupRevealObserver();
    addProgressRail();
    addScrollTopButton();
    applyResponsiveCardSizing();
    syncScrollStateToWindow(true);
    updateScrollDrivenScenes(getAnimatedDesignY());
    setupScrollamaState();

    window.requestAnimationFrame(() => {
        const compact = isMobileLayout();
        applyMobileLegendSizing(compact);
        applyMobileFontFloor(compact);
    });
}

let layoutRefreshRafId = null;
let resetPlotCacheOnRefresh = false;

function scheduleResponsiveRefresh(resetPlotCache) {
    resetPlotCacheOnRefresh = resetPlotCacheOnRefresh || Boolean(resetPlotCache);

    if (layoutRefreshRafId !== null) {
        return;
    }

    layoutRefreshRafId = window.requestAnimationFrame(() => {
        layoutRefreshRafId = null;
        updateScale();

        if (resetPlotCacheOnRefresh) {
            document.querySelectorAll(".dot-plot, .mini-dot-plot").forEach((plot) => {
                delete plot.dataset.cachedWidth;
                delete plot.dataset.cachedHeight;
            });
        }
        resetPlotCacheOnRefresh = false;

        applyResponsiveCardSizing();
        syncScrollStateToWindow(true);
        updateScrollDrivenScenes(getAnimatedDesignY());

        if (storyScroller !== null) {
            storyScroller.resize();
        }
    });
}

window.addEventListener("resize", () => {
    scheduleResponsiveRefresh(true);
}, { passive: true });

if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
        scheduleResponsiveRefresh(false);
    }, { passive: true });
}

window.addEventListener("orientationchange", () => {
    window.setTimeout(() => {
        scheduleResponsiveRefresh(true);
    }, 120);
}, { passive: true });

window.addEventListener("load", function () {
    updateScale();
    renderArticle();

    const button = document.getElementById("scrollButton");

    if (button !== null) {
        button.addEventListener("click", scrollToBurden);
    }
});
