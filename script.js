const designWidth = 1920;
const designHeight = 72000;

const ARTICLE_VARIANT = document.body.dataset.articleVariant === "v2" ? "v2" : "v1";
const ARTICLE_FEATURES = Object.freeze({
	showUncertainty: ARTICLE_VARIANT === "v1"
});

const MOBILE_LAYOUT_QUERY = "(max-width: 900px), (pointer: coarse) and (max-width: 1180px)";
const DESKTOP_TIMELINE_SCALE = 1.28;
const MOBILE_TIMELINE_SCALE = 5.00;
let activeTimelineScale = window.matchMedia(MOBILE_LAYOUT_QUERY).matches ?
	MOBILE_TIMELINE_SCALE :
	DESKTOP_TIMELINE_SCALE;

function getTimelineScale() {
	return isMobileLayout() ?
		MOBILE_TIMELINE_SCALE :
		DESKTOP_TIMELINE_SCALE;
}

function getActiveTimelineScale() {
	return activeTimelineScale;
}
const dotSpacing = 20.95;
const dotSpacingY = 20.88;
const dotSize = 12;

const SECTION_LAYOUTS = Object.freeze({
	v1: {
		intro: 0,
		effectiveness: 10570,
		uncertainty: 15720,
		effectivenessRange: 22870,
		safety: 30120,
		closing: 42920
	},
	v2: {
		intro: 0,
		effectiveness: 10570,
		safety: 19505,
		closing: 36000
	}
});

const sectionTops = {
	...SECTION_LAYOUTS[ARTICLE_VARIANT]
};

const sections = {
	intro: document.getElementById("section-intro"),
	effectiveness: document.getElementById("section-effectiveness"),
	uncertainty: document.getElementById("section-uncertainty"),
	effectivenessRange: document.getElementById("section-effectiveness-range"),
	safety: document.getElementById("section-safety"),
	closing: document.getElementById("section-closing")
};

const navSections = [{
		key: "disease",
		label: "Disease burden",
		getTop: () => getDiseaseNavigationTop()
	},
	{
		key: "effectiveness",
		label: "Effectiveness",
		getTop: () => getSceneNavigationTop(".effectiveness-scrolly", 520)
	},
	...(ARTICLE_FEATURES.showUncertainty ? [{
		key: "uncertainty",
		label: "Uncertainty",
		getTop: () => getSceneNavigationTop(".reliability-scrolly", 260)
	}] : []),
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
	return getSceneNavigationTop(".disease-scrolly", 40);
}

function getSafetyNavigationTop() {
	if (ARTICLE_FEATURES.showUncertainty) {
		const scene = document.querySelector(".effectiveness-range-scrolly");
		if (scene !== null) {
			const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
			const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
			const buildDuration = 5000;
			const safetyIntroOffset = 4790;
			return Math.max(0, sceneTop - pinOffset + buildDuration + safetyIntroOffset);
		}
	}

	const safetyIntro = typeof PINNED_SCENE_DEFS !== "undefined" ?
		PINNED_SCENE_DEFS.find((def) => def.id === "safety-intro") :
		null;
	if (safetyIntro && Number.isFinite(safetyIntro._top)) {
		const fullyVisibleOffset = Math.max(900, (Number(safetyIntro.revealDist) || 1500) * 0.60);
		return safetyIntro._top + fullyVisibleOffset;
	}
	return Number(sectionTops.safety) || PINNED_SCENE_BASE;
}

function getDecisionNavigationTop() {
	const decisionDef = typeof PINNED_SCENE_DEFS !== "undefined" ?
		PINNED_SCENE_DEFS.find((def) => def.id === "decision-intro") :
		null;
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
	return window.matchMedia(MOBILE_LAYOUT_QUERY).matches;
}

const scrollState = {
	targetDesignY: 0,
	currentDesignY: 0,
	rafId: null,
	lastFrameTime: null
};

function getPageScrollTop() {
	const values = [
		window.scrollY,
		window.pageYOffset,
		document.documentElement ? document.documentElement.scrollTop : 0,
		document.body ? document.body.scrollTop : 0
	].filter((value) => Number.isFinite(value));

	return Math.max(0, ...(values.length > 0 ? values : [0]));
}

function readDesignScrollY() {
	return getPageScrollTop() / (getScale() * getActiveTimelineScale());
}

function designYToScrollTop(designY) {
	return designY * getScale() * getActiveTimelineScale();
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
	updateTopProgressBar();
	updateProgressRail();
	updateMobileHeroLayer(currentDesignY);
	updateDiseaseScrolly(currentDesignY);
	updateRiskScrolly(currentDesignY);
	updateVaccinationScrolly(currentDesignY);
	updateEffectivenessScrolly(currentDesignY);
	if (ARTICLE_FEATURES.showUncertainty) {
		updateReliabilityScrolly(currentDesignY);
		updateUncertaintyConceptScrolly(currentDesignY);
		updateEffectivenessRangeScrolly(currentDesignY);
	}
	updatePinnedPages(currentDesignY);
	enforceSingleMobileSpeechCard();
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
		const baseFraction = distance > 2600 ?
			MOTION.scrollCatchupLarge :
			distance > 1400 ?
			MOTION.scrollCatchupMedium :
			distance > 620 ?
			MOTION.scrollCatchupSmall :
			MOTION.scrollCatchupFine;
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

function getMatchedStaticPinTop(pinOffset, staticY, pinnedY) {
	const stageScale = getScale();
	const pinScale = getPinScale();
	return (pinOffset * stageScale * getActiveTimelineScale()) + (staticY * pinScale) - (pinnedY * pinScale);
}

function addStagger(element, index) {
	if (!prefersReducedMotion) {
		element.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 80}ms`);
	}

	return element;
}

function updateScale() {
	const viewport = window.visualViewport;
	const compact = isMobileLayout();
	const viewportWidth = compact && viewport ?
		viewport.width :
		(document.documentElement.clientWidth || window.innerWidth);
	const viewportHeight = compact && viewport ?
		viewport.height :
		window.innerHeight;
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
	document.documentElement.style.setProperty(
		"--static-pin-ratio",
		(pinScale / Math.max(0.01, stageScale)).toFixed(5)
	);
	document.documentElement.style.setProperty("--pin-offset-y", `${pinOffsetY.toFixed(2)}px`);
	document.documentElement.style.setProperty("--viewport-width", `${viewportWidth.toFixed(2)}px`);
	document.documentElement.style.setProperty("--viewport-height", `${viewportHeight.toFixed(2)}px`);

	const heroTitleFontSize = 77 * stageScale / Math.max(0.01, pinScale);
	document.documentElement.style.setProperty(
		"--hero-title-font-size",
		`${heroTitleFontSize.toFixed(3)}px`
	);

	const uncertaintyGraphicScale = compact ? 1.32 : 1;
	const uncertaintyRenderedScale = Math.max(0.01, pinScale * uncertaintyGraphicScale);
	const uncertaintyGraphicFont = 12 / uncertaintyRenderedScale;
	document.documentElement.style.setProperty(
		"--uncertainty-mobile-graphic-font-size",
		`${uncertaintyGraphicFont.toFixed(3)}px`
	);
	document.documentElement.style.setProperty(
		"--uncertainty-mobile-small-font-size",
		`${(10 / uncertaintyRenderedScale).toFixed(3)}px`
	);
	document.documentElement.style.setProperty(
		"--uncertainty-mobile-card-font-size",
		`${(12 / Math.max(0.01, pinScale)).toFixed(3)}px`
	);
	document.documentElement.style.setProperty(
		"--uncertainty-mobile-note-font-size",
		`${uncertaintyGraphicFont.toFixed(3)}px`
	);
	document.documentElement.style.setProperty(
		"--uncertainty-mobile-note-gap",
		`${(10 / uncertaintyRenderedScale).toFixed(3)}px`
	);

	if (compact) {
		const cardPhysicalTop = clamp(viewportHeight * 0.18, 120, 160);
		const centeredGraphicY = viewportHeight * 0.50;
		const designTopForCard = (cardPhysicalTop - pinOffsetY) / Math.max(0.01, pinScale);
		const designTopForStage = (stageHeight) => (
			centeredGraphicY -
			pinOffsetY -
			((stageHeight * uncertaintyRenderedScale) / 2)
		) / Math.max(0.01, pinScale);

		document.documentElement.style.setProperty(
			"--uncertainty-mobile-card-top",
			`${designTopForCard.toFixed(2)}px`
		);
		document.documentElement.style.setProperty(
			"--uncertainty-mobile-source-top",
			`${designTopForStage(440).toFixed(2)}px`
		);
		document.documentElement.style.setProperty(
			"--uncertainty-mobile-variation-top",
			`${designTopForStage(620).toFixed(2)}px`
		);
		document.documentElement.style.setProperty(
			"--uncertainty-mobile-interval-top",
			`${designTopForStage(500).toFixed(2)}px`
		);
		document.documentElement.style.setProperty(
			"--uncertainty-mobile-precision-top",
			`${designTopForStage(480).toFixed(2)}px`
		);
		document.documentElement.style.setProperty(
			"--uncertainty-mobile-interpretation-top",
			`${designTopForStage(520).toFixed(2)}px`
		);
	}
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

function addScrollButton(sectionName) {
	const button = makeElement("button", "scroll-button", "<span class=\"scroll-guide\">Keep scrolling as you read to follow the story.</span><span class=\"scroll-label\">Scroll Down</span><span class=\"scroll-arrow\" aria-hidden=\"true\">↓</span>");
	button.type = "button";
	button.id = "scrollButton";
	button.setAttribute("aria-label", "Scroll to the disease burden section");
	return appendElement(sectionName, button, 750, 856, 420);
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
	meanHighlight.alt = "Mean value in the uncertainty range";
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

	const fragment = document.createDocumentFragment();
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

		fragment.appendChild(dot);
	}
	plot.appendChild(fragment);
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
		mean.alt = "Mean value in the uncertainty range";

		const rangeText = makeElement(
			"span",
			"legend-text",
			"Uncertainty range, with the strongest colour indicating the mean value"
		);

		range.appendChild(mean);
		rangeItem.appendChild(range);
		rangeItem.appendChild(rangeText);
		legend.appendChild(rangeItem);
	}

	return legend;
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

const SPEECH_SCROLL_DISTANCE = 1595;

const MOTION = {
	speechStartY: 1080,
	speechEndY: -520,
	speechFadeInStart: 0.015,
	speechFadeInEnd: 0.10,
	speechFadeOutStart: 0.885,
	speechFadeOutEnd: 0.985,
	mobileSpeechStartY: 1180,
	mobileSpeechEndY: -980,
	mobileSpeechEntryViewportPadding: 28,
	mobileSpeechExitViewportPadding: 24,
	mobileSpeechFadeInStart: 0.015,
	mobileSpeechFadeInEnd: 0.12,
	mobileSpeechFadeOutStart: 0.865,
	mobileSpeechFadeOutEnd: 0.985,
	scrollCatchupLarge: 0.42,
	scrollCatchupMedium: 0.34,
	scrollCatchupSmall: 0.26,
	scrollCatchupFine: 0.20
};

function getSpeechTravelProgress(progress) {
	return clamp(progress, 0, 1);
}

function getMinimumMobileCardDistance() {
	const viewport = window.visualViewport;
	const viewportHeight = viewport ? viewport.height : window.innerHeight;
	const physicalDistance = Math.max(620, viewportHeight * 1.25);
	const designToPhysical = Math.max(
		0.01,
		getScale() * getActiveTimelineScale()
	);

	return physicalDistance / designToPhysical;
}

function getMobileSequenceTiming(index, count, sequenceEnd, options) {
	const settings = options || {};
	const startPadding = Number.isFinite(settings.startPadding) ? settings.startPadding : 0;
	const gap = Number.isFinite(settings.gap) ? settings.gap : 90;
	const safeCount = Math.max(1, count || 1);
	const usableDistance = Math.max(
		safeCount,
		sequenceEnd - startPadding - (gap * Math.max(0, safeCount - 1))
	);
	const calculatedCardDistance = usableDistance / safeCount;
	const cardDistance = isMobileLayout() ?
		Math.max(calculatedCardDistance, getMinimumMobileCardDistance()) :
		calculatedCardDistance;
	const startDistance = startPadding + (index * (cardDistance + gap));
	return {
		cardDistance,
		startDistance
	};

}

function getVariableSequenceTiming(index, durations, startPadding, gap) {
	const safeDurations = Array.isArray(durations) && durations.length > 0 ?
		durations.map((duration) => Math.max(1, Number(duration) || 1)) : [1];
	const safeIndex = clamp(index, 0, safeDurations.length - 1);
	const safeGap = Math.max(0, Number(gap) || 0);
	let startDistance = Math.max(0, Number(startPadding) || 0);

	for (let cursor = 0; cursor < safeIndex; cursor += 1) {
		startDistance += safeDurations[cursor] + safeGap;
	}
	return {
		cardDistance: safeDurations[safeIndex],
		startDistance
	};
}

function getMobileSpeechGeometry(card) {
	if (card === null) return null;

	const offsetParent = card.offsetParent || card.parentElement;
	if (offsetParent === null) return null;

	const parentRect = offsetParent.getBoundingClientRect();
	const parentScale = Math.max(0.01, getCumulativeTransformScale(offsetParent));
	const cardBaseTop = parentRect.top + ((card.offsetTop || 0) * parentScale);
	const cardHeight = Math.max(1, (card.offsetHeight || 1) * parentScale);

	return {
		parentScale,
		cardBaseTop,
		cardHeight
	};
}

function getReferenceScrollItemDuration(card) {
	const geometry = getMobileSpeechGeometry(card);
	const viewport = window.visualViewport;
	const viewportHeight = viewport ? viewport.height : window.innerHeight;
	const cardHeight = geometry === null ? 0 : geometry.cardHeight;
	const physicalScrollPerDesignUnit = Math.max(
		0.01,
		getScale() * getActiveTimelineScale()
	);

	return Math.max(1, (viewportHeight + cardHeight) / physicalScrollPerDesignUnit);
}

function getReferenceScrollItemProgress(card, scrollDistance, startDistance) {
	return clamp(
		(scrollDistance - startDistance) / getReferenceScrollItemDuration(card),
		0,
		1
	);
}

function getReferenceSequenceProgress(card, scrollDistance, index, count, sequenceEnd, options) {
	const timing = getMobileSequenceTiming(index, count, sequenceEnd, options);
	return getReferenceScrollItemProgress(card, scrollDistance, timing.startDistance);
}

function getReferenceVariableSequenceProgress(card, scrollDistance, index, durations, startPadding, gap) {
	const timing = getVariableSequenceTiming(index, durations, startPadding, gap);
	return getReferenceScrollItemProgress(card, scrollDistance, timing.startDistance);
}

function resolveMobileSpeechStartY(card) {
	const geometry = getMobileSpeechGeometry(card);
	if (geometry === null) return MOTION.mobileSpeechStartY;

	const targetTop = window.innerHeight;
	const resolved = (targetTop - geometry.cardBaseTop) / geometry.parentScale;
	return Number.isFinite(resolved) ? resolved : MOTION.mobileSpeechStartY;
}

function resolveMobileSpeechEndY(card) {
	const geometry = getMobileSpeechGeometry(card);
	if (geometry === null) return MOTION.mobileSpeechEndY;

	const targetTop = -geometry.cardHeight;
	const resolved = (targetTop - geometry.cardBaseTop) / geometry.parentScale;
	return Number.isFinite(resolved) ? resolved : MOTION.mobileSpeechEndY;
}

function setHybridSpeechCardMotion(card, progress) {
	if (card === null) return;

	const safeProgress = clamp(progress, 0, 1);
	const mobile = isMobileLayout();
	const geometry = getMobileSpeechGeometry(card);
	const resolvedStartY = resolveMobileSpeechStartY(card);
	const resolvedEndY = resolveMobileSpeechEndY(card);
	const fadeInStart = mobile ? MOTION.mobileSpeechFadeInStart : MOTION.speechFadeInStart;
	const fadeInEnd = mobile ? MOTION.mobileSpeechFadeInEnd : MOTION.speechFadeInEnd;
	const travel = getSpeechTravelProgress(safeProgress);
	const y = lerp(resolvedStartY, resolvedEndY, travel);
	const fadeIn = smoothStep(fadeInStart, fadeInEnd, safeProgress);
	let fadeOut = 1;
	if (geometry !== null) {
		const progressBar = document.querySelector(".story-top-progress");
		const progressBarHeight = progressBar === null ?
			0 :
			Math.max(0, progressBar.getBoundingClientRect().height || 0);
		const actualTop = geometry.cardBaseTop + (y * geometry.parentScale);
		const actualBottom = actualTop + geometry.cardHeight;
		fadeOut = smoothStep(
			progressBarHeight - 12,
			progressBarHeight + 24,
			actualBottom
		);
	} else {
		const fadeOutStart = mobile ? 0.965 : 0.965;
		const fadeOutEnd = mobile ? 0.999 : 0.999;
		fadeOut = 1 - smoothStep(fadeOutStart, fadeOutEnd, safeProgress);
	}

	const hasExited = safeProgress >= 0.9999;
	const opacity = hasExited ? 0 : (fadeIn * fadeOut);

	card.style.opacity = opacity.toFixed(3);
	card.style.visibility = opacity > 0.01 ? "visible" : "hidden";
	card.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
}

function enforceSingleMobileSpeechCard() {
	if (!isMobileLayout()) {
		return;
	}

	const candidates = Array.from(document.querySelectorAll('.text-card'))
		.filter((card) => !card.classList.contains('uncertainty-concept-card'))
		.map((card) => {
			const opacity = parseFloat(card.style.opacity || '0');
			const rect = card.getBoundingClientRect();
			const onscreen = rect.bottom > -40 && rect.top < (window.innerHeight + 40);
			return {
				card,
				opacity: Number.isFinite(opacity) ? opacity : 0,
				rect,
				onscreen
			};
		})
		.filter((item) => item.opacity > 0.01 && item.onscreen);

	if (candidates.length <= 1) {
		return;
	}

	candidates.sort((a, b) => {
		if (Math.abs(b.opacity - a.opacity) > 0.015) {
			return b.opacity - a.opacity;
		}
		const viewportCenter = window.innerHeight / 2;
		const aCenter = (a.rect.top + a.rect.bottom) / 2;
		const bCenter = (b.rect.top + b.rect.bottom) / 2;
		return Math.abs(aCenter - viewportCenter) - Math.abs(bCenter - viewportCenter);
	});

	candidates.slice(1).forEach(({
		card
	}) => {
		card.style.opacity = '0';
		card.style.visibility = 'hidden';
	});
}

function makeDiseaseCard(html, className) {
	const card = makeElement("section", "text-card disease-card " + className);
	card.appendChild(makeElement("p", "", html));
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
	setBox(baseImage, 383, imageTop - 34, 1155, 758);
	wrapper.appendChild(baseImage);

	if (includeCards) {
		const firstCard = makeDiseaseCard(
			"<span class=\"grey\">Herpes zoster, also known as shingles, is</span> caused<br>by the same virus that causes chickenpox.<br><span class=\"grey\">After a person has chickenpox, the virus stays</span> inactive in the nerve cells<span class=\"grey\">, and occurs when the virus</span> reactivates later in life.",
			"disease-card-one"
		);
		wrapper.appendChild(firstCard);

		const secondCard = makeDiseaseCard(
			"<span class=\"grey\">It can cause severe</span> pain and a blistering rash. Persistent, often debilitating nerve pain <span class=\"grey\">may persist after the rash heals, making it very uncomfortable and affecting one’s daily life. </span>Complications such as vision damage and encephalitis<span class=\"grey\"> may also remain.</span>",
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
	const content = makeDiseaseDiagramContent("disease-pin-content", 10, 110, true);
	layer.appendChild(content);
	document.body.appendChild(layer);
	return layer;
}

function addDiseaseScrollScene(sectionName, absoluteTop) {
	const sceneHeight = 3445;
	const pinOffset = 150;
	const pinDuration = 3145;
	const transitionOutStart = (1250 + SPEECH_SCROLL_DISTANCE) / pinDuration;
	const scene = makeElement("div", "disease-scrolly");
	scene.dataset.absoluteTop = String(absoluteTop);
	scene.dataset.sceneHeight = String(sceneHeight);
	scene.dataset.pinOffset = String(pinOffset);
	scene.dataset.pinDuration = String(pinDuration);
	scene.dataset.transitionOutStart = String(transitionOutStart);

	const staticLayer = makeDiseaseDiagramContent("disease-static-layer", 10, 110, false);
	scene.appendChild(staticLayer);

	appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
	createDiseasePinLayer();
	return scene;
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
	const landingHandoffStart = pinStart - 420;
	const landingHandoffEnd = pinStart + 40;
	const overallProgress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
	const isPinned = getScenePinnedState(currentDesignY, landingHandoffStart, pinEnd);
	const landingHandoff = smoothStep(landingHandoffStart, landingHandoffEnd, currentDesignY);
	const transitionProgress = smoothStep(transitionOutStart, 1.0, overallProgress);
	const contentOpacity = isPinned ? (landingHandoff * (1 - transitionProgress)) : 0;
	const sceneBottom = sceneTop + parseFloat(scene.dataset.sceneHeight || "0");
	const shouldKeepStaticHidden = currentDesignY >= landingHandoffStart;
	const staticLayer = scene.querySelector(".disease-static-layer");
	const content = pinLayer.querySelector(".disease-pin-content");
	const diseaseTitle = pinLayer.querySelector(".disease-title");
	const diseaseImage = pinLayer.querySelector(".disease-base-image");
	const firstCard = pinLayer.querySelector(".disease-card-one");
	const secondCard = pinLayer.querySelector(".disease-card-two");

	pinLayer.classList.toggle("is-active", isPinned);
	pinLayer.style.opacity = isPinned ? "1" : "0";

	if (content !== null) {
		const diseaseBlur = lerp(0, 1.15, transitionProgress);
		const landingEnterY = Math.round(lerp(12, 0, landingHandoff));
		if (isMobileLayout()) {
			content.style.top = `${Math.round(getPinOffsetY())}px`;
			content.style.transform = `translate3d(-50%, ${landingEnterY}px, 0) scale(var(--pin-scale))`;
		} else {
			content.style.top =
				`${Math.round(
                    getMatchedStaticPinTop(
                        pinOffset,
                        10,
                        10
                    )
                )}px`;

			content.style.transform =
				`translate3d(-50%, ${landingEnterY}px, 0) scale(var(--pin-scale))`;
		}
		content.style.opacity = contentOpacity.toFixed(3);
		content.style.filter = "none";

		if (diseaseTitle !== null) {
			const entryBlur = lerp(1.8, 0, landingHandoff);
			diseaseTitle.style.filter = `blur(${Math.max(diseaseBlur, entryBlur).toFixed(2)}px)`;
		}
		if (diseaseImage !== null) {
			const entryBlur = lerp(1.8, 0, landingHandoff);
			diseaseImage.style.filter = `blur(${Math.max(diseaseBlur, entryBlur).toFixed(2)}px)`;
			diseaseImage.style.transform = `scale(${getMobileBackgroundScale().toFixed(4)})`;
			diseaseImage.style.transformOrigin = "center center";
		}
	}

	if (staticLayer !== null) {
		staticLayer.classList.toggle("is-hidden", shouldKeepStaticHidden);
		staticLayer.style.opacity = shouldKeepStaticHidden ? "0" : "1";
	}

	const scrollDist = currentDesignY - pinStart;
	const speechScrollDist = readDesignScrollY() - pinStart;

	const diseaseSequenceEnd = pinDuration * transitionOutStart;
	const diseaseSequenceConfig = isMobileLayout() ? {
		startPadding: 180,
		gap: 160
	} : {
		startPadding: 0,
		gap: 160
	};

	if (firstCard !== null) {
		setHybridSpeechCardMotion(
			firstCard,
			getReferenceSequenceProgress(
				firstCard,
				speechScrollDist,
				0,
				2,
				diseaseSequenceEnd,
				diseaseSequenceConfig
			)
		);
	}
	if (secondCard !== null) {
		setHybridSpeechCardMotion(
			secondCard,
			getReferenceSequenceProgress(
				secondCard,
				speechScrollDist,
				1,
				2,
				diseaseSequenceEnd,
				diseaseSequenceConfig
			)
		);
	}
}

function makeRiskCard(html, className) {
	const card = makeElement("section", "text-card risk-card " + className);
	card.appendChild(makeElement("p", "", html));
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
	baseImage.alt = "The risk of developing herpes zoster is higher in adults aged 50 and older, and people with weakened immune systems.";
	setBox(baseImage, 360, imageTop, 1200, 787);
	wrapper.appendChild(baseImage);

	if (includeCards) {
		const firstCard = makeRiskCard(
			"<span class=\"grey\">The risk of developing herpes zoster is</span> higher in adults aged 50 and older, and people with weakened immune systems.",
			"risk-card-one"
		);
		wrapper.appendChild(firstCard);

		const secondCard = makeRiskCard(
			"Medical conditions such as diabetes, chronic kidney disease, or lung disease<span class=\"grey\"> may also increase the risk.</span>",
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
	const content = makeRiskGroupContent("risk-pin-content", 72, 120, true);
	layer.appendChild(content);
	document.body.appendChild(layer);
	return layer;
}

function addRiskScrollScene(sectionName, absoluteTop) {
	const sceneHeight = 3595;
	const pinOffset = 120;
	const pinDuration = 3445;
	const transitionOutStart = (1450 + SPEECH_SCROLL_DISTANCE) / pinDuration;
	const scene = makeElement("div", "risk-scrolly");
	scene.dataset.absoluteTop = String(absoluteTop);
	scene.dataset.sceneHeight = String(sceneHeight);
	scene.dataset.pinOffset = String(pinOffset);
	scene.dataset.pinDuration = String(pinDuration);
	scene.dataset.transitionOutStart = String(transitionOutStart);

	const staticLayer = makeRiskGroupContent("risk-static-layer", 72, 120, false);
	scene.appendChild(staticLayer);

	appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
	createRiskPinLayer();
	return scene;
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
	const shouldKeepStaticHidden = currentDesignY >= pinStart;
	const diseaseScene = document.querySelector(".disease-scrolly");
	let riskHandoffOpacity = 1;
	let riskVisualReadyY = pinStart;

	if (diseaseScene !== null) {
		const diseaseTop = parseFloat(diseaseScene.dataset.absoluteTop || "0");
		const diseasePinOffset = parseFloat(diseaseScene.dataset.pinOffset || "0");
		const diseasePinDuration = parseFloat(diseaseScene.dataset.pinDuration || "1");
		const diseasePinStart = diseaseTop - diseasePinOffset;
		const diseaseTransitionStart = parseFloat(diseaseScene.dataset.transitionOutStart || "0.94");
		const riskHandoffStartY = diseasePinStart + (diseasePinDuration * diseaseTransitionStart);
		const riskHandoffEndY = diseasePinStart + diseasePinDuration;

		riskHandoffOpacity = smoothStep(riskHandoffStartY, riskHandoffEndY, currentDesignY);
		riskVisualReadyY = Math.max(pinStart, riskHandoffEndY);
		setSceneHandoffVeil(0);
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

	const sceneExitStart = transitionOutStart;
	const sceneExitEnd = 1.0;

	if (content !== null) {
		const exitLift = smoothStep(sceneExitStart, sceneExitEnd, overallProgress);
		const exitY = Math.round(lerp(0, -24, exitLift));
		const enterY = Math.round(lerp(10, 0, riskHandoffOpacity));
		const riskFadeIn = smoothStep(0.00, 0.16, overallProgress);
		const riskFadeOut = 1 - smoothStep(sceneExitStart, sceneExitEnd, overallProgress);
		const riskOpacity = contentOpacity * riskFadeIn * riskFadeOut;
		const incomingBlur = lerp(3.2, 0, Math.min(riskHandoffOpacity, riskFadeIn));
		content.style.top = isMobileLayout() ?
			`${Math.round(getPinOffsetY())}px` :
			`${Math.round(getMatchedStaticPinTop(pinOffset, 72, 72))}px`;
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

	const scrollDist = currentDesignY - pinStart;
	const speechScrollDist = readDesignScrollY() - pinStart;

	const riskSequenceEnd = pinDuration * sceneExitStart;
	const riskVisualReadyDistance = Math.max(0, riskVisualReadyY - pinStart);
	const riskSequenceConfig = {
		startPadding: Math.max(
			isMobileLayout() ? 180 : 40,
			riskVisualReadyDistance
		),
		gap: 160
	};

	if (firstCard !== null) {
		setHybridSpeechCardMotion(
			firstCard,
			getReferenceSequenceProgress(
				firstCard,
				speechScrollDist,
				0,
				2,
				riskSequenceEnd,
				riskSequenceConfig
			)
		);
	}
	if (secondCard !== null) {
		setHybridSpeechCardMotion(
			secondCard,
			getReferenceSequenceProgress(
				secondCard,
				speechScrollDist,
				1,
				2,
				riskSequenceEnd,
				riskSequenceConfig
			)
		);
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
		"<span class=\"grey\">Here, we</span> walk through study data on the effectiveness and safety of the herpes zoster vaccine<span class=\"grey\"> in adults aged 60 years and older over a period of 3.1 years.</span>",
		"vaccine-card-source",
		"Source: Cochrane Database of Systematic reviews (2023)"
	);
	content.appendChild(sourceCard);

	const comparisonCard = makeVaccineCard(
		"<span class=\"grey\">This data</span> compares the number of herpes zoster cases<span class=\"grey\"> and</span> serious adverse events between the vaccine group and the placebo group<span class=\"grey\"> who did not receive the actual vaccine but were given a harmless substance.</span>",
		"vaccine-card-comparison"
	);
	content.appendChild(comparisonCard);

	const comparisonDetailCard = makeVaccineCard(
		"<span class=\"grey\">The clinical trial findings are</span> shown as the number of people affected per 1000 participants<span class=\"grey\">, to facilitate comparison between the vaccine and placebo groups.</span>",
		"vaccine-card-detail"
	);
	content.appendChild(comparisonDetailCard);

	layer.appendChild(content);
	document.body.appendChild(layer);
	return layer;
}

function addVaccinationScrollScene(sectionName, absoluteTop) {
	const sceneHeight = 4545;
	const pinOffset = 0;
	const pinDuration = 4545;
	const scene = makeElement("div", "vaccine-scrolly");
	scene.dataset.absoluteTop = String(absoluteTop);
	scene.dataset.sceneHeight = String(sceneHeight);
	scene.dataset.pinOffset = String(pinOffset);
	scene.dataset.pinDuration = String(pinDuration);

	appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
	createVaccinePinLayer();
	return scene;
}

function setVaccineCardScrollPosition(card, progress) {
	setHybridSpeechCardMotion(card, progress);
}

function setOpaqueSpeechCardScrollPosition(card, progress) {
	setHybridSpeechCardMotion(card, progress);
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

	const riskScene = document.querySelector(".risk-scrolly");
	let handoffStart = pinStart - 260;
	let handoffEnd = pinStart + 120;
	let activeStart = handoffStart;

	if (riskScene !== null) {
		const riskTop = parseFloat(riskScene.dataset.absoluteTop || "0");
		const riskPinOffset = parseFloat(riskScene.dataset.pinOffset || "0");
		const riskPinDuration = parseFloat(riskScene.dataset.pinDuration || "1");
		const riskTransitionOutStart = parseFloat(riskScene.dataset.transitionOutStart || "0.88");
		const riskPinStart = riskTop - riskPinOffset;
		const riskPinEnd = riskPinStart + riskPinDuration;
		const riskExitStartY = riskPinStart + (riskPinDuration * riskTransitionOutStart);

		activeStart = riskExitStartY;
		handoffStart = riskExitStartY + 70;
		handoffEnd = riskPinEnd;
	}

	const handoffReveal = smoothStep(handoffStart, handoffEnd, currentDesignY);
	const isPinned = getScenePinnedState(currentDesignY, activeStart, pinEnd);
	const content = pinLayer.querySelector(".vaccine-pin-content");
	const title = pinLayer.querySelector(".vaccine-title");
	const plots = pinLayer.querySelector(".vaccine-plots");
	const sourceCard = pinLayer.querySelector(".vaccine-card-source");
	const comparisonCard = pinLayer.querySelector(".vaccine-card-comparison");
	const comparisonDetailCard = pinLayer.querySelector(".vaccine-card-detail");

	const vaccineHandoffDuration = 400;
	const vaccineFadeStart = (pinDuration - vaccineHandoffDuration) / pinDuration;
	const sceneFadeOut = 1 - smoothStep(vaccineFadeStart, 1.0, overallProgress);
	const sceneOpacity = isPinned ? Math.min(handoffReveal, sceneFadeOut) : 0;

	pinLayer.classList.toggle("is-active", isPinned);
	pinLayer.style.opacity = sceneOpacity.toFixed(3);

	if (content !== null) {
		const enterY = Math.round(lerp(18, 0, handoffReveal));
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = sceneOpacity.toFixed(3);
		content.style.transform = `translate3d(-50%, ${enterY}px, 0) scale(var(--pin-scale))`;
	}

	if (title !== null) {
		const titleMoveProgress = smoothStep(0.30, 0.50, overallProgress);
		const titleTop = Math.round(lerp(408, 126, titleMoveProgress));
		title.style.top = `${titleTop}px`;
		title.style.opacity = sceneOpacity.toFixed(3);
		title.style.filter = `blur(${lerp(2.0, 0, handoffReveal).toFixed(2)}px)`;
	}

	if (plots !== null) {
		const plotIntro = smoothStep(0.44, 0.60, overallProgress);
		const plotProgress = plotIntro * handoffReveal;
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

	const scrollDist = currentDesignY - pinStart;
	const speechScrollDist = readDesignScrollY() - pinStart;

	const vaccineSequenceEnd = pinDuration - vaccineHandoffDuration;
	const mobileVaccineSequenceConfig = {
		startPadding: 820,
		gap: 140
	};

	const desktopVaccineStartPadding = 980;
	const desktopVaccineGap = 36;
	const desktopSourceDistance = 1200;
	const desktopRemainingDistance = Math.max(
		2,
		vaccineSequenceEnd -
		desktopVaccineStartPadding -
		desktopSourceDistance -
		(desktopVaccineGap * 2)
	);
	const desktopOtherDistance = desktopRemainingDistance / 2;
	const desktopVaccineDurations = [
		desktopSourceDistance,
		desktopOtherDistance,
		desktopOtherDistance
	];

	const getVaccineCardProgress = (card, index) => {
		if (isMobileLayout()) {
			return getReferenceSequenceProgress(
				card,
				speechScrollDist,
				index,
				3,
				vaccineSequenceEnd,
				mobileVaccineSequenceConfig
			);
		}

		return getReferenceVariableSequenceProgress(
			card,
			speechScrollDist,
			index,
			desktopVaccineDurations,
			desktopVaccineStartPadding,
			desktopVaccineGap
		);
	};

	if (sourceCard !== null) {
		setVaccineCardScrollPosition(
			sourceCard,
			getVaccineCardProgress(sourceCard, 0)
		);
	}
	if (comparisonCard !== null) {
		setVaccineCardScrollPosition(
			comparisonCard,
			getVaccineCardProgress(comparisonCard, 1)
		);
	}
	if (comparisonDetailCard !== null) {
		setVaccineCardScrollPosition(
			comparisonDetailCard,
			getVaccineCardProgress(comparisonDetailCard, 2)
		);
	}
}

function makeEffectivenessQuestionBlock() {
	const block = makeElement("div", "effectiveness-question-block");
	setBox(block, 260, 0, 1400, 1080);

	const title = makeElement("h2", "title section-title effectiveness-question-title", "The <span class=\"blue\">Effectiveness</span> of Vaccination");
	block.appendChild(title);

	const subtitle = makeElement("p", "subtitle effectiveness-question-subtitle", "How many people <span class=\"blue\">developed herpes zoster</span><br>in the placebo group and in the vaccinated group?");
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
	return card;
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
		"<span class=\"grey\">The study suggests that</span> among people who do not receive the vaccine, about <span class=\"red\">33</span> per 1000<span class=\"grey\"> developed herpes zoster.</span>",
		"effectiveness-placebo-card"
	);
	content.appendChild(placeboCard);

	const vaccinatedCard = makeEffectivenessPinnedCard(
		"<span class=\"grey\">It was estimated that</span> about <span class=\"red\">16</span> out of every 1000 people who receive the vaccine<span class=\"grey\"> developed herpes zoster.</span>",
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
	singleOrigin: {
		x: 551,
		y: 298
	},
	compareLeftOrigin: {
		x: 65,
		y: 370
	},
	compareRightOrigin: {
		x: 1025,
		y: 370
	},
	cluster: {
		x: 960,
		y: 535,
		radius: 58
	},
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
		metadataOpacity = progress < 0.780 ?
			smoothStep(0.640, 0.700, progress) :
			1 - smoothStep(0.845, 0.880, progress);
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
		const countProgress = mode === "placebo" ?
			(progress - 0.285) / 0.040 :
			(progress - 0.655) / 0.040;
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
	const effectivenessHandoffDuration = 400;
	const effectivenessHandoffStart = pinStart - effectivenessHandoffDuration;
	const handoffReveal = smoothStep(effectivenessHandoffStart, pinStart, currentDesignY);
	const isPinned = getScenePinnedState(currentDesignY, effectivenessHandoffStart, pinEnd);

	const content = pinLayer.querySelector(".effectiveness-pin-content");
	const questionBlock = pinLayer.querySelector(".effectiveness-question-block");
	const mainChart = pinLayer.querySelector(".effectiveness-main-chart");
	const placeboCard = pinLayer.querySelector(".effectiveness-placebo-card");
	const vaccinatedCard = pinLayer.querySelector(".effectiveness-vaccinated-card");
	const compare = pinLayer.querySelector(".effectiveness-pinned-compare");
	const summaryCard = pinLayer.querySelector(".effectiveness-summary-card");

	const scrollDist = currentDesignY - pinStart;
	const speechScrollDist = readDesignScrollY() - pinStart;
	const CARD_PASS = SPEECH_SCROLL_DISTANCE;
	const F1 = 2600;
	const F2 = 4100;
	let chartScroll;
	if (scrollDist < F1) {
		chartScroll = scrollDist;
	} else if (scrollDist < F1 + CARD_PASS) {
		chartScroll = F1;
	} else if (scrollDist < (F1 + CARD_PASS) + (F2 - F1)) {
		chartScroll = F1 + (scrollDist - (F1 + CARD_PASS));
	} else if (scrollDist < (F1 + CARD_PASS) + (F2 - F1) + CARD_PASS) {
		chartScroll = F2;
	} else {
		chartScroll = F2 + (scrollDist - ((F1 + CARD_PASS) + (F2 - F1) + CARD_PASS));
	}
	const contentProgress = clamp(chartScroll / 5150, 0, 1);
	const vaccCardEnd = (F1 + CARD_PASS) + (F2 - F1) + CARD_PASS;
	const handoffDuration = 400;
	const handoffStart = pinDuration - handoffDuration;
	const layerExitFade = 1 - smoothStep(handoffStart, pinDuration, scrollDist);
	const heldContentProgress = scrollDist >= vaccCardEnd ?
		Math.min(contentProgress, 0.82) :
		contentProgress;

	const sceneLayerOpacity = isPinned ? Math.min(handoffReveal, layerExitFade) : 0;

	pinLayer.classList.toggle("is-active", isPinned);
	pinLayer.style.opacity = sceneLayerOpacity.toFixed(3);

	if (content !== null) {
		const enterY = Math.round(lerp(14, 0, handoffReveal));
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = "1";
		content.style.transform = `translate3d(-50%, ${enterY}px, 0) scale(var(--pin-scale))`;
	}

	if (questionBlock !== null) {
		const questionOpacity = 1 - smoothStep(0.10, 0.18, contentProgress);
		const questionLift = smoothStep(0.10, 0.18, contentProgress);
		questionBlock.style.opacity = questionOpacity.toFixed(3);
		questionBlock.style.transform = `translate3d(0, ${Math.round(lerp(0, -24, questionLift))}px, 0)`;
	}

	setUnifiedEffectivenessChartState(mainChart, heldContentProgress);
	renderEffectivenessCanvas(heldContentProgress);

	if (placeboCard !== null) {
		setVaccineCardScrollPosition(
			placeboCard,
			getReferenceScrollItemProgress(placeboCard, speechScrollDist, F1)
		);
	}

	if (vaccinatedCard !== null) {
		const vaccinatedCardStart = (F1 + CARD_PASS) + (F2 - F1);
		setVaccineCardScrollPosition(
			vaccinatedCard,
			getReferenceScrollItemProgress(vaccinatedCard, speechScrollDist, vaccinatedCardStart)
		);
	}
}

function makeReliabilityCard() {
	const card = makeElement("section", "text-card reliability-card");
	card.appendChild(makeElement("p", "", "A single estimate is useful,<br>but it is not the whole answer."));
	return card;
}

function createReliabilityPinLayer() {
	const existingLayer = document.querySelector(".reliability-pin-layer");

	if (existingLayer !== null) {
		return existingLayer;
	}

	const layer = makeElement("div", "reliability-pin-layer");
	const content = makeElement("div", "reliability-pin-content");

	const title = makeElement("h2", "title question-title reliability-title", "How certain are the numbers<br>reported by this study?");
	setBox(title, 500, 500, 920);
	content.appendChild(title);

	const card = makeReliabilityCard();
	content.appendChild(card);

	layer.appendChild(content);
	document.body.appendChild(layer);
	return layer;
}

function addReliabilityScrollScene(sectionName, absoluteTop) {
	const sceneHeight = 1150;
	const pinOffset = 0;
	const pinDuration = 1150;
	const scene = makeElement("div", "reliability-scrolly");
	scene.dataset.absoluteTop = String(absoluteTop);
	scene.dataset.sceneHeight = String(sceneHeight);
	scene.dataset.pinOffset = String(pinOffset);
	scene.dataset.pinDuration = String(pinDuration);

	appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
	createReliabilityPinLayer();
	return scene;
}

function updateReliabilityScrolly(currentDesignY) {
	const scene = document.querySelector(".reliability-scrolly");
	const pinLayer = document.querySelector(".reliability-pin-layer");

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
	const handoffDuration = 400;
	const handoffStart = pinStart - handoffDuration;
	const progress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
	const handoffReveal = clamp((currentDesignY - handoffStart) / handoffDuration, 0, 1);
	const isPinned = getScenePinnedState(currentDesignY, handoffStart, pinEnd);
	const content = pinLayer.querySelector(".reliability-pin-content");
	const title = pinLayer.querySelector(".reliability-title");
	const card = pinLayer.querySelector(".reliability-card");
	const cardProgress = 0;
	const cardHasLeft = false;
	const layerFade = 1 - smoothStep(0.82, 1.0, progress);
	const layerOpacity = isPinned ? Math.min(handoffReveal, layerFade) : 0;

	pinLayer.classList.toggle("is-active", isPinned);
	pinLayer.style.opacity = layerOpacity.toFixed(3);

	if (content !== null) {
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = "1";
	}

	if (title !== null) {
		const titleFade = 1 - smoothStep(0.90, 1.0, progress);
		title.style.transform = "translate3d(0, 0, 0)";
		title.style.opacity = (cardHasLeft ? titleFade : 1).toFixed(3);
	}

	if (card !== null) {
		card.style.opacity = "0";
		card.style.visibility = "hidden";
		card.style.transform = "translate3d(0, 1080px, 0)";
	}
}

function makeConceptPeopleCluster(count, className) {
	const cluster = makeElement("div", `uncertainty-concept-people ${className || ""}`.trim());
	const maleSvgMarkup = `<svg class="uncertainty-concept-person-svg" viewBox="0 0 25 60" aria-hidden="true" focusable="false"><path d="M12.3835 9.95947C15.1337 9.95947 17.3632 7.72997 17.3632 4.97973C17.3632 2.2295 15.1337 0 12.3835 0C9.63329 0 7.40381 2.2295 7.40381 4.97973C7.40381 7.72997 9.63329 9.95947 12.3835 9.95947Z" fill="currentColor"></path><path d="M18.6738 11.3164H6.22461C2.75193 11.3164 0 14.0684 0 17.5411V32.7424C0 33.9218 0.982835 34.9701 2.22776 34.9701C3.47268 34.9701 4.45551 33.9873 4.45551 32.7424V18.786C4.45551 18.4584 4.7176 18.1963 5.04521 18.1963C5.37282 18.1963 5.63491 18.4584 5.63491 18.786V56.5271C5.63491 58.3618 7.01088 59.9343 8.71446 59.9343C10.418 59.9343 11.794 58.4273 11.794 56.5271V35.0357C11.794 34.7081 12.0561 34.446 12.3837 34.446C12.7113 34.446 12.9734 34.7081 12.9734 35.0357V56.5927C12.9734 58.4273 14.3494 59.9999 16.0529 59.9999C17.7565 59.9999 19.1325 58.4928 19.1325 56.5927V18.786C19.1325 18.4584 19.3946 18.1963 19.7222 18.1963C20.0498 18.1963 20.3119 18.4584 20.3119 18.786V32.8079C20.3119 33.9873 21.2947 35.0357 22.5397 35.0357C23.7846 35.0357 24.7674 34.0528 24.7674 32.8079V17.5411C24.8985 14.0684 22.081 11.3164 18.6738 11.3164Z" fill="currentColor"></path></svg>`;
	for (let i = 0; i < count; i += 1) {
		const person = makeElement("span", "uncertainty-concept-person");
		person.setAttribute("aria-hidden", "true");
		person.innerHTML = maleSvgMarkup;
		cluster.appendChild(person);
	}
	return cluster;
}

function makeUncertaintyConceptCard(html, index) {
	const card = makeElement("section", `text-card uncertainty-concept-card uncertainty-concept-card-${index + 1}`);
	card.dataset.conceptCard = String(index);
	card.appendChild(makeElement("p", "", html));
	setBox(card, 430, 78, 1060, 228);
	return card;
}

function createUncertaintyConceptPinLayer() {
	const existingLayer = document.querySelector(".uncertainty-concept-pin-layer");

	if (existingLayer !== null) {
		return existingLayer;
	}

	const layer = makeElement("div", "uncertainty-concept-pin-layer");
	const content = makeElement("div", "uncertainty-concept-pin-content");
	const visual = makeElement("section", "uncertainty-concept-visual");
	visual.setAttribute("role", "img");
	visual.setAttribute(
		"aria-label",
		"A concise explanation of uncertainty in a clinical study: a sample produces an estimate, another comparable sample could produce a slightly different estimate, a confidence interval displays the uncertainty around the point estimate, interval width shows precision, and the interval is interpreted relative to the placebo result."
	);

	const sourceFlow = makeElement("div", "uncertainty-concept-source-flow");
	const population = makeElement("div", "uncertainty-concept-population");
	population.appendChild(makeConceptPeopleCluster(30, "uncertainty-concept-population-people"));
	population.appendChild(makeElement("span", "uncertainty-concept-flow-label", "Population"));
	sourceFlow.appendChild(population);
	sourceFlow.appendChild(makeElement("span", "uncertainty-concept-arrow", "→"));

	const sample = makeElement("div", "uncertainty-concept-sample");
	sample.appendChild(makeConceptPeopleCluster(8, "uncertainty-concept-sample-people"));
	sample.appendChild(makeElement("span", "uncertainty-concept-flow-label", "Sample"));
	sourceFlow.appendChild(sample);
	sourceFlow.appendChild(makeElement("span", "uncertainty-concept-arrow uncertainty-concept-arrow-last", "→"));

	const flowEstimate = makeElement("div", "uncertainty-concept-flow-estimate");
	flowEstimate.appendChild(makeElement("span", "uncertainty-concept-flow-estimate-dot"));
	flowEstimate.appendChild(makeElement("span", "uncertainty-concept-flow-label", "Estimate"));
	sourceFlow.appendChild(flowEstimate);
	visual.appendChild(sourceFlow);

	const variationStage = makeElement("section", "uncertainty-concept-variation-stage");
	const variationSamples = makeElement("div", "uncertainty-concept-variation-samples");
	[{
			label: "comparable sample A",
			dot: 34
		},
		{
			label: "comparable sample B",
			dot: 50
		},
		{
			label: "comparable sample C",
			dot: 66
		}
	].forEach((item, index) => {
		const column = makeElement("div", `uncertainty-concept-variation-column variation-column-${index + 1}`);
		const sampleBox = makeElement("div", "uncertainty-concept-variation-sample");
		sampleBox.appendChild(makeConceptPeopleCluster(8, `uncertainty-concept-variation-people variation-people-${index + 1}`));
		sampleBox.appendChild(makeElement("span", "uncertainty-concept-variation-sample-label", item.label));
		column.appendChild(sampleBox);
		column.appendChild(makeElement("span", "uncertainty-concept-variation-arrow", "↓"));
		const result = makeElement("div", "uncertainty-concept-variation-result");
		const miniAxis = makeElement("span", "uncertainty-concept-variation-mini-axis");
		const miniDot = makeElement("span", "uncertainty-concept-variation-mini-dot");
		miniDot.style.left = `${item.dot}%`;
		miniAxis.appendChild(miniDot);
		result.appendChild(miniAxis);
		result.appendChild(makeElement("span", "uncertainty-concept-variation-result-label", "slightly different estimate"));
		column.appendChild(result);
		variationSamples.appendChild(column);
	});
	variationStage.appendChild(variationSamples);
	variationStage.appendChild(makeElement(
		"p",
		"uncertainty-concept-variation-note",
		"Fewer participants or fewer observed events usually mean greater uncertainty."
	));
	visual.appendChild(variationStage);

	const axis = makeElement("div", "uncertainty-concept-axis uncertainty-concept-main-interval");
	axis.appendChild(makeElement("span", "uncertainty-concept-axis-line"));

	const tickLayer = makeElement("div", "uncertainty-concept-axis-ticks");
	[10, 20, 30, 40, 50, 60, 70, 80, 90].forEach((position) => {
		const tick = makeElement("span", "uncertainty-concept-axis-tick");
		tick.style.left = `${position}%`;
		tick.setAttribute("aria-hidden", "true");
		tickLayer.appendChild(tick);
	});
	axis.appendChild(tickLayer);

	const band = makeElement("span", "uncertainty-concept-band");
	band.setAttribute("aria-hidden", "true");
	axis.appendChild(band);

	const estimateDot = makeElement("span", "uncertainty-concept-estimate-dot");
	estimateDot.setAttribute("aria-hidden", "true");
	axis.appendChild(estimateDot);
	axis.appendChild(makeElement("span", "uncertainty-concept-estimate-label", "Study estimate"));
	axis.appendChild(makeElement("span", "uncertainty-concept-range-label", "95% confidence interval"));
	const intervalNoteStack = makeElement("div", "uncertainty-concept-interval-note-stack");
	intervalNoteStack.appendChild(makeElement(
		"p",
		"uncertainty-concept-confidence-note",
		"The 95% describes how the interval-making method performs across many similar repeated studies."
	));
	intervalNoteStack.appendChild(makeElement(
		"p",
		"uncertainty-concept-sampling-note",
		"The interval mainly reflects uncertainty from sampling, not every possible source of bias."
	));
	axis.appendChild(intervalNoteStack);
	visual.appendChild(axis);

	const precisionStage = makeElement("section", "uncertainty-concept-precision-comparison-stage");
	const makePrecisionPanel = (kind, title, subtitle, left, width) => {
		const panel = makeElement("div", `uncertainty-concept-precision-panel is-${kind}`);
		panel.appendChild(makeElement("h3", "uncertainty-concept-precision-title", title));
		const miniAxis = makeElement("div", "uncertainty-concept-precision-axis");
		miniAxis.appendChild(makeElement("span", "uncertainty-concept-precision-axis-line"));
		const miniBand = makeElement("span", "uncertainty-concept-precision-band");
		miniBand.style.left = `${left}%`;
		miniBand.style.width = `${width}%`;
		miniAxis.appendChild(miniBand);
		miniAxis.appendChild(makeElement("span", "uncertainty-concept-precision-dot"));
		panel.appendChild(miniAxis);
		panel.appendChild(makeElement("p", "uncertainty-concept-precision-subtitle", subtitle));
		return panel;
	};
	precisionStage.appendChild(makePrecisionPanel("narrow", "Narrower range", "more certain estimate", 36, 28));
	precisionStage.appendChild(makePrecisionPanel("wide", "Wider range", "less certain estimate", 18, 64));
	visual.appendChild(precisionStage);

	const interpretationStage = makeElement("section", "uncertainty-concept-interpretation-stage");
	const interpretationChart = makeElement("div", "uncertainty-concept-group-compare-chart");
	const makeGroupCompareRow = (rowClass, labelText) => {
		const row = makeElement("div", `uncertainty-concept-group-compare-row ${rowClass}`);
		row.appendChild(makeElement("span", "uncertainty-concept-group-compare-label", labelText));
		const track = makeElement("span", "uncertainty-concept-group-compare-track");
		track.appendChild(makeElement("span", "uncertainty-concept-group-compare-axis"));
		track.appendChild(makeElement("span", "uncertainty-concept-group-compare-band"));
		track.appendChild(makeElement("span", "uncertainty-concept-group-compare-dot"));
		row.appendChild(track);
		return row;
	};
	interpretationChart.appendChild(makeGroupCompareRow("is-a", "Group A"));
	interpretationChart.appendChild(makeGroupCompareRow("is-b", "Group B"));
	interpretationStage.appendChild(interpretationChart);
	visual.appendChild(interpretationStage);

	content.appendChild(visual);

	const cardCopy = [
		"A study observes a sample of people<span class=\"grey\"> which is chosen to represent the whole population in research. A sample mean is calcluated from it, and</span> used as an estimate for the entire population's actual average.",
		"<span class=\"grey\">Different but comparable samples could produce slightly different estimates. This</span> sample-to-sample variation is one source of uncertainty.",
		"<span class=\"grey\">The red dot is the study’s estimate. The grey line shows</span> a range of plausible values that contain the true population mean, which indicates a <span class=\"blue\">confidence interval</span>.",
		"The range makes uncertainty visible. A narrower range indicates that an estimate is more certain<span class=\"grey\">, and a wider range can be interpreted as one that is less certain.</span>",
		"<span class=\"grey\">And when</span> comparing the study's result between different groups with uncertain ranges and estimates, <span class=\"grey\">you can interpret it as follows:</span>",
		"<span class=\"grey\">For example, if Group A’s range lies entirely below Group B’s one, and </span>the uncertainty ranges do not overlap, <span class=\"grey\">this indicates fewer cases in Group A and</span> a considerable difference between the groups.",
		"<span class=\"grey\">However, if</span> the ranges overlap, <span class=\"grey\">both groups may be compatible with some of the same values, </span>making the difference between them less clear.",
		"So, what uncertainty ranges<br>did this study report?"
	];
	cardCopy.forEach((html, index) => content.appendChild(makeUncertaintyConceptCard(html, index)));

	layer.appendChild(content);
	document.body.appendChild(layer);
	return layer;
}

function addUncertaintyConceptScrollScene(sectionName, absoluteTop) {
	const sceneHeight = 8200;
	const pinOffset = 0;
	const pinDuration = 8200;
	const scene = makeElement("div", "uncertainty-concept-scrolly");
	scene.dataset.absoluteTop = String(absoluteTop);
	scene.dataset.sceneHeight = String(sceneHeight);
	scene.dataset.pinOffset = String(pinOffset);
	scene.dataset.pinDuration = String(pinDuration);

	appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
	createUncertaintyConceptPinLayer();
	return scene;
}

function updateUncertaintyConceptScrolly(currentDesignY) {
	const scene = document.querySelector(".uncertainty-concept-scrolly");
	const pinLayer = document.querySelector(".uncertainty-concept-pin-layer");

	if (scene === null || pinLayer === null) {
		return;
	}

	const sceneTop = parseFloat(scene.dataset.absoluteTop || "0");
	const pinOffset = parseFloat(scene.dataset.pinOffset || "0");
	const pinDuration = parseFloat(scene.dataset.pinDuration || "1");
	currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;

	const pinStart = sceneTop - pinOffset;
	const pinEnd = pinStart + pinDuration;
	const progress = clamp((currentDesignY - pinStart) / pinDuration, 0, 1);
	const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);
	const content = pinLayer.querySelector(".uncertainty-concept-pin-content");
	const visual = pinLayer.querySelector(".uncertainty-concept-visual");
	const sourceFlow = pinLayer.querySelector(".uncertainty-concept-source-flow");
	const sourcePopulation = pinLayer.querySelector(".uncertainty-concept-population");
	const sourceSample = pinLayer.querySelector(".uncertainty-concept-sample");
	const sourceEstimate = pinLayer.querySelector(".uncertainty-concept-flow-estimate");
	const sourceArrows = pinLayer.querySelectorAll(".uncertainty-concept-arrow");
	const variationStage = pinLayer.querySelector(".uncertainty-concept-variation-stage");
	const variationColumns = pinLayer.querySelectorAll(".uncertainty-concept-variation-column");
	const axis = pinLayer.querySelector(".uncertainty-concept-main-interval");
	const band = pinLayer.querySelector(".uncertainty-concept-band");
	const estimateDot = pinLayer.querySelector(".uncertainty-concept-estimate-dot");
	const estimateLabel = pinLayer.querySelector(".uncertainty-concept-estimate-label");
	const rangeLabel = pinLayer.querySelector(".uncertainty-concept-range-label");
	const confidenceNote = pinLayer.querySelector(".uncertainty-concept-confidence-note");
	const samplingNote = pinLayer.querySelector(".uncertainty-concept-sampling-note");
	const precisionStage = pinLayer.querySelector(".uncertainty-concept-precision-comparison-stage");
	const precisionPanels = pinLayer.querySelectorAll(".uncertainty-concept-precision-panel");
	const interpretationStage = pinLayer.querySelector(".uncertainty-concept-interpretation-stage");
	const groupARow = pinLayer.querySelector(".uncertainty-concept-group-compare-row.is-a");
	const groupABand = pinLayer.querySelector(".uncertainty-concept-group-compare-row.is-a .uncertainty-concept-group-compare-band");
	const groupADot = pinLayer.querySelector(".uncertainty-concept-group-compare-row.is-a .uncertainty-concept-group-compare-dot");
	const groupBRow = pinLayer.querySelector(".uncertainty-concept-group-compare-row.is-b");
	const groupBBand = pinLayer.querySelector(".uncertainty-concept-group-compare-row.is-b .uncertainty-concept-group-compare-band");
	const groupBDot = pinLayer.querySelector(".uncertainty-concept-group-compare-row.is-b .uncertainty-concept-group-compare-dot");

	const windowOpacity = (inStart, inEnd, outStart, outEnd) => (
		smoothStep(inStart, inEnd, progress) * (1 - smoothStep(outStart, outEnd, progress))
	);
	const conceptGraphicScale = isMobileLayout() ? 1.32 : 1;

	const layerFadeIn = smoothStep(0.00, 0.025, progress);
	const layerFadeOut = 1 - smoothStep(0.965, 0.995, progress);
	const layerOpacity = isPinned ? Math.min(layerFadeIn, layerFadeOut) : 0;

	pinLayer.classList.toggle("is-active", isPinned);
	pinLayer.style.opacity = layerOpacity.toFixed(3);

	if (content !== null) {
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = "1";
	}

	if (visual !== null) {
		const endDim = 1 - (0.78 * smoothStep(0.885, 0.930, progress));
		visual.style.opacity = endDim.toFixed(3);
	}

	if (sourceFlow !== null) {
		const opacity = windowOpacity(0.015, 0.040, 0.155, 0.180);
		sourceFlow.style.opacity = opacity.toFixed(3);
		sourceFlow.style.transform = `translate3d(0, ${lerp(24, 0, smoothStep(0.015, 0.060, progress)).toFixed(1)}px, 0) scale(${conceptGraphicScale})`;
	}

	const revealFlowPart = (element, start, end) => {
		if (!element) return;
		const reveal = smoothStep(start, end, progress);
		const fade = 1 - smoothStep(0.155, 0.180, progress);
		element.style.opacity = (reveal * fade).toFixed(3);
		element.style.transform = `translate3d(${lerp(-16, 0, reveal).toFixed(1)}px, 0, 0) scale(${lerp(0.97, 1, reveal).toFixed(3)})`;
	};
	revealFlowPart(sourcePopulation, 0.020, 0.050);
	revealFlowPart(sourceArrows[0], 0.055, 0.080);
	revealFlowPart(sourceSample, 0.075, 0.105);
	revealFlowPart(sourceArrows[1], 0.105, 0.130);
	revealFlowPart(sourceEstimate, 0.125, 0.155);

	if (variationStage !== null) {
		const opacity = windowOpacity(0.165, 0.190, 0.305, 0.330);
		variationStage.style.opacity = opacity.toFixed(3);
		variationStage.style.transform = `translate3d(0, ${lerp(22, 0, smoothStep(0.165, 0.215, progress)).toFixed(1)}px, 0) scale(${conceptGraphicScale})`;
	}
	variationColumns.forEach((column, index) => {
		const start = 0.175 + (index * 0.020);
		const reveal = smoothStep(start, start + 0.035, progress) * (1 - smoothStep(0.305, 0.330, progress));
		column.style.opacity = reveal.toFixed(3);
		column.style.transform = `translate3d(0, ${lerp(18, 0, reveal).toFixed(1)}px, 0) scale(${lerp(0.97, 1, reveal).toFixed(3)})`;
	});

	const axisOpacity = windowOpacity(0.315, 0.345, 0.490, 0.520);
	if (axis !== null) {
		axis.style.opacity = axisOpacity.toFixed(3);
		axis.style.transform = `translate3d(0, ${lerp(18, 0, smoothStep(0.315, 0.370, progress)).toFixed(1)}px, 0) scale(${conceptGraphicScale})`;
	}
	if (estimateDot !== null) {
		estimateDot.style.left = "50%";
		estimateDot.style.opacity = axisOpacity.toFixed(3);
	}
	if (estimateLabel !== null) {
		estimateLabel.style.left = "50%";
		estimateLabel.style.opacity = axisOpacity.toFixed(3);
	}
	if (rangeLabel !== null) {
		rangeLabel.style.opacity = axisOpacity.toFixed(3);
	}
	if (band !== null) {
		const reveal = smoothStep(0.345, 0.385, progress) * (1 - smoothStep(0.490, 0.520, progress));
		band.style.left = "35%";
		band.style.width = "30%";
		band.style.opacity = reveal.toFixed(3);
		band.style.transform = `scaleX(${Math.max(0.001, reveal).toFixed(3)})`;
	}
	if (confidenceNote !== null) {
		confidenceNote.style.opacity = windowOpacity(0.385, 0.405, 0.475, 0.500).toFixed(3);
	}
	if (samplingNote !== null) {
		samplingNote.style.opacity = windowOpacity(0.415, 0.435, 0.475, 0.500).toFixed(3);
	}

	if (precisionStage !== null) {
		const opacity = windowOpacity(0.505, 0.535, 0.650, 0.680);
		precisionStage.style.opacity = opacity.toFixed(3);
		precisionStage.style.transform = `translate3d(0, ${lerp(22, 0, smoothStep(0.505, 0.555, progress)).toFixed(1)}px, 0) scale(${conceptGraphicScale})`;
	}
	precisionPanels.forEach((panel, index) => {
		const start = 0.515 + (index * 0.035);
		const reveal = smoothStep(start, start + 0.040, progress) * (1 - smoothStep(0.650, 0.680, progress));
		panel.style.opacity = reveal.toFixed(3);
		panel.style.transform = `translate3d(0, ${lerp(18, 0, reveal).toFixed(1)}px, 0)`;
	});

	if (interpretationStage !== null) {
		const opacity = windowOpacity(0.670, 0.700, 0.900, 0.930);
		interpretationStage.style.opacity = opacity.toFixed(3);
		interpretationStage.style.transform = `translate3d(0, ${lerp(26, 0, smoothStep(0.670, 0.720, progress)).toFixed(1)}px, 0) scale(${conceptGraphicScale})`;
	}

	const morph = smoothStep(0.805, 0.845, progress);
	const chartReveal = smoothStep(0.690, 0.735, progress) * (1 - smoothStep(0.900, 0.930, progress));
	const setGroupRowState = (rowElement, bandElement, dotElement, fromState, toState, index) => {
		const rowReveal = chartReveal * smoothStep(0.695 + (index * 0.018), 0.730 + (index * 0.018), progress);
		if (rowElement !== null) {
			rowElement.style.opacity = rowReveal.toFixed(3);
			rowElement.style.transform = `translate3d(0, ${lerp(18, 0, rowReveal).toFixed(1)}px, 0)`;
		}
		if (bandElement !== null) {
			const left = lerp(fromState.left, toState.left, morph);
			const width = lerp(fromState.width, toState.width, morph);
			bandElement.style.left = `${left}%`;
			bandElement.style.width = `${width}%`;
			bandElement.style.opacity = rowReveal.toFixed(3);
			bandElement.style.transform = `scaleX(${Math.max(0.001, rowReveal).toFixed(3)})`;
		}
		if (dotElement !== null) {
			dotElement.style.left = `${lerp(fromState.dot, toState.dot, morph)}%`;
			dotElement.style.opacity = rowReveal.toFixed(3);
			dotElement.style.transform = `translateX(-50%) scale(${lerp(0.82, 1, rowReveal).toFixed(3)})`;
		}
	};
	setGroupRowState(
		groupARow,
		groupABand,
		groupADot, {
			left: 8,
			width: 39,
			dot: 27
		}, {
			left: 49,
			width: 44,
			dot: 72
		},
		0
	);
	setGroupRowState(
		groupBRow,
		groupBBand,
		groupBDot, {
			left: 60,
			width: 35,
			dot: 78
		}, {
			left: 54,
			width: 42,
			dot: 77
		},
		1
	);

	const cardWindows = [
		[0.015, 0.035, 0.135, 0.160],
		[0.165, 0.185, 0.290, 0.315],
		[0.320, 0.340, 0.440, 0.465],
		[0.500, 0.520, 0.625, 0.650],
		[0.655, 0.675, 0.710, 0.730],
		[0.710, 0.730, 0.790, 0.810],
		[0.810, 0.830, 0.895, 0.915],
		[0.900, 0.920, 0.965, 0.985]
	];

	pinLayer.querySelectorAll(".uncertainty-concept-card").forEach((card, index) => {
		const timing = cardWindows[index];
		if (!timing) return;
		const opacity = windowOpacity(timing[0], timing[1], timing[2], timing[3]);
		const travel = smoothStep(timing[0], timing[3], progress);
		card.style.opacity = opacity.toFixed(3);
		card.style.visibility = opacity > 0.01 ? "visible" : "hidden";
		const translateY = index === 7 ? 0 : lerp(24, -14, travel);
		card.style.transform = `translate3d(0, ${translateY.toFixed(1)}px, 0)`;
	});
}

function makeEffectivenessRangePinnedChart(config) {
	const title = config && config.title ?
		config.title :
		'The Uncertainty Range of Herpes Zoster Cases in the <span class="blue">Placebo</span> Group';
	const count = config && config.count !== undefined ? config.count : 33;
	const rangeStart = config && config.rangeStart !== undefined ? config.rangeStart : 30;
	const rangeEnd = config && config.rangeEnd !== undefined ? config.rangeEnd : 36;
	const meanValue = config && config.mean !== undefined ? config.mean : 33;
	const colour = config && config.colour ? config.colour : 'red';
	const extraClass = config && config.extraClass ? ` ${config.extraClass}` : '';

	const chart = makeElement('section', `chart-section likely-range-pinned-chart${extraClass}`);

	const heading = makeElement('h3', '', title);
	chart.appendChild(heading);

	const plot = makeDotPlot(count, colour, rangeStart, rangeEnd);
	plot.classList.add('pin-managed-plot');
	chart.appendChild(plot);

	const mean = makeElement('p', 'mean', `<span class="${colour}">0~0</span> cases<br>(Mean: <span class="${colour}">0</span> cases)`);
	mean.dataset.rangeCountUp = 'true';
	mean.dataset.rangeStart = String(rangeStart);
	mean.dataset.rangeEnd = String(rangeEnd);
	mean.dataset.countUp = String(meanValue);
	mean.dataset.colour = colour;
	chart.appendChild(mean);

	const legend = makeLegend(colour, 'Case of herpes zoster', true);
	chart.appendChild(legend);

	return chart;
}

function resetEffectivenessRangePinnedChart(chart) {
	if (chart === null) {
		return;
	}

	const plot = chart.querySelector('.dot-plot');
	const mean = chart.querySelector('.mean[data-range-count-up]');

	if (plot !== null) {
		plot.classList.remove('plot-animated', 'dot-morphing');
		delete plot.dataset.animated;
		resetDotMorph(plot);
	}

	if (mean !== null) {
		delete mean.dataset.counted;
		mean.innerHTML = '<span class="red">0~0</span> cases<br>(Mean: <span class="red">0</span> cases)';
	}
}

function makeEffectivenessRangePinnedCard(html, extraClass) {
	const className = extraClass ? `text-card effectiveness-range-pinned-card ${extraClass}` : 'text-card effectiveness-range-pinned-card';
	const card = makeElement('section', className);
	card.appendChild(makeElement('p', '', html));
	return card;
}

function makeEffectivenessRangePinnedCompare() {
	const compare = makeElement('section', 'compare-section effectiveness-range-pinned-compare');

	const title = makeElement('h2', 'title compare-title', 'The Effectiveness of Vaccination');
	setBox(title, 425, 0, 1070);
	compare.appendChild(title);

	const leftLabel = makeElement('p', 'compare-label', '<span class="blue">Placebo group</span>');
	setBox(leftLabel, 180, 150, 600);
	compare.appendChild(leftLabel);

	const rightLabel = makeElement('p', 'compare-label', '<span class="blue">Vaccinated group</span>');
	setBox(rightLabel, 1140, 150, 600);
	compare.appendChild(rightLabel);

	const vs = makeElement('div', 'vs red-vs', 'VS');
	setBox(vs, 906, 105, 108, 108);
	compare.appendChild(vs);

	const leftPlot = makeElement('div', 'side-plot effectiveness-range-compare-left');
	setBox(leftPlot, 65, 245, 830, 520);
	const leftDots = makeDotPlot(33, 'red', 30, 36);
	leftDots.classList.add('pin-managed-plot');
	leftPlot.appendChild(leftDots);
	const leftMean = makeElement('p', 'mean', '<span class="red">0~0</span> cases<br>(Mean: <span class="red">0</span> cases)');
	leftMean.dataset.rangeCountUp = 'true';
	leftMean.dataset.rangeStart = '30';
	leftMean.dataset.rangeEnd = '36';
	leftMean.dataset.countUp = '33';
	leftMean.dataset.colour = 'red';
	leftPlot.appendChild(leftMean);
	compare.appendChild(leftPlot);

	const arrow = document.createElement('img');
	arrow.className = 'arrow-icon';
	arrow.alt = 'A down arrow showing reduction after vaccination';
	arrow.src = './assets/arrow1.png';
	setBox(arrow, 886, 352, 148, 148);
	compare.appendChild(arrow);

	const rightPlot = makeElement('div', 'side-plot effectiveness-range-compare-right');
	setBox(rightPlot, 1025, 245, 830, 520);
	const rightDots = makeDotPlot(16, 'red', 14, 19);
	rightDots.classList.add('pin-managed-plot');
	rightPlot.appendChild(rightDots);
	const rightMean = makeElement('p', 'mean', '<span class="red">0~0</span> cases<br>(Mean: <span class="red">0</span> cases)');
	rightMean.dataset.rangeCountUp = 'true';
	rightMean.dataset.rangeStart = '14';
	rightMean.dataset.rangeEnd = '19';
	rightMean.dataset.countUp = '16';
	rightMean.dataset.colour = 'red';
	rightPlot.appendChild(rightMean);
	compare.appendChild(rightPlot);

	const legend = makeLegend('red', 'Case of herpes zoster', true);
	compare.appendChild(legend);

	return compare;
}

function createEffectivenessRangePinLayer() {
	const existingLayer = document.querySelector('.effectiveness-range-pin-layer');

	if (existingLayer !== null) {
		return existingLayer;
	}

	const layer = makeElement('div', 'effectiveness-range-pin-layer');
	const content = makeElement('div', 'effectiveness-range-pin-content');

	const placeboChart = makeEffectivenessRangePinnedChart({
		title: 'The Uncertainty Range of Herpes Zoster Cases in the <span class="blue">Placebo</span> Group',
		count: 33,
		rangeStart: 30,
		rangeEnd: 36,
		mean: 33,
		colour: 'red',
		extraClass: 'likely-range-pinned-chart--placebo'
	});
	setBox(placeboChart, 410, 160, 1100, 760);
	content.appendChild(placeboChart);

	const vaccinatedChart = makeEffectivenessRangePinnedChart({
		title: 'The Uncertainty Range of Herpes Zoster Cases in the <span class="blue">Vaccinated</span> Group',
		count: 16,
		rangeStart: 14,
		rangeEnd: 19,
		mean: 16,
		colour: 'red',
		extraClass: 'likely-range-pinned-chart--vaccinated'
	});
	setBox(vaccinatedChart, 410, 160, 1100, 760);
	content.appendChild(vaccinatedChart);

	const placeboCard = makeEffectivenessRangePinnedCard(
		'<span class=\"grey\">The number of people who get herpes zoster in the placebo group is likely</span> between <span class="red">30</span> and <span class="red">36</span> people in every 1,000 people.',
		'effectiveness-range-pinned-card--placebo'
	);
	setBox(placeboCard, 464, 0, 993, 301);
	content.appendChild(placeboCard);

	const vaccinatedCard = makeEffectivenessRangePinnedCard(
		'<span class=\"grey\">The number of people who get herpes zoster in the vaccinated group is likely</span> between <span class="red">14</span> and <span class="red">19</span> people in every 1,000 people.',
		'effectiveness-range-pinned-card--vaccinated'
	);
	setBox(vaccinatedCard, 464, 0, 993, 301);
	content.appendChild(vaccinatedCard);

	const compare = makeEffectivenessRangePinnedCompare();
	setBox(compare, 0, 112, 1920, 850);
	content.appendChild(compare);

	const compareLowerCard = makeEffectivenessRangePinnedCard(
		'So for every 1,000 people, vaccination reduced an average of <span class="red">17</span> herpes zoster cases <span class=\"grey\">compared to the placebo group.</span>',
		'effectiveness-range-pinned-card--compare-lower'
	);
	setBox(compareLowerCard, 464, 0, 993, 301);
	content.appendChild(compareLowerCard);

	const compareMeanDifferenceCard = makeEffectivenessRangePinnedCard(
		'The most likely range is lower in the vaccinated group at <span class="red">14</span> to <span class="red">19</span> cases per 1000 people, <span class=\"grey\">compared with 30 to 36 in the placebo group.</span>',
		'effectiveness-range-pinned-card--mean-difference'
	);
	setBox(compareMeanDifferenceCard, 464, 0, 993, 301);
	content.appendChild(compareMeanDifferenceCard);

	const compareOverallCard = makeEffectivenessRangePinnedCard(
		'<span class=\"grey\">This indicates</span> the herpes zoster vaccine appears to prevent the risk of developing it.',
		'effectiveness-range-pinned-card--compare-overall'
	);
	setBox(compareOverallCard, 464, 0, 993, 301);
	content.appendChild(compareOverallCard);

	const safetyIntro = makeElement('div', 'effectiveness-range-safety-intro');
	const safetyIntroTitle = makeElement('h2', 'title section-title', 'The <span class="blue">Safety</span> of Vaccination');
	const safetyIntroSub = makeElement('p', 'subtitle', 'How many people experienced a <span class="blue">serious adverse event</span><br>in the placebo group and in the vaccinated group?');
	safetyIntro.appendChild(safetyIntroTitle);
	safetyIntro.appendChild(safetyIntroSub);
	setBox(safetyIntro, 260, 0, 1400, 1080);
	content.appendChild(safetyIntro);

	const safetyInfoCard = makeEffectivenessRangePinnedCard('Serious adverse events refer to severe outcomes such as death, life-threatening conditions, <span class="grey">hospitalisation, disability or permanent damage, congenital anomalies/birth defects, required intervention to prevent permanent impairment or damage, </span>or other important medical events.', 'effectiveness-range-safety-info-card');
	setBox(safetyInfoCard, 464, 0, 993, 301);
	content.appendChild(safetyInfoCard);

	layer.appendChild(content);
	document.body.appendChild(layer);
	return layer;
}

function addEffectivenessRangeScrollScene(sectionName, absoluteTop) {
	const sceneHeight = 11950;
	const pinOffset = 0;
	const pinDuration = 11950;
	const scene = makeElement('div', 'effectiveness-range-scrolly');
	scene.dataset.absoluteTop = String(absoluteTop);
	scene.dataset.sceneHeight = String(sceneHeight);
	scene.dataset.pinOffset = String(pinOffset);
	scene.dataset.pinDuration = String(pinDuration);

	appendElement(sectionName, scene, 0, absoluteTop, 1920, sceneHeight);
	createEffectivenessRangePinLayer();
	return scene;
}

function updateEffectivenessRangeScrolly(currentDesignY) {
	const scene = document.querySelector('.effectiveness-range-scrolly');
	const pinLayer = document.querySelector('.effectiveness-range-pin-layer');

	if (scene === null || pinLayer === null) {
		return;
	}

	const sceneTop = parseFloat(scene.dataset.absoluteTop || '0');
	const pinOffset = parseFloat(scene.dataset.pinOffset || '0');
	const pinDuration = parseFloat(scene.dataset.pinDuration || '1');
	currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
	const progressDesignY = currentDesignY;

	const pinStart = sceneTop - pinOffset;
	const pinEnd = pinStart + pinDuration;
	const preRevealStart = pinStart - 320;
	const preRevealEnd = pinStart - 80;
	const buildDuration = 5000;
	const scrollDist = progressDesignY - pinStart;
	const speechScrollDist = readDesignScrollY() - pinStart;
	const overallProgress = clamp(scrollDist / pinDuration, 0, 1);
	const progress = clamp(scrollDist / buildDuration, 0, 1);
	const outroDuration = Math.max(1, pinDuration - buildDuration);
	const outroProgress = clamp((scrollDist - buildDuration) / outroDuration, 0, 1);
	const isPinned = getScenePinnedState(currentDesignY, preRevealStart, pinEnd);

	const content = pinLayer.querySelector('.effectiveness-range-pin-content');
	const placeboChart = pinLayer.querySelector('.likely-range-pinned-chart--placebo');
	const vaccinatedChart = pinLayer.querySelector('.likely-range-pinned-chart--vaccinated');
	const placeboCard = pinLayer.querySelector('.effectiveness-range-pinned-card--placebo');
	const vaccinatedCard = pinLayer.querySelector('.effectiveness-range-pinned-card--vaccinated');
	const compareLowerCard = pinLayer.querySelector('.effectiveness-range-pinned-card--compare-lower');
	const compareMeanDifferenceCard = pinLayer.querySelector('.effectiveness-range-pinned-card--mean-difference');
	const compareOverallCard = pinLayer.querySelector('.effectiveness-range-pinned-card--compare-overall');
	const rangeCompare = pinLayer.querySelector('.effectiveness-range-pinned-compare');
	const safetyInfoCard = pinLayer.querySelector('.effectiveness-range-safety-info-card');
	const safetyFirstChart = document.querySelector('#section-safety .safety-first-chart');

	const preRevealOpacity = smoothStep(preRevealStart, preRevealEnd, progressDesignY);
	const layerFadeIn = scrollDist < 0 ? preRevealOpacity : Math.max(preRevealOpacity, smoothStep(0.00, 0.02, overallProgress));
	const layerOpacity = isPinned ? layerFadeIn : 0;

	pinLayer.classList.toggle('is-active', isPinned);
	pinLayer.style.opacity = layerOpacity.toFixed(3);

	if (content !== null) {
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = layerOpacity.toFixed(3);
	}

	if (!isPinned && progress <= 0.02) {
		resetEffectivenessRangePinnedChart(placeboChart);
		resetEffectivenessRangePinnedChart(vaccinatedChart);
	}

	const setPinnedRangeChartState = (chart, options) => {
		if (chart === null) {
			return;
		}

		const regularReveal = smoothStep(options.revealStart, options.revealEnd, progress);
		const handoffReveal = Number.isFinite(options.handoffStart) && Number.isFinite(options.handoffEnd) ?
			smoothStep(options.handoffStart, options.handoffEnd, progressDesignY) :
			0;
		const chartReveal = Math.max(regularReveal, handoffReveal);
		const chartHold = 1 - smoothStep(options.fadeStart, options.fadeEnd, progress);
		const chartOpacity = Math.min(chartReveal, chartHold) * (options.parentFadeOnly ? 1 : layerOpacity);
		chart.style.opacity = chartOpacity.toFixed(3);
		chart.style.visibility = chartOpacity > 0.02 ? 'visible' : 'hidden';
		chart.style.transform = `translate3d(0, 0, 0) scale(${getMobileBackgroundScale().toFixed(4)})`;

		const getStageProgress = (designStart, designEnd, fallbackStart, fallbackEnd) => {
			if (Number.isFinite(designStart) && Number.isFinite(designEnd)) {
				const start = pinStart + designStart;
				const end = pinStart + designEnd;
				return clamp((progressDesignY - start) / Math.max(1, end - start), 0, 1);
			}
			return clamp((progress - fallbackStart) / Math.max(0.0001, fallbackEnd - fallbackStart), 0, 1);
		};

		const plot = chart.querySelector('.dot-plot');
		const dotProgress = getStageProgress(
			options.dotDesignStart,
			options.dotDesignEnd,
			options.dotStart,
			options.dotEnd
		);
		if (plot !== null) {
			if (chartOpacity > 0.01 && (dotProgress > 0.001 || options.precluster)) {
				applyDotMorph(plot, dotProgress, {
					clusterX: 415,
					clusterY: 258,
					radius: 50,
					startScale: 0.30,
					curve: 24
				});
				plot.style.opacity = chartOpacity.toFixed(3);
			} else {
				resetDotMorph(plot);
				plot.style.opacity = chartOpacity > 0.01 ? '0' : chartOpacity.toFixed(3);
			}
		}

		const rangeReveal = smoothStep(0, 1, getStageProgress(
			options.rangeDesignStart,
			options.rangeDesignEnd,
			options.rangeVisualStart,
			options.rangeVisualEnd
		));
		chart.querySelectorAll('.range-background').forEach((element) => {
			element.style.opacity = (chartOpacity * rangeReveal).toFixed(3);
			element.style.transform = `scaleX(${rangeReveal.toFixed(3)})`;
		});
		chart.querySelectorAll('.range-mean-highlight').forEach((element) => {
			element.style.opacity = (chartOpacity * rangeReveal).toFixed(3);
			element.style.transform = `scaleY(${(0.7 + (rangeReveal * 0.3)).toFixed(3)})`;
		});

		const meanElement = chart.querySelector('.mean[data-range-count-up]');
		if (meanElement !== null) {
			const countProgress = getStageProgress(
				options.countDesignStart,
				options.countDesignEnd,
				options.countStart,
				options.countEnd
			);
			setScrollTiedRangeCount(
				meanElement,
				options.rangeStart,
				options.rangeEnd,
				options.meanValue,
				options.colour,
				countProgress
			);
			const meanReveal = smoothStep(0.02, 0.22, countProgress);
			const meanOpacity = chartOpacity * meanReveal;
			meanElement.style.opacity = meanOpacity.toFixed(3);
			meanElement.style.transform = 'translate3d(0, 0, 0)';
		}

		chart.querySelectorAll('h3, .legend').forEach((element) => {
			element.style.opacity = chartOpacity.toFixed(3);
			element.style.transform = chartOpacity > 0.01 ? 'translate3d(0, 0, 0)' : 'translate3d(0, 10px, 0)';
		});
	};

	const setPinnedCompareState = (compare, options) => {
		if (compare === null) {
			return;
		}

		const reveal = smoothStep(options.revealStart, options.revealEnd, progress);
		const fadeOut = 1 - smoothStep(options.fadeStart, options.fadeEnd, progress);
		const compareOpacity = reveal * fadeOut * layerOpacity;
		compare.style.opacity = compareOpacity.toFixed(3);
		compare.style.visibility = compareOpacity > 0.02 ? 'visible' : 'hidden';
		compare.style.transform = `translate3d(0, 0, 0) scale(${getMobileBackgroundScale().toFixed(4)})`;

		const dotProgress = clamp((progress - options.dotStart) / (options.dotEnd - options.dotStart), 0, 1);
		compare.querySelectorAll('.dot-plot').forEach((plot, plotIndex) => {
			if (dotProgress > 0.001 && compareOpacity > 0.01) {
				applyDotMorph(plot, dotProgress, {
					clusterX: 415,
					clusterY: 258,
					radius: 50,
					startScale: 0.30,
					curve: 24
				});
				plot.style.opacity = compareOpacity.toFixed(3);
			} else {
				resetDotMorph(plot);
				plot.style.opacity = compareOpacity.toFixed(3);
			}
		});

		const rangeReveal = smoothStep(options.rangeVisualStart, options.rangeVisualEnd, progress);
		compare.querySelectorAll('.range-background').forEach((element) => {
			element.style.opacity = (compareOpacity * rangeReveal).toFixed(3);
			element.style.transform = `scaleX(${rangeReveal.toFixed(3)})`;
		});
		compare.querySelectorAll('.range-mean-highlight').forEach((element) => {
			element.style.opacity = (compareOpacity * rangeReveal).toFixed(3);
			element.style.transform = `scaleY(${(0.7 + (rangeReveal * 0.3)).toFixed(3)})`;
		});

		const countProgress = (progress - options.countStart) / (options.countEnd - options.countStart);
		const leftMean = compare.querySelector('.effectiveness-range-compare-left .mean[data-range-count-up]');
		const rightMean = compare.querySelector('.effectiveness-range-compare-right .mean[data-range-count-up]');
		setScrollTiedRangeCount(leftMean, 30, 36, 33, 'red', countProgress);
		setScrollTiedRangeCount(rightMean, 14, 19, 16, 'red', countProgress);

		compare.querySelectorAll('h2, .compare-label, .vs, .legend, .mean').forEach((element) => {
			const labelReveal = smoothStep(options.revealStart, options.revealEnd, progress);
			element.style.opacity = (compareOpacity * labelReveal).toFixed(3);
			element.style.transform = labelReveal > 0.01 ? 'translate3d(0, 0, 0)' : 'translate3d(0, 10px, 0)';
		});

		const arrow = compare.querySelector('.arrow-icon');
		if (arrow !== null) {
			const arrowReveal = smoothStep(options.arrowStart, options.arrowEnd, progress);
			arrow.style.opacity = (compareOpacity * arrowReveal).toFixed(3);
			arrow.style.transform = `translate3d(0, ${Math.round(lerp(14, 0, arrowReveal))}px, 0)`;
		}
	};

	setPinnedRangeChartState(placeboChart, {
		handoffStart: pinStart - 320,
		handoffEnd: pinStart - 80,
		parentFadeOnly: true,
		precluster: true,
		revealStart: 0.09,
		revealEnd: 0.17,
		dotStart: 0.16,
		dotEnd: 0.30,
		dotDesignStart: -200,
		dotDesignEnd: 520,
		rangeVisualStart: 0.31,
		rangeVisualEnd: 0.38,
		rangeDesignStart: 320,
		rangeDesignEnd: 820,
		countStart: 0.22,
		countEnd: 0.38,
		countDesignStart: -150,
		countDesignEnd: 550,
		fadeStart: 0.629,
		fadeEnd: 0.689,
		rangeStart: 30,
		rangeEnd: 36,
		meanValue: 33,
		colour: 'red'
	});

	setPinnedRangeChartState(vaccinatedChart, {
		revealStart: 0.629,
		revealEnd: 0.689,
		dotStart: 0.649,
		dotEnd: 0.759,
		rangeVisualStart: 0.769,
		rangeVisualEnd: 0.839,
		countStart: 0.709,
		countEnd: 0.849,
		fadeStart: 0.969,
		fadeEnd: 1.00,
		rangeStart: 14,
		rangeEnd: 19,
		meanValue: 16,
		colour: 'red'
	});

	if (placeboCard !== null) {
		setVaccineCardScrollPosition(
			placeboCard,
			getReferenceScrollItemProgress(placeboCard, speechScrollDist, 1600)
		);
	}

	if (vaccinatedCard !== null) {
		setVaccineCardScrollPosition(
			vaccinatedCard,
			getReferenceScrollItemProgress(vaccinatedCard, speechScrollDist, 3300)
		);
	}

	setPinnedCompareState(rangeCompare, {
		revealStart: 0.969,
		revealEnd: 1.000,
		dotStart: 0.965,
		dotEnd: 0.982,
		rangeVisualStart: 0.978,
		rangeVisualEnd: 0.990,
		countStart: 0.972,
		countEnd: 0.992,
		arrowStart: 0.985,
		arrowEnd: 0.996,
		fadeStart: 2.0,
		fadeEnd: 2.0
	});

	const outroDist = scrollDist - buildDuration;
	const speechOutroDist = speechScrollDist - buildDuration;
	const compareFade = 1 - smoothStep(4495, 4795, outroDist);
	if (rangeCompare !== null && scrollDist >= buildDuration) {
		const compareContainerOpacity = layerOpacity * compareFade;
		rangeCompare.style.opacity = compareContainerOpacity.toFixed(3);
		rangeCompare.style.visibility = compareContainerOpacity > 0.02 ? 'visible' : 'hidden';
	}

	if (isMobileLayout()) {
		const mobileCompareSequenceEnd = 4495;
		if (compareLowerCard !== null) {
			setVaccineCardScrollPosition(compareLowerCard, getReferenceSequenceProgress(compareLowerCard, speechOutroDist, 0, 3, mobileCompareSequenceEnd, {
				gap: 90
			}));
			compareLowerCard.style.opacity = (parseFloat(compareLowerCard.style.opacity || '0') * layerOpacity).toFixed(3);
		}
		if (compareMeanDifferenceCard !== null) {
			setVaccineCardScrollPosition(compareMeanDifferenceCard, getReferenceSequenceProgress(compareMeanDifferenceCard, speechOutroDist, 1, 3, mobileCompareSequenceEnd, {
				gap: 90
			}));
			compareMeanDifferenceCard.style.opacity = (parseFloat(compareMeanDifferenceCard.style.opacity || '0') * layerOpacity).toFixed(3);
		}
		if (compareOverallCard !== null) {
			setVaccineCardScrollPosition(compareOverallCard, getReferenceSequenceProgress(compareOverallCard, speechOutroDist, 2, 3, mobileCompareSequenceEnd, {
				gap: 90
			}));
			compareOverallCard.style.opacity = (parseFloat(compareOverallCard.style.opacity || '0') * layerOpacity).toFixed(3);
		}
	} else {
		if (compareLowerCard !== null) {
			setVaccineCardScrollPosition(compareLowerCard, getReferenceScrollItemProgress(compareLowerCard, speechOutroDist, 0));
			compareLowerCard.style.opacity = (parseFloat(compareLowerCard.style.opacity || '0') * layerOpacity).toFixed(3);
		}
		if (compareMeanDifferenceCard !== null) {
			setVaccineCardScrollPosition(compareMeanDifferenceCard, getReferenceScrollItemProgress(compareMeanDifferenceCard, speechOutroDist, 1450));
			compareMeanDifferenceCard.style.opacity = (parseFloat(compareMeanDifferenceCard.style.opacity || '0') * layerOpacity).toFixed(3);
		}
		if (compareOverallCard !== null) {
			setVaccineCardScrollPosition(compareOverallCard, getReferenceScrollItemProgress(compareOverallCard, speechOutroDist, 2900));
			compareOverallCard.style.opacity = (parseFloat(compareOverallCard.style.opacity || '0') * layerOpacity).toFixed(3);
		}
	}

	const safetyIntro = pinLayer.querySelector('.effectiveness-range-safety-intro');
	if (safetyIntro !== null) {
		const introReveal = smoothStep(4495, 4795, outroDist);
		const introFadeOut = 1 - smoothStep(6395, 6745, outroDist);
		const introOpacity = layerOpacity * Math.min(introReveal, introFadeOut);
		safetyIntro.style.opacity = introOpacity.toFixed(3);
		safetyIntro.style.visibility = introOpacity > 0.02 ? 'visible' : 'hidden';
		safetyIntro.style.transform = `translate3d(0, ${lerp(26, 0, introReveal).toFixed(2)}px, 0)`;
	}

	if (safetyInfoCard !== null) {
		setOpaqueSpeechCardScrollPosition(safetyInfoCard, getReferenceScrollItemProgress(safetyInfoCard, speechOutroDist, 4800));
	}

	if (safetyFirstChart !== null) {
		const chartReveal = smoothStep(6665, 6945, outroDist);
		const chartOpacity = chartReveal;
		safetyFirstChart.style.opacity = chartOpacity.toFixed(3);
		safetyFirstChart.style.visibility = chartOpacity > 0.02 ? 'visible' : 'hidden';
		safetyFirstChart.style.transform = `translate3d(0, ${lerp(26, 0, chartReveal).toFixed(2)}px, 0)`;
	}
}

function createMobileHeroLayer() {
	const existingLayer = document.querySelector(".mobile-hero-layer");

	if (existingLayer !== null) {
		return existingLayer;
	}

	const layer = makeElement("div", "mobile-hero-layer");
	const content = makeElement("div", "mobile-hero-content");
	const title = makeElement("h1", "title main-title", "How Effective and Safe is the Herpes Zoster<br>Vaccine?");
	setBox(title, 455, 359, 1010);
	content.appendChild(title);

	const hint = makeElement("div", "mobile-scroll-hint", "<span class=\"scroll-guide\">Keep scrolling as you read to follow the story.</span><span class=\"scroll-label\">Scroll Down</span><span class=\"scroll-arrow\" aria-hidden=\"true\">↓</span>");
	hint.setAttribute("role", "button");
	hint.setAttribute("tabindex", "0");
	hint.setAttribute("aria-label", "Scroll to the first story scene");
	hint.addEventListener("click", scrollToBurden);
	hint.addEventListener("keydown", (event) => {
		if (event.key === "Enter" || event.key === " ") {
			event.preventDefault();
			scrollToBurden();
		}
	});

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

	const firstPinnedScene = document.querySelector(".disease-scrolly");
	const firstSceneTop = firstPinnedScene !== null ?
		parseFloat(firstPinnedScene.dataset.absoluteTop || "1260") :
		1260;
	const firstPinOffset = firstPinnedScene !== null ?
		parseFloat(firstPinnedScene.dataset.pinOffset || "150") :
		150;
	const pinStart = firstSceneTop - firstPinOffset;
	const handoffStart = pinStart - 420;
	const handoffEnd = pinStart + 40;
	const actualDesignY = readDesignScrollY();
	const heroProgressY = Math.max(currentDesignY || 0, actualDesignY || 0);
	const handoff = smoothStep(handoffStart, handoffEnd, heroProgressY);
	const opacity = 1 - handoff;
	const content = layer.querySelector(".mobile-hero-content");

	layer.classList.toggle("is-active", opacity > 0.01);
	layer.style.opacity = opacity.toFixed(3);
	layer.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';

	if (content !== null) {
		const lift = lerp(0, -16, handoff);
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = opacity.toFixed(3);
		content.style.transform = `translate3d(-50%, ${lift.toFixed(2)}px, 0) scale(var(--pin-scale))`;
		content.style.filter = `blur(${lerp(0, 1.8, handoff).toFixed(2)}px)`;
	}
}

let controlledScrollAnimationId = null;
let controlledScrollRunId = 0;
let isControlledScrolling = false;

function animateWindowToDesignY(targetDesignY, duration, onComplete) {
	if (controlledScrollAnimationId !== null) {
		window.cancelAnimationFrame(controlledScrollAnimationId);
		controlledScrollAnimationId = null;
	}

	const runId = ++controlledScrollRunId;
	const targetTop = designYToScrollTop(targetDesignY);
	isControlledScrolling = true;

	const commitTarget = () => {
		if (runId !== controlledScrollRunId) {
			return;
		}

		window.scrollTo(0, targetTop);
		scrollState.targetDesignY = targetDesignY;
		scrollState.currentDesignY = targetDesignY;
		updateScrollDrivenScenes(targetDesignY);
	};

	const finish = () => {
		commitTarget();

		window.requestAnimationFrame(() => {
			window.requestAnimationFrame(() => {
				if (runId !== controlledScrollRunId) {
					return;
				}

				commitTarget();
				isControlledScrolling = false;

				if (typeof onComplete === "function") {
					onComplete();
				}
			});
		});
	};

	if (prefersReducedMotion || !(duration > 0)) {
		finish();
		return;
	}

	const startTop = getPageScrollTop();
	const distance = targetTop - startTop;
	const startTime = performance.now();

	const frame = (now) => {
		if (runId !== controlledScrollRunId) {
			return;
		}

		const progress = clamp((now - startTime) / duration, 0, 1);
		const eased = progress < 0.5 ?
			4 * progress * progress * progress :
			1 - (Math.pow(-2 * progress + 2, 3) / 2);
		const nextTop = startTop + (distance * eased);
		const nextDesignY = nextTop / (getScale() * getActiveTimelineScale());

		window.scrollTo(0, nextTop);
		scrollState.targetDesignY = nextDesignY;
		scrollState.currentDesignY = nextDesignY;
		updateScrollDrivenScenes(nextDesignY);

		if (progress < 1) {
			controlledScrollAnimationId = window.requestAnimationFrame(frame);
			return;
		}

		controlledScrollAnimationId = null;
		finish();
	};

	controlledScrollAnimationId = window.requestAnimationFrame(frame);
}

function scrollToBurden() {
	const scene = document.querySelector(".disease-scrolly");

	if (scene !== null) {
		const targetDesignY = getDiseaseNavigationTop();
		animateWindowToDesignY(targetDesignY, 1320);
	}
}

let landingFirstScrollHandled = false;
let landingScrollSnapInProgress = false;
let landingTouchStartY = null;

function isWithinLandingAdvanceRange() {
	const targetDesignY = getDiseaseNavigationTop();
	const currentDesignY = readDesignScrollY();
	const landingLimit = Math.min(560, targetDesignY * 0.48);
	return currentDesignY <= landingLimit;
}

function lockLandingAtTarget(targetDesignY) {
	const targetTop = designYToScrollTop(targetDesignY);
	window.scrollTo({
		top: targetTop,
		behavior: "auto"
	});
	scrollState.targetDesignY = targetDesignY;
	scrollState.currentDesignY = targetDesignY;
	updateScrollDrivenScenes(targetDesignY);
}

function releaseLandingSnap(targetDesignY) {
	lockLandingAtTarget(targetDesignY);
	landingScrollSnapInProgress = false;
}

function triggerLandingAdvance(event) {
	if (landingScrollSnapInProgress) {
		if (event && event.cancelable) {
			event.preventDefault();
		}
		return true;
	}

	if (landingFirstScrollHandled || !isWithinLandingAdvanceRange()) {
		return false;
	}

	if (event && event.cancelable) {
		event.preventDefault();
	}

	const targetDesignY = getDiseaseNavigationTop();
	const animationDuration = prefersReducedMotion ? 0 : 1320;

	landingFirstScrollHandled = true;
	landingScrollSnapInProgress = true;

	animateWindowToDesignY(targetDesignY, animationDuration, () => {
		releaseLandingSnap(targetDesignY);
	});

	return true;
}

function handleLandingFirstWheel(event) {
	if (landingScrollSnapInProgress) {
		if (event.cancelable) {
			event.preventDefault();
		}
		return;
	}

	if (event.deltaY <= 0) {
		return;
	}

	triggerLandingAdvance(event);
}

function handleLandingTouchStart(event) {
	if (landingScrollSnapInProgress) {
		landingTouchStartY = null;
		return;
	}

	if (!event.touches || event.touches.length !== 1) {
		landingTouchStartY = null;
		return;
	}

	landingTouchStartY = event.touches[0].clientY;
}

function handleLandingTouchMove(event) {
	if (landingScrollSnapInProgress) {
		if (event.cancelable) {
			event.preventDefault();
		}
		return;
	}

	if (landingTouchStartY === null || !event.touches || event.touches.length !== 1) {
		return;
	}

	const currentY = event.touches[0].clientY;
	const upwardSwipeDistance = landingTouchStartY - currentY;

	if (upwardSwipeDistance >= 18) {
		triggerLandingAdvance(event);
		landingTouchStartY = null;
	}
}

function handleLandingTouchEnd() {
	landingTouchStartY = null;
}

function handleLandingFirstKeydown(event) {
	const advanceKeys = ["ArrowDown", "PageDown", " "];

	if (landingScrollSnapInProgress) {
		if (advanceKeys.includes(event.key)) {
			event.preventDefault();
		}
		return;
	}

	if (!advanceKeys.includes(event.key)) {
		return;
	}

	triggerLandingAdvance(event);
}

function resetLandingAdvanceWhenBackAtTop() {
	if (!landingScrollSnapInProgress && readDesignScrollY() < 40) {
		landingFirstScrollHandled = false;
	}
}

let decisionWheelGestureCount = 0;
let decisionWheelGestureActive = false;
let decisionWheelGestureTimer = null;
let decisionBubbleSnapInProgress = false;

function handleDecisionIntroWheel(event) {
	if (event.deltaY <= 0 || typeof PINNED_SCENE_DEFS === "undefined") {
		return;
	}

	const introDef = PINNED_SCENE_DEFS.find((def) => def.id === "decision-intro");
	const bubbleDef = PINNED_SCENE_DEFS.find((def) => def.id === "decision-conclusion");

	if (!introDef || !bubbleDef || !Number.isFinite(introDef._top) || !Number.isFinite(bubbleDef._top)) {
		return;
	}

	const currentDesignY = readDesignScrollY();
	const introEnd = introDef._top + introDef._pinDuration;
	const isInsideDecisionIntro = currentDesignY >= introDef._top && currentDesignY < introEnd;

	if (!isInsideDecisionIntro) {
		decisionWheelGestureCount = 0;
		decisionWheelGestureActive = false;
		if (decisionWheelGestureTimer !== null) {
			window.clearTimeout(decisionWheelGestureTimer);
			decisionWheelGestureTimer = null;
		}
		return;
	}

	if (decisionBubbleSnapInProgress) {
		event.preventDefault();
		return;
	}

	if (!decisionWheelGestureActive) {
		decisionWheelGestureActive = true;
		decisionWheelGestureCount += 1;
	}

	if (decisionWheelGestureTimer !== null) {
		window.clearTimeout(decisionWheelGestureTimer);
	}
	decisionWheelGestureTimer = window.setTimeout(() => {
		decisionWheelGestureActive = false;
		decisionWheelGestureTimer = null;
	}, 180);

	if (decisionWheelGestureCount < 2) {
		return;
	}

	event.preventDefault();
	decisionBubbleSnapInProgress = true;
	decisionWheelGestureCount = 0;

	const targetDesignY = bubbleDef._top + 430;
	animateWindowToDesignY(targetDesignY, prefersReducedMotion ? 0 : 720, () => {
		decisionBubbleSnapInProgress = false;
		decisionWheelGestureActive = false;
	});
}

function renderIntro() {
	const mainTitle = makeElement("h1", "title main-title landing-static-title", "How Effective and Safe is<br>the Herpes Zoster<br>Vaccine?");
	appendElement("intro", mainTitle, 455, 359, 1010);

	addScrollButton("intro");

	addDiseaseScrollScene("intro", 1260);

	addRiskScrollScene("intro", 3585);

	addVaccinationScrollScene("intro", 6460);
}

function renderEffectiveness() {
	addEffectivenessIntroScene("effectiveness", 11005);
}

function renderUncertainty() {
	addReliabilityScrollScene("uncertainty", 19505);
	addUncertaintyConceptScrollScene("uncertainty", 20655);
}

function renderEffectivenessRange() {
	addEffectivenessRangeScrollScene('effectivenessRange', 28855);
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
	if (prefersReducedMotion || typeof window.IntersectionObserver !== "function") {
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

const progressUi = {
	bar: null,
	fill: null,
	dots: []
};

function addTopProgressBar() {
	if (document.querySelector('.story-top-progress') !== null) {
		return;
	}

	const bar = makeElement('div', 'story-top-progress');
	bar.setAttribute('role', 'progressbar');
	bar.setAttribute('aria-label', 'Article reading progress');
	bar.setAttribute('aria-valuemin', '0');
	bar.setAttribute('aria-valuemax', '100');
	bar.setAttribute('aria-valuenow', '0');
	const fill = makeElement('div', 'story-top-progress-fill');
	bar.appendChild(fill);
	document.body.appendChild(bar);
	progressUi.bar = bar;
	progressUi.fill = fill;
	updateTopProgressBar();
}

function updateTopProgressBar() {
	const bar = progressUi.bar || document.querySelector('.story-top-progress');
	const fill = progressUi.fill || document.querySelector('.story-top-progress-fill');
	if (bar === null || fill === null) {
		return;
	}
	const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
	const progress = clamp(window.scrollY / maxScroll, 0, 1);
	fill.style.transform = `scaleX(${progress.toFixed(5)})`;
	bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
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
			const duration = isMobileLayout() ? 820 : 980;
			animateWindowToDesignY(designTop, prefersReducedMotion ? 0 : duration);
			requestScrollSceneFrame();
		});
		rail.appendChild(button);
	});

	document.body.appendChild(rail);
	progressUi.dots = Array.from(rail.querySelectorAll(".progress-dot"));
	updateProgressRail();
}

function updateProgressRail() {
	const scale = getScale();
	const currentY = readDesignScrollY();
	let activeKey = navSections[0].key;

	navSections.forEach((section) => {
		const sectionTop = getNavSectionTop(section);
		if (currentY >= sectionTop - 400) {
			activeKey = section.key;
		}
	});

	(progressUi.dots.length ? progressUi.dots : document.querySelectorAll(".progress-dot")).forEach((button) => {
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

function isTimelineStretched() {
	return document.documentElement.dataset.timelineStretched === "true";
}

function getTotalDesignHeight() {
	const canvas = document.getElementById("canvas");
	const inlineHeight = canvas ? parseFloat(canvas.style.height || "0") : 0;
	const physicalDesignHeight = inlineHeight || designHeight;
	return isTimelineStretched() ? physicalDesignHeight / getActiveTimelineScale() : physicalDesignHeight;
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
		step.style.top = `calc(${start * getActiveTimelineScale()}px * var(--scale))`;
		step.style.height = `calc(${Math.max(1, end - start) * getActiveTimelineScale()}px * var(--scale))`;
		container.appendChild(step);
	}

	document.querySelector(".page").appendChild(container);
	return container;
}

function renderFromScrollama() {
	if (isControlledScrolling || landingScrollSnapInProgress) {
		return;
	}

	const designY = readDesignScrollY();
	scrollState.targetDesignY = designY;

	if (prefersReducedMotion) {
		scrollState.currentDesignY = designY;
		updateScrollDrivenScenes(designY);
		return;
	}

	requestScrollSceneFrame();
}

let nativeScrollRenderQueued = false;

function handleNativeStoryScroll() {
	if (nativeScrollRenderQueued) {
		return;
	}

	nativeScrollRenderQueued = true;
	window.requestAnimationFrame(() => {
		nativeScrollRenderQueued = false;
		renderFromScrollama();
	});
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

	window.addEventListener("scroll", handleNativeStoryScroll, {
		passive: true
	});

	if (typeof window.scrollama !== "function" || typeof window.IntersectionObserver !== "function") {
		renderFromScrollama();
		return;
	}

	try {
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
	} catch (error) {
		storyScroller = null;
	}

	renderFromScrollama();
}

const EFFECTIVENESS_HANDOFF_OVERLAP = 400;
const PINNED_SCENE_BASE = ARTICLE_FEATURES.showUncertainty ?
	40525 :
	19505 - EFFECTIVENESS_HANDOFF_OVERLAP;
const PAGE_REVEAL = 2600;
const STANDARD_BUBBLE_TRAVEL = SPEECH_SCROLL_DISTANCE;
const PAGE_BUBBLE = STANDARD_BUBBLE_TRAVEL;
const PAGE_FADE = 1100;

const UNCERTAINTY_PINNED_SCENES = [{
		id: 'sfa-1',
		kind: 'chart',
		revealDist: 420,
		bubbleStart: 420,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		chart: {
			title: 'Serious Adverse Event<br>in the <span class="blue">Placebo</span> Group',
			count: 22,
			colour: 'purple',
			mean: 22,
			hasRange: false
		},
		bubbles: ['<span class="grey">The study shows that</span> about <span class="purple">22</span> in every 1,000 people<br>who did not receive the vaccine<span class="grey"> would experience serious adverse events.</span>']
	},
	{
		id: 'sfa-2',
		kind: 'chart',
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		chart: {
			title: 'Serious Adverse Event<br>in the <span class="blue">Vaccinated</span> Group',
			count: 23,
			colour: 'purple',
			mean: 23,
			hasRange: false
		},
		bubbles: [
			'About <span class="purple">23</span> in every 1,000 people who receive the vaccine <span class="grey">likely experience serious adverse events.</span>',
			'But how about uncertainty in the study data?'
		]
	},
	{
		id: 'sfa-3',
		kind: 'chart',
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		chart: {
			title: 'The Uncertainty Range of Serious Adverse Event in the <span class="blue">Placebo</span> Group',
			count: 22,
			colour: 'purple',
			rangeStart: 20,
			rangeEnd: 24,
			mean: 22,
			hasRange: true
		},
		bubbles: ['<span class="grey">The number of people who experience a serious adverse event in the placebo group is likely to be</span> between about <span class="purple">20</span> and <span class="purple">24</span> in every 1,000 people.']
	},
	{
		id: 'sfa-4',
		kind: 'chart',
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		chart: {
			title: 'The Uncertainty Range of Serious Adverse Event in the <span class="blue">Vaccinated</span> Group',
			count: 23,
			colour: 'purple',
			rangeStart: 21,
			rangeEnd: 26,
			mean: 23,
			hasRange: true
		},
		bubbles: ['<span class="grey">The number of people who experience a serious adverse event in the vaccinated group is likely to be</span> between about <span class="purple">21</span> and <span class="purple">26</span> in every 1,000 people.']
	},
	{
		id: 'sfa-5',
		kind: 'compare',
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		compare: {
			title: 'The Serious Adverse Event of Vaccination',
			colour: 'purple',
			hasRange: true,
			arrowFile: 'arrow2.png',
			arrowAlt: 'An up arrow showing slightly more serious adverse events after vaccination',
			hideArrow: true,
			left: {
				count: 22,
				rangeStart: 20,
				rangeEnd: 24,
				mean: 22
			},
			right: {
				count: 23,
				rangeStart: 21,
				rangeEnd: 26,
				mean: 23
			}
		},
		bubbles: [
			'So for every 1,000 people, the vaccinated group<br>had an average of <span class="purple">1</span> more serious adverse<br>event <span class="grey">compared to the placebo group.</span>',
			'The likely ranges overlapped<span class="grey"> and were close to each other,</span> at <span class="purple">20</span> to <span class="purple">24</span> cases in the placebo group and <span class="purple">21</span> to <span class="purple">26</span> cases in the vaccinated group.',
			'<span class="grey">This indicates</span> no clear difference between the vaccinated and placebo groups in serious adverse events.'
		]
	},
	{
		id: 'decision-intro',
		kind: 'intro',
		overlapBefore: 900,
		title: 'Making a Vaccination <span class="blue">Decision</span>',
		subtitle: 'How should these study findings be interpreted when making a vaccination decision?'
	},
	{
		id: 'decision-conclusion',
		kind: 'bubbles',
		bubbleSpacing: 1900,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		bubbles: [
			'<span class="grey">Overall, this study shows</span> vaccination prevented the occurrence of herpes zoster, <span class="grey">while the evidence suggests</span> no clear difference in serious adverse events between groups.'
		]
	},
	{
		id: 'sfa-7',
		kind: 'closing',
		overlapBefore: 650,
		bubbleStart: 0,
		revealDist: 1800,
		bgStart: 300,
		bubbleSpacing: 1900,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		imageFile: 'own_factors_transparent_highres.png',
		imageAlt: 'Personal factors for vaccination decision',
		bubbles: [
			'<span class="grey">However, these findings describe</span> average outcomes in the study population, and the expected benefit varies with personal risk of herpes zoster, <span class="grey">which is influenced by age, immune status, and medical history.</span>',
			'<span class="grey">Therefore, vaccination decisions can be better informed by</span> weighing the expected benefits, possible harms, uncertainty, and individual context.'
		]
	},
	{
		id: 'sfa-msg',
		kind: 'message',
		message: 'Thank you for reading the article.<br>Please return to the original survey page<br>and answer the questions.',
		sources: [{
				label: 'Cochrane Library - Vaccines for preventing herpes zoster in older adults',
				url: 'https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD008858.pub5/full'
			},
			{
				label: 'World Health Organization - Shingles (herpes zoster)',
				url: 'https://www.who.int/news-room/fact-sheets/detail/shingles-(herpes-zoster)'
			}
		]
	}
];

const POINT_ESTIMATE_PINNED_SCENES = [{
		id: 'effectiveness-compare',
		kind: 'compare',
		revealDist: 1400,
		transparentLayer: true,
		fadeBackgroundWithLastBubble: true,
		backgroundFadeBubbleProgress: 0.80,
		backgroundFadeDuration: 800,
		compare: {
			title: 'The Effectiveness of Vaccination',
			colour: 'red',
			hasRange: false,
			arrowFile: 'arrow1.png',
			arrowAlt: 'A down arrow showing fewer herpes zoster cases after vaccination',
			left: {
				count: 33,
				mean: 33
			},
			right: {
				count: 16,
				mean: 16
			}
		},
		bubbles: [
			'So for every 1,000 people, vaccination reduced an average of <span class="red">17</span> herpes zoster cases <span class="grey">compared to the placebo group.</span>',
			'<span class="grey">This indicates</span> the herpes zoster vaccine appears to prevent the risk of developing it.'
		]
	},
	{
		id: 'safety-intro',
		kind: 'intro-with-bubble',
		revealDist: 1500,
		title: 'The <span class="blue">Safety</span> of Vaccination',
		subtitle: 'How many people experienced a <span class="blue">serious adverse event</span><br>in the placebo group and in the vaccinated group?',
		bubbles: [
			'Serious adverse events refer to severe outcomes such as death, life-threatening conditions, <span class="grey">hospitalisation, disability or permanent damage, congenital anomalies/birth defects, required intervention to prevent permanent impairment or damage, </span>or other important medical events.'
		]
	},
	{
		id: 'sfa-1',
		kind: 'chart',
		revealDist: 420,
		bubbleStart: 420,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		chart: {
			title: 'Serious Adverse Event<br>in the <span class="blue">Placebo</span> Group',
			count: 22,
			colour: 'purple',
			mean: 22,
			hasRange: false
		},
		bubbles: ['<span class="grey">The study shows that</span> about <span class="purple">22</span> in every 1,000 people<br>who did not receive the vaccine<span class="grey"> would experience serious adverse events.</span>']
	},
	{
		id: 'sfa-2',
		kind: 'chart',
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		chart: {
			title: 'Serious Adverse Event<br>in the <span class="blue">Vaccinated</span> Group',
			count: 23,
			colour: 'purple',
			mean: 23,
			hasRange: false
		},
		bubbles: ['About <span class="purple">23</span> in every 1,000 people who receive the vaccine <span class="grey">likely experience serious adverse events.</span>']
	},
	{
		id: 'sfa-compare',
		kind: 'compare',
		revealDist: 2200,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		compare: {
			title: 'The Serious Adverse Event of Vaccination',
			colour: 'purple',
			hasRange: false,
			hideArrow: true,
			left: {
				count: 22,
				mean: 22
			},
			right: {
				count: 23,
				mean: 23
			}
		},
		bubbles: [
			'So for every 1,000 people, the vaccinated group<br>had an average of <span class="purple">1</span> more serious adverse<br>event <span class="grey">compared to the placebo group.</span>',
			'<span class="grey">This indicates</span> no clear difference between the vaccinated and placebo groups in serious adverse events.'
		]
	},
	{
		id: 'decision-intro',
		kind: 'intro',
		overlapBefore: 900,
		title: 'Making a Vaccination <span class="blue">Decision</span>',
		subtitle: 'How should these study findings be interpreted when making a vaccination decision?'
	},
	{
		id: 'decision-conclusion',
		kind: 'bubbles',
		bubbleSpacing: 1900,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		bubbles: [
			'<span class="grey">Overall, this study shows</span> vaccination prevented the occurrence of herpes zoster, <span class="grey">while the evidence suggests</span> no clear difference in serious adverse events between groups.'
		]
	},
	{
		id: 'sfa-7',
		kind: 'closing',
		bubbleStart: 0,
		overlapBefore: 720,
		revealDist: 1800,
		bgStart: 300,
		bubbleSpacing: 1900,
		bubbleTravel: STANDARD_BUBBLE_TRAVEL,
		imageFile: 'own_factors_transparent_highres.png',
		imageAlt: 'Personal factors for vaccination decision',
		bubbles: [
			'<span class="grey">However, these findings describe</span> average outcomes in the study population, and the expected benefit varies with personal risk of herpes zoster, <span class="grey">which is influenced by age, immune status, and medical history.</span>',
			'<span class="grey">Therefore, vaccination decisions can be better informed by</span> weighing the expected benefits, possible harms, and individual context.'
		]
	},
	{
		id: 'sfa-msg',
		kind: 'message',
		message: 'Thank you for reading the article.<br>Please return to the original survey page<br>and answer the questions.',
		sources: [{
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

const PINNED_SCENE_DEFS = ARTICLE_FEATURES.showUncertainty ?
	UNCERTAINTY_PINNED_SCENES :
	POINT_ESTIMATE_PINNED_SCENES;

const PAGE_MESSAGE_REVEAL = 1200;
const PAGE_MESSAGE_HOLD = 3500;

function getPinnedBackgroundFadeTiming(def, bubbleBase, bubbleSpacing, bubbleTravel, bubbleCount) {
	const defaultStart = bubbleBase + (bubbleCount > 0 ?
		(((bubbleCount - 1) * bubbleSpacing) + bubbleTravel) :
		0);
	const lastBubbleStart = bubbleBase + (bubbleCount > 0 ?
		((bubbleCount - 1) * bubbleSpacing) :
		0);
	const start = def.fadeBackgroundWithLastBubble === true && bubbleCount > 0 ?
		lastBubbleStart + (bubbleTravel * clamp(Number(def.backgroundFadeBubbleProgress) || 0.80, 0, 1)) :
		defaultStart;
	const duration = Math.max(1, Number(def.backgroundFadeDuration) || PAGE_FADE);
	return {
		start,
		duration
	};
}

function getPinnedPageDuration(def) {
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

function makePinnedChart(cfg) {
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
	chart.appendChild(makeLegend(cfg.colour, 'Case of serious adverse event', !!cfg.hasRange));
	return chart;
}

function makePinnedCompare(cfg) {
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
		const dots = makeDotPlot(side.count, cfg.colour, side.rangeStart, side.rangeEnd);
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
	compare.appendChild(makeLegend(cfg.colour, cfg.colour === 'red' ? 'Case of herpes zoster' : 'Case of serious adverse event', hasRange));
	return compare;
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
		const chart = makePinnedChart(def.chart);
		setBox(chart, 410, 160, 1100, 760);
		content.appendChild(chart);
		def._bgSelector = '.pinned-page-chart';
	} else if (def.kind === 'compare') {
		const compare = makePinnedCompare(def.compare);
		setBox(compare, 0, 112, 1920, 850);
		content.appendChild(compare);
		def._bgSelector = '.pinned-page-compare';
	} else if (def.kind === 'intro' || def.kind === 'intro-with-bubble') {
		const introClass = def.kind === 'intro-with-bubble' ?
			'decision-intro-block safety-intro-block' :
			'decision-intro-block';
		const titleClass = def.kind === 'intro-with-bubble' ?
			'title section-title decision-intro-title safety-intro-title' :
			'title section-title decision-intro-title';
		const subtitleClass = def.kind === 'intro-with-bubble' ?
			'subtitle decision-intro-subtitle safety-intro-subtitle' :
			'subtitle decision-intro-subtitle';
		const intro = makeElement('section', introClass);
		intro.appendChild(makeElement('h2', titleClass, def.title));
		intro.appendChild(makeElement('p', subtitleClass, def.subtitle));
		setBox(intro, 260, 0, 1400, 1080);
		content.appendChild(intro);
		def._bgSelector = def.kind === 'intro-with-bubble' ? '.safety-intro-block' : '.decision-intro-block';
	} else if (def.kind === 'closing') {
		const img = document.createElement('img');
		img.className = 'asset pinned-page-illustration';
		img.src = './assets/' + def.imageFile;
		img.alt = def.imageAlt || '';
		setBox(img, 356, 54, 1208, 974);
		content.appendChild(img);
		def._bgSelector = '.pinned-page-illustration';
	} else if (def.kind === 'message') {
		const msg = makeElement('p', 'closing final-message pinned-page-message', def.message);
		setBox(msg, 260, 330, 1400, 300);
		content.appendChild(msg);
		if (Array.isArray(def.sources) && def.sources.length > 0) {
			const sources = makeElement('aside', 'data-sources');
			sources.setAttribute('aria-label', 'Data sources');
			sources.appendChild(makeElement('p', 'data-sources-title', 'You can also click on the links below for more information.'));
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
		const card = makeEffectivenessRangePinnedCard(html, 'pinned-page-bubble pinned-page-bubble-' + i);
		setBox(card, 464, 0, 993, 301);
		content.appendChild(card);
	});
	layer.appendChild(content);
	document.body.appendChild(layer);
	def._elements = {
		layer,
		content
	};
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
		applyDotMorph(plot, dotProgress, {
			clusterX: 415,
			clusterY: 258,
			radius: 60,
			startScale: 0.35,
			curve: 20
		});
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
	if (compare === null) return;
	const reveal = smoothStep(0.10, 0.24, p);
	const opacity = reveal * layerOpacity;
	compare.style.opacity = opacity.toFixed(3);
	compare.style.visibility = opacity > 0.02 ? 'visible' : 'hidden';
	const dotProgress = clamp(p / 0.66, 0, 1);
	compare.querySelectorAll('.dot-plot').forEach((plot) => {
		applyDotMorph(plot, dotProgress, {
			clusterX: 415,
			clusterY: 258,
			radius: 50,
			startScale: 0.30,
			curve: 24
		});
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
			setScrollTiedRangeCount(mean, parseInt(mean.dataset.rangeStart, 10), parseInt(mean.dataset.rangeEnd, 10), parseInt(mean.dataset.countUp, 10), mean.dataset.colour, countProgress);
		} else {
			setScrollTiedMeanCount(mean, parseInt(mean.dataset.countUp, 10), mean.dataset.colour, countProgress);
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
	const layer = def._elements && def._elements.layer;
	if (!layer) {
		return;
	}
	const pinStart = def._top;
	const pinDuration = def._pinDuration;
	const pinEnd = pinStart + pinDuration;
	const scrollDist = progressDesignY - pinStart;
	const speechScrollDist = readDesignScrollY() - pinStart;
	const isPinned = getScenePinnedState(currentDesignY, pinStart, pinEnd);
	const content = def._elements && def._elements.content;
	const overall = clamp(scrollDist / pinDuration, 0, 1);
	const layerOpacity = isPinned ? smoothStep(0.0, 0.02, overall) : 0;
	layer.classList.toggle('is-active', isPinned);
	layer.style.opacity = layerOpacity.toFixed(3);
	if (content !== null) {
		content.style.top = `${Math.round(getPinOffsetY())}px`;
		content.style.opacity = layerOpacity.toFixed(3);
	}
	if (!content) {
		return;
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
	const bubbleBase = def.kind === 'bubbles' ? 0 : (def.bubbleStart !== undefined ? def.bubbleStart : PAGE_REVEAL);
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
		if (card === null) return;
		const startDistance = bubbleBase + (i * bubbleSpacing);
		const p = getReferenceScrollItemProgress(card, speechScrollDist, startDistance);
		setVaccineCardScrollPosition(card, p);
	});
}

function updatePinnedPages(currentDesignY) {
	currentDesignY = currentDesignY === undefined ? getAnimatedDesignY() : currentDesignY;
	PINNED_SCENE_DEFS.forEach((def) => updatePinnedPage(def, currentDesignY, currentDesignY));
}

function buildPinnedScenes() {
	let cursor = PINNED_SCENE_BASE;
	PINNED_SCENE_DEFS.forEach((def) => {
		const overlapBefore = Number(def.overlapBefore) || 0;
		def._pinDuration = getPinnedPageDuration(def);
		def._top = Math.max(PINNED_SCENE_BASE, cursor - overlapBefore);
		buildPinnedPageLayer(def);
		cursor = def._top + def._pinDuration;
	});
	const safetyDef = PINNED_SCENE_DEFS.find((d) => d.id === 'safety-intro');
	if (safetyDef) {
		sectionTops.safety = safetyDef._top;
	}
	const closingDef = PINNED_SCENE_DEFS.find((d) => d.kind === 'closing');
	if (closingDef) sectionTops.closing = closingDef._top;
	const msgDef = PINNED_SCENE_DEFS[PINNED_SCENE_DEFS.length - 1];
	const designViewport = window.innerHeight / (getScale() * getActiveTimelineScale());
	const messageRevealEnd = msgDef._top + PAGE_MESSAGE_REVEAL;
	const totalDesign = messageRevealEnd + 800 + designViewport;
	const canvas = document.getElementById('canvas');
	const stage = document.getElementById('stage');
	if (canvas !== null) canvas.style.height = totalDesign + 'px';
	if (stage !== null) stage.style.height = `calc(${totalDesign}px * var(--scale))`;
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
	button.addEventListener('click', function() {
		animateWindowToDesignY(0, prefersReducedMotion ? 0 : 720);
	});
	document.body.appendChild(button);

	const toggle = function() {
		const scrollTop = getPageScrollTop();
		const revealThreshold = isMobileLayout() ? 80 : 500;
		button.classList.toggle('is-visible', scrollTop > revealThreshold);
	};
	window.addEventListener('scroll', toggle, {
		passive: true
	});
	window.addEventListener('touchmove', toggle, {
		passive: true
	});
	window.addEventListener('resize', toggle, {
		passive: true
	});
	window.addEventListener('orientationchange', toggle, {
		passive: true
	});
	if (window.visualViewport) {
		window.visualViewport.addEventListener('scroll', toggle, {
			passive: true
		});
		window.visualViewport.addEventListener('resize', toggle, {
			passive: true
		});
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

	const horizontalMargin = compact ?
		(ultraNarrow ? 20 : narrowPhone ? 24 : 28) :
		80;
	const desiredPhysicalWidth = compact ?
		clamp(viewportWidth - horizontalMargin, 288, landscapeCompact ? 560 : 430) :
		Math.min(993 * pinScale, viewportWidth - horizontalMargin);
	const cardW = compact ?
		Math.min(1840, Math.round(desiredPhysicalWidth / pinScale)) :
		993;
	const cardLeft = Math.round((1920 - cardW) / 2);

	const targetPhysicalFont = compact ? 14 : 33;
	const targetPhysicalSmall = compact ? 12 : 22;
	const targetPhysicalPadY = compact ?
		(landscapeCompact ? 16 : ultraNarrow ? 18 : 20) :
		30;
	const targetPhysicalPadX = compact ?
		(ultraNarrow ? 18 : narrowPhone ? 20 : 24) :
		50;
	const targetPhysicalRadius = compact ?
		(ultraNarrow ? 18 : 20) :
		36;
	const targetPhysicalMinHeight = compact ?
		(landscapeCompact ? 112 : ultraNarrow ? 132 : 144) :
		301;

	const fontPx = compact ?
		Math.round(targetPhysicalFont / pinScale) :
		33;
	const smallFontPx = compact ?
		Math.round(targetPhysicalSmall / pinScale) :
		22;
	const paddingY = compact ?
		Math.round(targetPhysicalPadY / pinScale) :
		30;
	const paddingX = compact ?
		Math.round(targetPhysicalPadX / pinScale) :
		50;
	const borderRadius = compact ?
		Math.round(targetPhysicalRadius / pinScale) :
		36;
	const minHeight = compact ?
		Math.round(targetPhysicalMinHeight / pinScale) :
		301;
	const lineHeight = compact ? 1.35 : 1.2;
	const paragraphMaxWidth = compact ? '100%' : '900px';

	const selector = [
		'.text-card',
		'.pinned-page-bubble',
		'.effectiveness-range-pinned-card',
		'.effectiveness-pinned-card'
	].join(', ');

	document.querySelectorAll(selector).forEach(function(card) {
		const isUncertaintyCard = compact && card.classList.contains('uncertainty-concept-card');
		const uncertaintyPhysicalWidth = isUncertaintyCard ?
			clamp(viewportWidth - 116, 260, 340) :
			desiredPhysicalWidth;
		const responsiveCardW = isUncertaintyCard ?
			Math.min(1720, Math.round(uncertaintyPhysicalWidth / pinScale)) :
			cardW;
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

		card.querySelectorAll('small').forEach(function(small) {
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
		dataSources.style.fontSize = compact ?
			Math.round(sourcePhysicalFont / pinScale) + 'px' :
			sourcePhysicalFont + 'px';
		const sourceTitle = dataSources.querySelector('.data-sources-title');
		if (sourceTitle !== null) {
			sourceTitle.style.fontSize = compact ?
				Math.round(sourcePhysicalTitle / pinScale) + 'px' :
				sourcePhysicalTitle + 'px';
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

function scaleInlinePixelValue(element, propertyName, factor) {
	const raw = element.style[propertyName];
	if (!raw || !raw.endsWith("px")) {
		return;
	}
	const value = parseFloat(raw);
	if (Number.isFinite(value)) {
		element.style[propertyName] = `${value * factor}px`;
	}
}

function multiplyInlinePixelValue(element, propertyName, ratio) {
	const raw = element.style[propertyName];
	if (!raw || !raw.endsWith("px")) {
		return;
	}

	const value = parseFloat(raw);
	if (Number.isFinite(value)) {
		element.style[propertyName] = `${value * ratio}px`;
	}
}

function rescaleTimelineGeometry(nextTimelineScale) {
	const previousTimelineScale = getActiveTimelineScale();
	if (
		!Number.isFinite(nextTimelineScale) ||
		Math.abs(nextTimelineScale - previousTimelineScale) < 0.001
	) {
		return false;
	}

	const ratio = nextTimelineScale / previousTimelineScale;
	activeTimelineScale = nextTimelineScale;

	if (!isTimelineStretched()) {
		return true;
	}

	document.querySelectorAll(".story-section").forEach((section) => {
		multiplyInlinePixelValue(section, "top", ratio);
		multiplyInlinePixelValue(section, "height", ratio);

		Array.from(section.children).forEach((child) => {
			if (child.id !== "scrollButton") {
				multiplyInlinePixelValue(child, "top", ratio);
			}
			if (child.dataset && child.dataset.sceneHeight !== undefined) {
				multiplyInlinePixelValue(child, "height", ratio);
			}
		});
	});

	document.querySelectorAll(".scrollama-step").forEach((step) => {
		const start = parseFloat(step.dataset.designStart || "0");
		const end = parseFloat(step.dataset.designEnd || String(start + 1));
		step.style.top = `calc(${start * nextTimelineScale}px * var(--scale))`;
		step.style.height = `calc(${Math.max(1, end - start) * nextTimelineScale}px * var(--scale))`;
	});

	const canvas = document.getElementById("canvas");
	const stage = document.getElementById("stage");
	if (canvas !== null) {
		multiplyInlinePixelValue(canvas, "height", ratio);
	}
	if (stage !== null && canvas !== null) {
		const stretchedHeight = parseFloat(canvas.style.height || "0");
		if (Number.isFinite(stretchedHeight) && stretchedHeight > 0) {
			stage.style.height = `calc(${stretchedHeight}px * var(--scale))`;
		}
	}

	return true;
}

function applyTimelineStretch() {
	if (isTimelineStretched()) {
		return;
	}

	document.querySelectorAll(".story-section").forEach((section) => {
		const computed = window.getComputedStyle(section);
		const sectionTop = parseFloat(computed.top || "0");
		const sectionHeight = parseFloat(computed.height || "0");

		if (Number.isFinite(sectionTop)) {
			section.style.top = `${sectionTop * getActiveTimelineScale()}px`;
		}
		if (Number.isFinite(sectionHeight)) {
			section.style.height = `${sectionHeight * getActiveTimelineScale()}px`;
		}

		Array.from(section.children).forEach((child) => {

			if (child.id !== "scrollButton") {
				scaleInlinePixelValue(child, "top", getActiveTimelineScale());
			}
			if (child.dataset && child.dataset.sceneHeight !== undefined) {
				scaleInlinePixelValue(child, "height", getActiveTimelineScale());
			}
		});
	});

	const canvas = document.getElementById("canvas");
	const stage = document.getElementById("stage");
	const canvasHeight = canvas ?
		parseFloat(canvas.style.height || window.getComputedStyle(canvas).height || String(designHeight)) :
		designHeight;
	const stretchedHeight = canvasHeight * getActiveTimelineScale();

	if (canvas !== null) {
		canvas.style.height = `${stretchedHeight}px`;
	}
	if (stage !== null) {
		stage.style.height = `calc(${stretchedHeight}px * var(--scale))`;
	}

	document.documentElement.dataset.timelineStretched = "true";
}

function renderArticle() {
	renderIntro();
	createMobileHeroLayer();
	renderEffectiveness();
	if (ARTICLE_FEATURES.showUncertainty) {
		renderUncertainty();
		renderEffectivenessRange();
	}
	buildPinnedScenes();
	applyTimelineStretch();
	fillAllPlots();
	setupRevealObserver();
	addTopProgressBar();
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
let responsiveRefreshTimer = null;
let resetPlotCacheOnRefresh = false;
let lastLayoutViewportWidth = window.innerWidth;
let lastMobileLayoutState = isMobileLayout();
let lastVisualViewportWidth = window.visualViewport ?
	window.visualViewport.width :
	window.innerWidth;

function updateViewportHeightVariableOnly() {
	const viewport = window.visualViewport;
	const viewportHeight = viewport ? viewport.height : window.innerHeight;
	document.documentElement.style.setProperty(
		"--viewport-height",
		`${viewportHeight.toFixed(2)}px`
	);
}

function performResponsiveRefresh() {
	layoutRefreshRafId = null;

	const preservedDesignY = readDesignScrollY();
	const nextTimelineScale = getTimelineScale();
	const timelineScaleChanged = rescaleTimelineGeometry(nextTimelineScale);

	updateScale();

	if (resetPlotCacheOnRefresh) {
		document.querySelectorAll(".dot-plot, .mini-dot-plot").forEach((plot) => {
			delete plot.dataset.cachedWidth;
			delete plot.dataset.cachedHeight;
		});
	}
	resetPlotCacheOnRefresh = false;

	applyResponsiveCardSizing();

	if (timelineScaleChanged) {
		const targetTop = designYToScrollTop(preservedDesignY);
		window.scrollTo(0, targetTop);
		scrollState.targetDesignY = preservedDesignY;
		scrollState.currentDesignY = preservedDesignY;
	} else {
		const actualDesignY = readDesignScrollY();
		scrollState.targetDesignY = actualDesignY;

		if (Math.abs(scrollState.currentDesignY - actualDesignY) > 180) {
			scrollState.currentDesignY = actualDesignY;
		}
	}

	updateScrollDrivenScenes(scrollState.currentDesignY);

	if (storyScroller !== null) {
		storyScroller.resize();
	}
}

function scheduleResponsiveRefresh(resetPlotCache, delay) {
	resetPlotCacheOnRefresh = resetPlotCacheOnRefresh || Boolean(resetPlotCache);
	window.clearTimeout(responsiveRefreshTimer);

	responsiveRefreshTimer = window.setTimeout(() => {
		if (layoutRefreshRafId !== null) {
			return;
		}
		layoutRefreshRafId = window.requestAnimationFrame(performResponsiveRefresh);
	}, Number.isFinite(delay) ? delay : 150);
}

window.addEventListener("resize", () => {
	const currentWidth = window.innerWidth;
	const currentMobile = isMobileLayout();
	const widthChanged = Math.abs(currentWidth - lastLayoutViewportWidth) > 2;
	const breakpointChanged = currentMobile !== lastMobileLayoutState;

	lastLayoutViewportWidth = currentWidth;
	lastMobileLayoutState = currentMobile;

	if (currentMobile && !widthChanged && !breakpointChanged) {
		updateViewportHeightVariableOnly();
		return;
	}

	scheduleResponsiveRefresh(true, 160);
}, {
	passive: true
});

if (window.visualViewport) {
	window.visualViewport.addEventListener("resize", () => {
		const currentWidth = window.visualViewport.width;
		const currentMobile = isMobileLayout();
		const widthChanged = Math.abs(currentWidth - lastVisualViewportWidth) > 2;
		const breakpointChanged = currentMobile !== lastMobileLayoutState;

		lastVisualViewportWidth = currentWidth;
		lastMobileLayoutState = currentMobile;

		if (currentMobile && !widthChanged && !breakpointChanged) {
			updateViewportHeightVariableOnly();
			return;
		}

		scheduleResponsiveRefresh(widthChanged || breakpointChanged, 160);
	}, {
		passive: true
	});
}

window.addEventListener("orientationchange", () => {
	window.setTimeout(() => {
		lastLayoutViewportWidth = window.innerWidth;
		lastVisualViewportWidth = window.visualViewport ?
			window.visualViewport.width :
			window.innerWidth;
		lastMobileLayoutState = isMobileLayout();
		scheduleResponsiveRefresh(true, 40);
	}, 180);
}, {
	passive: true
});

window.addEventListener("pageshow", () => {
	if (document.readyState !== "complete") {
		return;
	}

	updateScale();
	syncScrollStateToWindow(true);
	updateScrollDrivenScenes(getAnimatedDesignY());
	if (storyScroller !== null) {
		storyScroller.resize();
	}
});

window.addEventListener("load", function() {
	updateScale();
	renderArticle();

	const button = document.getElementById("scrollButton");

	if (button !== null) {
		button.addEventListener("click", scrollToBurden);
	}

	window.addEventListener("wheel", handleLandingFirstWheel, {
		passive: false
	});
	window.addEventListener("touchstart", handleLandingTouchStart, {
		passive: true
	});
	window.addEventListener("touchmove", handleLandingTouchMove, {
		passive: false
	});
	window.addEventListener("touchend", handleLandingTouchEnd, {
		passive: true
	});
	window.addEventListener("keydown", handleLandingFirstKeydown);
	window.addEventListener("scroll", resetLandingAdvanceWhenBackAtTop, {
		passive: true
	});
	window.addEventListener("wheel", handleDecisionIntroWheel, {
		passive: false
	});
});
