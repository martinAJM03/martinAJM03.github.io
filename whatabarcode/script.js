// --- Core Logic ---
function adjustValue(delta) {
    const input = document.getElementById('barcodeInput');
    let val = parseInt(input.value, 10);
    if (isNaN(val)) val = 0;
    
    val += delta;
    if (val < 0) val = 0;
    if (val > 9999999999) val = 9999999999;
    
    input.value = val.toString().padStart(10, '0');
    checkAndGenerate();
}

function checkAndGenerate() {
    const input = document.getElementById('barcodeInput').value;
    const errorMsg = document.getElementById('errorMsg');
    const barcodeContainer = document.getElementById('barcodeContainer');

    if (!/^\d{10}$/.test(input)) {
        errorMsg.classList.add('visible');
        barcodeContainer.style.display = 'none';
        return;
    }

    errorMsg.classList.remove('visible');
    barcodeContainer.style.display = 'flex';
    
    // Generate Standard Inline Preview via JsBarcode
    JsBarcode("#barcodeCanvas", `>${input}<`, {
        format: "CODE128",
        width: 3,        
        height: 120,     
        displayValue: true, 
        fontSize: 22,
        textMargin: 8,
        margin: 10,
        background: "#ffffff",
        lineColor: "#000000"
    });
}

// --- Data Fetching (GitHub/Local) ---
async function fetchCoupons() {
    const listEl = document.getElementById('githubList');
    try {
        let res = await fetch('coupons.json');
        if (!res.ok) throw new Error('Local not found');
        let data = await res.json();
        renderList(data.coupons, listEl, false);
    } catch (e) {
        try {
            let res2 = await fetch('https://raw.githubusercontent.com/martinAJM03/martinAJM03.github.io/refs/heads/main/whatabarcode/coupons.json');
            let data2 = await res2.json();
            renderList(data2.coupons, listEl, false);
        } catch (err) {
            listEl.innerHTML = '<div class="empty-state">Failed to load coupons.</div>';
        }
    }
}

// --- Save & Load Logic ---
function saveCurrentBarcode() {
    const input = document.getElementById('barcodeInput').value;
    if (!/^\d{10}$/.test(input)) {
        alert("Please enter a valid 10-digit code before saving.");
        return;
    }

    const saved = JSON.parse(localStorage.getItem('savedBarcodes') || '[]');

    // Duplicate Check
    const isDuplicate = saved.some(item => item.barcode === input);
    if (isDuplicate) {
        alert("This barcode is already saved in your Local Coupons.");
        return;
    }

    // Native system prompt
    const name = prompt("Enter a name for this barcode:");
    
    // Check if user clicked cancel or left it blank
    if (!name || name.trim() === "") return; 

    saved.push({ name: name.trim(), barcode: input });
    localStorage.setItem('savedBarcodes', JSON.stringify(saved));
    
    renderLocalList();
}

function deleteBarcode(index, event) {
    event.stopPropagation();
    const saved = JSON.parse(localStorage.getItem('savedBarcodes') || '[]');
    saved.splice(index, 1);
    localStorage.setItem('savedBarcodes', JSON.stringify(saved));
    renderLocalList();
}

function loadBarcode(code) {
    document.getElementById('barcodeInput').value = code;
    checkAndGenerate();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderLocalList() {
    const listEl = document.getElementById('savedList');
    const saved = JSON.parse(localStorage.getItem('savedBarcodes') || '[]');
    if (saved.length === 0) {
        listEl.innerHTML = '<div class="empty-state">No saved barcodes yet.</div>';
        return;
    }
    renderList(saved, listEl, true);
}

function renderList(items, container, isDeletable) {
    container.innerHTML = '';
    items.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.onclick = () => loadBarcode(item.barcode);
        
        let innerHTML = `
            <div class="item-info">
                <span class="item-name">${item.name}</span>
                <span class="item-code">${item.barcode}</span>
            </div>
        `;
        
        if (isDeletable) {
            innerHTML += `<button class="delete-btn" onclick="deleteBarcode(${index}, event)">Delete</button>`;
        }
        
        div.innerHTML = innerHTML;
        container.appendChild(div);
    });
}

// --- Fullscreen & Physical Drag-to-Dismiss Logic ---
const fsOverlay = document.getElementById('fullscreenContainer');
const fsWrapper = document.getElementById('fullscreenWrapper');

let isDragging = false;
let startX = 0, startY = 0;
let currentTranslateX = 0, currentTranslateY = 0;

function openFullscreen() {
    const input = document.getElementById('barcodeInput').value;
    if (!/^\d{10}$/.test(input)) return;
    
    const isPortrait = window.innerHeight > window.innerWidth;

    // Generate maximum clarity and larger size barcode, encoding the symbols
    JsBarcode("#fullscreenCanvas", `>${input}<`, {
        format: "CODE128",
        width: isPortrait ? 6 : 5, 
        height: isPortrait ? window.innerWidth * 0.6 : window.innerHeight * 0.6, 
        displayValue: true,
        fontSize: 32,
        margin: 20,
        background: "#ffffff",
        lineColor: "#000000"
    });
    
    fsOverlay.classList.add('active');
}

function closeFullscreen() {
    fsOverlay.classList.remove('active');
    setTimeout(() => {
        fsWrapper.style.opacity = '1';
        fsWrapper.style.transform = `translate(0px, 0px)`;
    }, 300);
}

// Capture touches on the overlay
fsOverlay.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return; 
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
    fsWrapper.style.transition = 'none'; 
});

// Prevent background scroll and drag image
fsOverlay.addEventListener('touchmove', (e) => {
    e.preventDefault(); 
    if (!isDragging) return;
    
    currentTranslateX = e.touches[0].clientX - startX;
    currentTranslateY = e.touches[0].clientY - startY;
    
    fsWrapper.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px)`;
}, { passive: false }); 

// Release image
fsOverlay.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    
    fsWrapper.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    
    if (Math.abs(currentTranslateX) > 100 || Math.abs(currentTranslateY) > 100) {
        fsWrapper.style.opacity = '0';
        fsWrapper.style.transform = `translate(${currentTranslateX * 2}px, ${currentTranslateY * 2}px)`; 
        setTimeout(closeFullscreen, 300);
    } else {
        fsWrapper.style.transform = `translate(0px, 0px)`; 
    }
    
    currentTranslateX = 0; 
    currentTranslateY = 0;
});

// --- Init ---
const inputEl = document.getElementById('barcodeInput');
inputEl.addEventListener('input', checkAndGenerate);

window.onload = () => {
    if(!inputEl.value) inputEl.value = "1000132815";
    checkAndGenerate();
    fetchCoupons();
    renderLocalList();
};
