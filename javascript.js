"use strict";

/*
==========================================================
 VIRTUAL MEMORY & ADDRESS TRANSLATION SIMULATOR
==========================================================

Features:

1. Virtual address translation
2. Page number + offset calculation
3. Page table
4. Physical memory
5. Page faults
6. FIFO replacement
7. LRU replacement
8. Optimal replacement
9. Reference string simulation
10. Automatic simulation
11. Interactive virtual pages
12. Responsive UI
==========================================================
*/


// ========================================================
// STATE
// ========================================================

const state = {

    pageSize: 256,

    virtualPages: 8,

    physicalFrames: 4,

    algorithm: "FIFO",

    frames: [],

    referenceString: [],

    currentReferenceIndex: -1,

    pageFaults: 0,

    pageHits: 0,

    accessCount: 0,

    fifoPointer: 0,

    lastUsed: {},

    autoRunning: false,

    autoTimer: null

};


// ========================================================
// PAGE COLORS
// ========================================================

const colors = [

    ["#6366f1", "#8b5cf6"],
    ["#06b6d4", "#0ea5e9"],
    ["#22c55e", "#16a34a"],
    ["#f59e0b", "#f97316"],
    ["#ec4899", "#db2777"],
    ["#ef4444", "#dc2626"],
    ["#14b8a6", "#0d9488"],
    ["#a855f7", "#7e22ce"],
    ["#3b82f6", "#2563eb"],
    ["#84cc16", "#65a30d"],
    ["#f43f5e", "#e11d48"],
    ["#0891b2", "#0e7490"],
    ["#eab308", "#ca8a04"],
    ["#7c3aed", "#6d28d9"],
    ["#10b981", "#059669"],
    ["#ea580c", "#c2410c"]

];


// ========================================================
// DOM
// ========================================================

const $ = id =>
    document.getElementById(id);


// Configuration

const pageSize =
    $("pageSize");

const virtualPages =
    $("virtualPages");

const physicalFrames =
    $("physicalFrames");

const algorithm =
    $("algorithm");


// Buttons

const newSimulationBtn =
    $("newSimulationBtn");

const randomBtn =
    $("randomBtn");

const resetBtn =
    $("resetBtn");

const translateBtn =
    $("translateBtn");

const loadReferenceBtn =
    $("loadReferenceBtn");

const stepBtn =
    $("stepBtn");

const autoBtn =
    $("autoBtn");

const clearLogBtn =
    $("clearLogBtn");


// Address

const virtualAddress =
    $("virtualAddress");

const displayVirtualAddress =
    $("displayVirtualAddress");

const displayPageNumber =
    $("displayPageNumber");

const displayOffset =
    $("displayOffset");

const resultPage =
    $("resultPage");

const resultOffset =
    $("resultOffset");

const resultFrame =
    $("resultFrame");

const resultPhysical =
    $("resultPhysical");

const translationStatus =
    $("translationStatus");


// Memory

const virtualMemory =
    $("virtualMemory");

const physicalMemory =
    $("physicalMemory");

const pageTableBody =
    $("pageTableBody");

const referenceList =
    $("referenceList");

const referenceInput =
    $("referenceInput");

const log =
    $("log");


// Stats

const accessCount =
    $("accessCount");

const faultCount =
    $("faultCount");

const hitCount =
    $("hitCount");

const hitRatio =
    $("hitRatio");

const systemStatus =
    $("systemStatus");


// ========================================================
// INITIALIZATION
// ========================================================

function initialize() {

    state.pageSize =
        Number(pageSize.value);

    state.virtualPages =
        clamp(
            Number(virtualPages.value),
            4,
            16
        );

    state.physicalFrames =
        clamp(
            Number(physicalFrames.value),
            2,
            8
        );

    state.algorithm =
        algorithm.value;

    state.frames =
        new Array(
            state.physicalFrames
        ).fill(null);

    state.referenceString =
        parseReferenceString(
            referenceInput.value
        );

    state.currentReferenceIndex =
        -1;

    state.pageFaults =
        0;

    state.pageHits =
        0;

    state.accessCount =
        0;

    state.fifoPointer =
        0;

    state.lastUsed =
        {};

    stopAutoRun();

    clearTranslation();

    renderEverything();

    log.innerHTML = "";

    addLog(
        "info",
        `Simulation initialized using ${state.algorithm}.`
    );

    addLog(
        "info",
        `${state.virtualPages} virtual pages, ${state.physicalFrames} physical frames, page size ${state.pageSize} bytes.`
    );

    setSystemStatus("Ready");

}


// ========================================================
// UTILITY
// ========================================================

function clamp(value, min, max) {

    return Math.max(
        min,
        Math.min(
            max,
            value
        )
    );

}


function parseReferenceString(value) {

    return value
        .trim()
        .split(/[\s,]+/)
        .map(Number)
        .filter(
            n =>
                Number.isInteger(n) &&
                n >= 0 &&
                n < state.virtualPages
        );

}


// ========================================================
// RENDER EVERYTHING
// ========================================================

function renderEverything() {

    renderVirtualMemory();

    renderPhysicalMemory();

    renderPageTable();

    renderReferenceString();

    updateStats();

}


// ========================================================
// VIRTUAL MEMORY
// ========================================================

function renderVirtualMemory() {

    virtualMemory.innerHTML = "";

    for (
        let page = 0;
        page < state.virtualPages;
        page++
    ) {

        const cell =
            document.createElement("div");

        cell.className =
            "memory-cell";

        cell.dataset.page =
            page;

        const color =
            colors[
                page % colors.length
            ];

        const loadedFrame =
            state.frames.indexOf(page);

        if (
            loadedFrame !== -1
        ) {

            cell.classList.add(
                "active"
            );

        }

        cell.innerHTML = `

            <span class="cell-number">
                PAGE ${page}
            </span>

            <div
                class="page-icon"
                style="
                    background:
                    linear-gradient(
                        135deg,
                        ${color[0]},
                        ${color[1]}
                    );
                "
            >
                ${page}
            </div>

            <span class="page-name">
                ${
                    loadedFrame !== -1
                        ? `Frame ${loadedFrame}`
                        : "Not in RAM"
                }
            </span>

        `;

        cell.addEventListener(
            "click",
            () => {

                const address =
                    page *
                    state.pageSize;

                virtualAddress.value =
                    address;

                translateAddress(
                    address
                );

            }
        );

        virtualMemory.appendChild(
            cell
        );

    }

}


// ========================================================
// PHYSICAL MEMORY
// ========================================================

function renderPhysicalMemory(
    activeFrame = -1,
    faultFrame = -1
) {

    physicalMemory.innerHTML = "";

    state.frames.forEach(
        (page, frame) => {

            const cell =
                document.createElement("div");

            cell.className =
                "memory-cell";

            cell.dataset.frame =
                frame;

            if (
                frame === activeFrame
            ) {

                cell.classList.add(
                    "active"
                );

            }

            if (
                frame === faultFrame
            ) {

                cell.classList.add(
                    "fault"
                );

            }

            if (
                page === null
            ) {

                cell.classList.add(
                    "empty"
                );

                cell.innerHTML = `

                    <span class="cell-number">
                        FRAME ${frame}
                    </span>

                    <div class="page-icon">
                        -
                    </div>

                    <span class="page-name">
                        Empty
                    </span>

                `;

            } else {

                const color =
                    colors[
                        page %
                        colors.length
                    ];

                cell.innerHTML = `

                    <span class="cell-number">
                        FRAME ${frame}
                    </span>

                    <div
                        class="page-icon"
                        style="
                            background:
                            linear-gradient(
                                135deg,
                                ${color[0]},
                                ${color[1]}
                            );
                        "
                    >
                        ${page}
                    </div>

                    <span class="page-name">
                        Page ${page}
                    </span>

                `;

            }

            physicalMemory.appendChild(
                cell
            );

        }
    );

}


// ========================================================
// PAGE TABLE
// ========================================================

function renderPageTable(
    highlightedPage = -1
) {

    pageTableBody.innerHTML = "";

    for (
        let page = 0;
        page < state.virtualPages;
        page++
    ) {

        const frame =
            state.frames.indexOf(
                page
            );

        const valid =
            frame !== -1;

        const row =
            document.createElement("tr");

        row.dataset.page =
            page;

        if (
            page === highlightedPage
        ) {

            row.classList.add(
                "highlight"
            );

        }

        let last =
            state.lastUsed[page];

        if (
            last === undefined
        ) {

            last = "-";

        } else {

            last =
                last + 1;

        }

        row.innerHTML = `

            <td>
                Page ${page}
            </td>

            <td class="frame-value">
                ${
                    valid
                        ? `Frame ${frame}`
                        : "-"
                }
            </td>

            <td class="${
                valid
                    ? "valid"
                    : "invalid"
            }">

                ${valid ? "1" : "0"}

            </td>

            <td>

                ${
                    valid
                        ? "Present"
                        : "Not Present"
                }

            </td>

            <td>
                ${last}
            </td>

        `;

        pageTableBody.appendChild(
            row
        );

    }

}


// ========================================================
// REFERENCE STRING
// ========================================================

function renderReferenceString(
    resultIndex = -1,
    resultType = ""
) {

    referenceList.innerHTML = "";

    state.referenceString.forEach(
        (page, index) => {

            const item =
                document.createElement("div");

            item.className =
                "reference-item";

            item.textContent =
                page;

            if (
                index ===
                state.currentReferenceIndex
            ) {

                item.classList.add(
                    "current"
                );

            }

            if (
                index === resultIndex
            ) {

                item.classList.add(
                    resultType
                );

            }

            referenceList.appendChild(
                item
            );

        }
    );

}


// ========================================================
// ADDRESS TRANSLATION
// ========================================================

function translateAddress(
    address
) {

    address =
        Number(address);

    const size =
        state.pageSize;


    // Validate

    const maxAddress =
        state.virtualPages *
        size -
        1;


    if (
        !Number.isInteger(address) ||
        address < 0 ||
        address > maxAddress
    ) {

        showTranslationError(
            `Invalid address. Valid range is 0 to ${maxAddress}.`
        );

        return;

    }


    // -----------------------------------------
    // Calculate page and offset
    // -----------------------------------------

    const page =
        Math.floor(
            address / size
        );

    const offset =
        address % size;


    displayVirtualAddress.textContent =
        address;

    displayPageNumber.textContent =
        page;

    displayOffset.textContent =
        offset;


    resultPage.textContent =
        page;

    resultOffset.textContent =
        offset;


    activateProcessStep(1);


    // -----------------------------------------
    // Page table lookup
    // -----------------------------------------

    const frame =
        state.frames.indexOf(
            page
        );


    renderPageTable(
        page
    );


    highlightVirtualPage(
        page
    );


    if (
        frame === -1
    ) {

        // Page fault

        resultFrame.textContent =
            "FAULT";

        resultPhysical.textContent =
            "-";

        setTranslationError(
            `Page ${page} is not in physical memory. Page fault occurred.`
        );

        activateProcessStep(2);

        return;

    }


    // -----------------------------------------
    // Physical address
    // -----------------------------------------

    const physical =
        frame *
        size +
        offset;


    resultFrame.textContent =
        frame;

    resultPhysical.textContent =
        physical;


    highlightPhysicalFrame(
        frame
    );


    setTranslationSuccess(
        `Translation successful: Page ${page} → Frame ${frame}.`
    );


    activateProcessStep(5);


    addLog(
        "hit",
        `VA ${address} → Page ${page}, Offset ${offset} → Frame ${frame} → PA ${physical}.`
    );

}


// ========================================================
// PAGE FAULT + ADDRESS TRANSLATION
// ========================================================

function translateWithPageFault(
    address
) {

    const size =
        state.pageSize;

    const page =
        Math.floor(
            address / size
        );

    const offset =
        address % size;


    const existingFrame =
        state.frames.indexOf(
            page
        );


    // Already loaded

    if (
        existingFrame !== -1
    ) {

        const physical =
            existingFrame *
            size +
            offset;

        resultPage.textContent =
            page;

        resultOffset.textContent =
            offset;

        resultFrame.textContent =
            existingFrame;

        resultPhysical.textContent =
            physical;

        renderPageTable(
            page
        );

        renderPhysicalMemory(
            existingFrame
        );

        setTranslationSuccess(
            `Page ${page} is already in Frame ${existingFrame}.`
        );

        return;

    }


    // Page fault

    setTranslationError(
        `Page ${page} is not present. Handling page fault...`
    );


    addLog(
        "fault",
        `PAGE FAULT: Page ${page} is not present in RAM.`
    );


    const frame =
        selectReplacementFrame();


    const oldPage =
        state.frames[frame];


    state.frames[frame] =
        page;


    state.lastUsed[page] =
        state.currentReferenceIndex >= 0
            ? state.currentReferenceIndex
            : 0;


    renderPhysicalMemory(
        frame,
        frame
    );


    renderPageTable(
        page
    );


    if (
        oldPage === null
    ) {

        addLog(
            "fault",
            `Page ${page} loaded into empty Frame ${frame}.`
        );

    } else {

        addLog(
            "fault",
            `Page ${page} replaced Page ${oldPage} in Frame ${frame}.`
        );

    }


    // Recalculate

    const physical =
        frame *
        size +
        offset;


    resultPage.textContent =
        page;

    resultOffset.textContent =
        offset;

    resultFrame.textContent =
        frame;

    resultPhysical.textContent =
        physical;


    highlightVirtualPage(
        page
    );

    highlightPhysicalFrame(
        frame
    );


    setTranslationSuccess(
        `Page fault handled. Page ${page} → Frame ${frame}. Physical Address = ${physical}.`
    );


    activateProcessStep(5);

}


// ========================================================
// REPLACEMENT ALGORITHM
// ========================================================

function selectReplacementFrame() {

    // Empty frame

    const empty =
        state.frames.indexOf(
            null
        );

    if (
        empty !== -1
    ) {

        return empty;

    }


    // -----------------------------------------
    // FIFO
    // -----------------------------------------

    if (
        state.algorithm ===
        "FIFO"
    ) {

        const frame =
            state.fifoPointer;

        state.fifoPointer =
            (
                state.fifoPointer + 1
            ) %
            state.physicalFrames;

        return frame;

    }


    // -----------------------------------------
    // LRU
    // -----------------------------------------

    if (
        state.algorithm ===
        "LRU"
    ) {

        let selected =
            0;

        let oldest =
            Infinity;

        state.frames.forEach(
            (page, frame) => {

                const used =
                    state.lastUsed[
                        page
                    ];

                const time =
                    used === undefined
                        ? -1
                        : used;

                if (
                    time < oldest
                ) {

                    oldest =
                        time;

                    selected =
                        frame;

                }

            }
        );

        return selected;

    }


    // -----------------------------------------
    // OPTIMAL
    // -----------------------------------------

    if (
        state.algorithm ===
        "OPTIMAL"
    ) {

        let selected =
            0;

        let farthest =
            -1;


        state.frames.forEach(
            (page, frame) => {

                let nextUse =
                    Infinity;


                for (
                    let i =
                        state.currentReferenceIndex + 1;

                    i <
                        state.referenceString.length;

                    i++
                ) {

                    if (
                        state.referenceString[i] ===
                        page
                    ) {

                        nextUse =
                            i;

                        break;

                    }

                }


                if (
                    nextUse >
                    farthest
                ) {

                    farthest =
                        nextUse;

                    selected =
                        frame;

                }

            }
        );


        return selected;

    }


    return 0;

}


// ========================================================
// PROCESS REFERENCE
// ========================================================

function processNextReference() {

    if (
        state.referenceString.length === 0
    ) {

        addLog(
            "fault",
            "Reference string is empty."
        );

        return;

    }


    if (
        state.currentReferenceIndex >=
        state.referenceString.length - 1
    ) {

        stopAutoRun();

        setSystemStatus(
            "Completed"
        );

        addLog(
            "info",
            "Reference string completed."
        );

        return;

    }


    state.currentReferenceIndex++;


    const page =
        state.referenceString[
            state.currentReferenceIndex
        ];


    state.accessCount++;


    const address =
        page *
        state.pageSize;


    // Page already present?

    const existingFrame =
        state.frames.indexOf(
            page
        );


    if (
        existingFrame !== -1
    ) {

        state.pageHits++;

        state.lastUsed[page] =
            state.currentReferenceIndex;


        const physical =
            existingFrame *
            state.pageSize;


        renderPhysicalMemory(
            existingFrame
        );


        renderPageTable(
            page
        );


        renderReferenceString(
            state.currentReferenceIndex,
            "hit"
        );


        resultPage.textContent =
            page;

        resultOffset.textContent =
            0;

        resultFrame.textContent =
            existingFrame;

        resultPhysical.textContent =
            physical;


        displayVirtualAddress.textContent =
            address;

        displayPageNumber.textContent =
            page;

        displayOffset.textContent =
            0;


        setTranslationSuccess(
            `PAGE HIT: Page ${page} is already in Frame ${existingFrame}.`
        );


        addLog(
            "hit",
            `Access ${state.accessCount}: Page ${page} found in Frame ${existingFrame}.`
        );


        highlightVirtualPage(
            page
        );

        highlightPhysicalFrame(
            existingFrame
        );


    } else {

        state.pageFaults++;


        renderReferenceString(
            state.currentReferenceIndex,
            "fault"
        );


        displayVirtualAddress.textContent =
            address;

        displayPageNumber.textContent =
            page;

        displayOffset.textContent =
            0;


        const frame =
            selectReplacementFrame();


        const oldPage =
            state.frames[frame];


        state.frames[frame] =
            page;


        state.lastUsed[page] =
            state.currentReferenceIndex;


        renderPhysicalMemory(
            frame,
            frame
        );


        renderPageTable(
            page
        );


        resultPage.textContent =
            page;

        resultOffset.textContent =
            0;

        resultFrame.textContent =
            frame;


        const physical =
            frame *
            state.pageSize;


        resultPhysical.textContent =
            physical;


        setTranslationSuccess(
            `PAGE FAULT: Page ${page} loaded into Frame ${frame}. Physical Address = ${physical}.`
        );


        if (
            oldPage === null
        ) {

            addLog(
                "fault",
                `Access ${state.accessCount}: Page ${page} loaded into empty Frame ${frame}.`
            );

        } else {

            addLog(
                "fault",
                `Access ${state.accessCount}: Page ${page} replaced Page ${oldPage} in Frame ${frame}.`
            );

        }


        highlightVirtualPage(
            page
        );

        highlightPhysicalFrame(
            frame
        );

    }


    updateStats();

    setSystemStatus(
        "Running"
    );

}


// ========================================================
// TRANSLATE BUTTON
// ========================================================

translateBtn.addEventListener(
    "click",
    () => {

        translateAddress(
            Number(
                virtualAddress.value
            )
        );

    }
);


// Enter key

virtualAddress.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Enter"
        ) {

            translateAddress(
                Number(
                    virtualAddress.value
                )
            );

        }

    }
);


// ========================================================
// VIRTUAL PAGE CLICK
// ========================================================

function highlightVirtualPage(
    page
) {

    document
        .querySelectorAll(
            "#virtualMemory .memory-cell"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "active"
                );

                if (
                    Number(
                        cell.dataset.page
                    ) === page
                ) {

                    cell.classList.add(
                        "active"
                    );

                }

            }
        );

}


// ========================================================
// PHYSICAL FRAME HIGHLIGHT
// ========================================================

function highlightPhysicalFrame(
    frame
) {

    document
        .querySelectorAll(
            "#physicalMemory .memory-cell"
        )
        .forEach(
            cell => {

                cell.classList.remove(
                    "active"
                );

                if (
                    Number(
                        cell.dataset.frame
                    ) === frame
                ) {

                    cell.classList.add(
                        "active"
                    );

                }

            }
        );

}


// ========================================================
// TRANSLATION STATUS
// ========================================================

function setTranslationSuccess(
    message
) {

    translationStatus.textContent =
        message;

    translationStatus.className =
        "translation-status success";

}


function setTranslationError(
    message
) {

    translationStatus.textContent =
        message;

    translationStatus.className =
        "translation-status error";

}


function showTranslationError(
    message
) {

    setTranslationError(
        message
    );

    resultPage.textContent =
        "-";

    resultOffset.textContent =
        "-";

    resultFrame.textContent =
        "-";

    resultPhysical.textContent =
        "-";

}


// ========================================================
// CLEAR TRANSLATION
// ========================================================

function clearTranslation() {

    displayVirtualAddress.textContent =
        virtualAddress.value || "0";

    displayPageNumber.textContent =
        "-";

    displayOffset.textContent =
        "-";


    resultPage.textContent =
        "-";

    resultOffset.textContent =
        "-";

    resultFrame.textContent =
        "-";

    resultPhysical.textContent =
        "-";


    translationStatus.textContent =
        "Enter a virtual address and click Translate Address.";

    translationStatus.className =
        "translation-status";


    document
        .querySelectorAll(
            ".translation-box"
        )
        .forEach(
            box => {

                box.classList.remove(
                    "success",
                    "error"
                );

            }
        );


    resetProcessSteps();

}


// ========================================================
// PROCESS STEPS
// ========================================================

function resetProcessSteps() {

    document
        .querySelectorAll(
            ".process-step"
        )
        .forEach(
            step => {

                step.classList.remove(
                    "active",
                    "completed"
                );

            }
        );

}


function activateProcessStep(
    step
) {

    const steps =
        document.querySelectorAll(
            ".process-step"
        );


    steps.forEach(
        (element, index) => {

            element.classList.remove(
                "active",
                "completed"
            );


            if (
                index <
                step - 1
            ) {

                element.classList.add(
                    "completed"
                );

            }


            if (
                index ===
                step - 1
            ) {

                element.classList.add(
                    "active"
                );

            }

        }
    );

}


// ========================================================
// STATISTICS
// ========================================================

function updateStats() {

    accessCount.textContent =
        state.accessCount;

    faultCount.textContent =
        state.pageFaults;

    hitCount.textContent =
        state.pageHits;


    const total =
        state.pageHits +
        state.pageFaults;


    const ratio =
        total === 0
            ? 0
            : (
                state.pageHits /
                total
            ) *
            100;


    hitRatio.textContent =
        ratio.toFixed(1) +
        "%";

}


// ========================================================
// LOG
// ========================================================

function addLog(
    type,
    message
) {

    const entry =
        document.createElement(
            "div"
        );

    entry.className =
        "log-entry";


    const number =
        log.children.length + 1;


    entry.innerHTML = `

        <span class="log-number">
            ${number}
        </span>

        <span
            class="log-icon ${type}"
        ></span>

        <span class="log-text">
            ${escapeHTML(message)}
        </span>

    `;


    log.prepend(
        entry
    );

}


// ========================================================
// ESCAPE HTML
// ========================================================

function escapeHTML(
    value
) {

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// ========================================================
// LOAD REFERENCE
// ========================================================

loadReferenceBtn.addEventListener(
    "click",
    () => {

        const values =
            parseReferenceString(
                referenceInput.value
            );


        if (
            values.length === 0
        ) {

            addLog(
                "fault",
                "No valid page references were found."
            );

            return;

        }


        state.referenceString =
            values;

        state.currentReferenceIndex =
            -1;

        state.pageFaults =
            0;

        state.pageHits =
            0;

        state.accessCount =
            0;

        state.frames =
            new Array(
                state.physicalFrames
            ).fill(null);

        state.fifoPointer =
            0;

        state.lastUsed =
            {};


        renderEverything();

        clearTranslation();


        addLog(
            "info",
            `Loaded reference string: ${values.join(" → ")}`
        );


        setSystemStatus(
            "Ready"
        );

    }
);


// ========================================================
// NEXT STEP
// ========================================================

stepBtn.addEventListener(
    "click",
    processNextReference
);


// ========================================================
// AUTO RUN
// ========================================================

autoBtn.addEventListener(
    "click",
    () => {

        if (
            state.autoRunning
        ) {

            stopAutoRun();

        } else {

            startAutoRun();

        }

    }
);


function startAutoRun() {

    if (
        state.referenceString.length === 0
    ) {

        return;

    }


    state.autoRunning =
        true;


    autoBtn.textContent =
        "■ Stop";

    autoBtn.classList.remove(
        "auto"
    );

    autoBtn.classList.add(
        "stop"
    );


    setSystemStatus(
        "Auto Running"
    );


    state.autoTimer =
        setInterval(
            () => {

                if (
                    state.currentReferenceIndex >=
                    state.referenceString.length - 1
                ) {

                    stopAutoRun();

                    return;

                }


                processNextReference();

            },
            1000
        );

}


function stopAutoRun() {

    state.autoRunning =
        false;


    if (
        state.autoTimer
    ) {

        clearInterval(
            state.autoTimer
        );

    }


    state.autoTimer =
        null;


    autoBtn.textContent =
        "▶ Auto Run";

    autoBtn.classList.remove(
        "stop"
    );

    autoBtn.classList.add(
        "auto"

    );

}


// ========================================================
// RANDOM REFERENCE STRING
// ========================================================

randomBtn.addEventListener(
    "click",
    () => {

        const length =
            12;


        const values = [];


        for (
            let i = 0;
            i < length;
            i++
        ) {

            values.push(
                Math.floor(
                    Math.random() *
                    state.virtualPages
                )
            );

        }


        referenceInput.value =
            values.join(" ");


        loadReferenceBtn.click();

    }
);


// ========================================================
// NEW SIMULATION
// ========================================================

newSimulationBtn.addEventListener(
    "click",
    () => {

        initialize();

    }
);


// ========================================================
// RESET
// ========================================================

resetBtn.addEventListener(
    "click",
    () => {

        state.frames =
            new Array(
                state.physicalFrames
            ).fill(null);

        state.currentReferenceIndex =
            -1;

        state.pageFaults =
            0;

        state.pageHits =
            0;

        state.accessCount =
            0;

        state.fifoPointer =
            0;

        state.lastUsed =
            {};

        stopAutoRun();

        renderEverything();

        clearTranslation();

        log.innerHTML = "";

        addLog(
            "info",
            "Simulation reset."
        );

        setSystemStatus(
            "Ready"
        );

    }
);


// ========================================================
// CLEAR LOG
// ========================================================

clearLogBtn.addEventListener(
    "click",
    () => {

        log.innerHTML = "";

    }
);


// ========================================================
// CONFIGURATION CHANGE
// ========================================================

pageSize.addEventListener(
    "change",
    () => {

        initialize();

    }
);


virtualPages.addEventListener(
    "change",
    () => {

        virtualPages.value =
            clamp(
                Number(
                    virtualPages.value
                ),
                4,
                16
            );

        initialize();

    }
);


physicalFrames.addEventListener(
    "change",
    () => {

        physicalFrames.value =
            clamp(
                Number(
                    physicalFrames.value
                ),
                2,
                8
            );

        initialize();

    }
);


algorithm.addEventListener(
    "change",
    () => {

        state.algorithm =
            algorithm.value;

        addLog(
            "info",
            `Replacement algorithm changed to ${state.algorithm}.`
        );

    }
);


// ========================================================
// SYSTEM STATUS
// ========================================================

function setSystemStatus(
    text
) {

    systemStatus.textContent =
        text;

}


// ========================================================
// INITIAL START
// ========================================================

initialize();
