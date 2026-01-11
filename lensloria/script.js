// --- Configuration ---
const API_KEY = "e88fbaeaee5254c8c9b67b1d5836af0b"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL_SMALL = "https://image.tmdb.org/t/p/w300"; 
const IMG_URL_LARGE = "https://image.tmdb.org/t/p/w500"; 
const VIDLINK_URL = "https://vidlink.pro";
const APP_TITLE = "Lensloria - Stream Movies & TV";
const HISTORY_KEY = "lensloria_watch_history";
const SETTINGS_KEY = "lensloria_settings";

// --- State ---
let currentState = {
    type: 'all', 
    genreId: null,
    genreName: '',
    page: 1,
    isLoading: false,
    hasMore: true,
    currentShowTitle: ''
};

// Default Settings
let userSettings = {
    dataSaver: false,
    autoplay: true
};

// --- DOM Elements ---
const elements = {
    navbar: document.getElementById('navbar'),
    mainContent: document.getElementById('main-content'),
    homeView: document.getElementById('home-view'),
    homeRows: document.getElementById('home-rows-container'),
    categoryView: document.getElementById('category-view'),
    settingsView: document.getElementById('settings-view'),
    gridView: document.getElementById('grid-view'),
    contextualRowSection: document.getElementById('contextual-row-section'),
    contextualRowList: document.getElementById('contextual-row-list'),
    contextualRowTitle: document.getElementById('contextual-row-title'),
    grid: document.getElementById('content-grid'),
    genreList: document.getElementById('genre-list'),
    genreContainer: document.getElementById('genre-container'),
    deskSearchInput: document.getElementById('desk-search-input'),
    deskSearchResults: document.getElementById('desk-search-results'),
    mobSearchInput: document.getElementById('mobile-search-input'),
    mobSearchResults: document.getElementById('mobile-search-results'),
    mobSearchBar: document.getElementById('mobile-search-bar'),
    videoModal: document.getElementById('video-modal'),
    videoFrame: document.getElementById('video-frame'),
    modalTitle: document.getElementById('modal-title'),
    modalSubtitle: document.getElementById('modal-subtitle'),
    modalDesc: document.getElementById('modal-description'),
    modalTags: document.getElementById('modal-tags'),
    tvControls: document.getElementById('tv-controls'),
    seasonSelect: document.getElementById('season-select'),
    episodeSelect: document.getElementById('episode-select'),
    btnPrevEp: document.getElementById('btn-prev-ep'),
    btnNextEp: document.getElementById('btn-next-ep'),
    iframeLoader: document.getElementById('iframe-loader'),
    continueSection: document.getElementById('continue-watching-section'),
    continueList: document.getElementById('continue-watching-list'),
    sectionTitle: document.getElementById('section-title'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    adjustPadding();
    window.addEventListener('resize', adjustPadding);
    
    // Attach Event Listeners
    attachNavListeners();
    safeEventListener('mob-search-toggle', 'click', () => toggleMobileSearch());
    safeEventListener('close-modal-btn', 'click', closeModal);
    safeEventListener('setting-datasaver', 'change', () => toggleSetting('dataSaver'));
    safeEventListener('setting-autoplay', 'change', () => toggleSetting('autoplay'));
    safeEventListener('btn-clear-history', 'click', clearHistory);
    
    // Episode Navigation Listeners
    safeEventListener('btn-prev-ep', 'click', () => navigateEpisode(-1));
    safeEventListener('btn-next-ep', 'click', () => navigateEpisode(1));

    // Initial Load
    switchType('all'); 
    setupInfiniteScroll();
    setupSearch('desk-search-input', 'desk-search-results');
    setupSearch('mobile-search-input', 'mobile-search-results');
});

// Helper for safe listeners
function safeEventListener(id, event, func) {
    const el = document.getElementById(id);
    if(el) el.addEventListener(event, func);
}

function adjustPadding() {
    const navbar = document.getElementById('navbar');
    const mainContent = document.getElementById('main-content');
    if(navbar && mainContent) {
        const navHeight = navbar.offsetHeight;
        mainContent.style.paddingTop = `${navHeight + 10}px`;
    }
}

function attachNavListeners() {
    const btns = {
        'desk-btn-all': 'all', 'desk-btn-movie': 'movie', 'desk-btn-tv': 'tv', 'desk-btn-settings': 'settings',
        'mob-btn-all': 'all', 'mob-btn-movie': 'movie', 'mob-btn-tv': 'tv', 'mob-btn-settings': 'settings',
        'logo-btn': 'all'
    };
    
    for (const [id, type] of Object.entries(btns)) {
        safeEventListener(id, 'click', () => {
            closeModal();
            switchType(type);
        });
    }
}

// --- Settings Logic ---
function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if(saved) userSettings = JSON.parse(saved);
    const dsEl = document.getElementById('setting-datasaver');
    const apEl = document.getElementById('setting-autoplay');
    if(dsEl) dsEl.checked = userSettings.dataSaver;
    if(apEl) apEl.checked = userSettings.autoplay;
}

function toggleSetting(key) {
    userSettings[key] = !userSettings[key];
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    showToast(`${key === 'dataSaver' ? 'Data Saver' : 'Autoplay'} ${userSettings[key] ? 'Enabled' : 'Disabled'}`);
}

function clearHistory() {
    if(confirm("Are you sure you want to clear your watch history?")) {
        localStorage.removeItem(HISTORY_KEY);
        // If user is on home screen, update the UI immediately
        if (currentState.type === 'all') {
             updateContinueWatching();
        }
        showToast("History cleared!");
    }
}

// Image URL Getter
function getImageUrl(path, type = 'small') {
    if(!path) return 'https://via.placeholder.com/300x450';
    if(userSettings.dataSaver) return `https://image.tmdb.org/t/p/w300${path}`;
    return type === 'large' ? `https://image.tmdb.org/t/p/w500${path}` : `https://image.tmdb.org/t/p/w300${path}`;
}

// --- History Logic ---
function getHistory() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }

function saveToHistory(item, season = null, episode = null) {
    const history = getHistory();
    history[item.id] = {
        id: item.id,
        type: item.media_type || (season ? 'tv' : 'movie'),
        title: item.title || item.name,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        season: season,
        episode: episode,
        timestamp: Date.now()
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    if(currentState.type === 'all') updateContinueWatching();
}

function updateContinueWatching() {
    const section = document.getElementById('continue-watching-section');
    const list = document.getElementById('continue-watching-list');
    
    if (currentState.type !== 'all') {
        section.classList.add('hidden');
        return;
    }
    const history = getHistory();
    const items = Object.values(history).sort((a, b) => b.timestamp - a.timestamp);
    if (items.length === 0) { section.classList.add('hidden'); return; }
    
    section.classList.remove('hidden');
    list.innerHTML = '';
    items.forEach(item => list.appendChild(createMiniCard(item, item.type, true)));
    
    // Add Scroll Buttons
    addScrollButtons(section, list);
}

// --- Home Rows Data ---
function loadHomeData() {
    const container = document.getElementById('home-rows-container');
    container.innerHTML = ''; 
    const rows = [
        { title: "Trending Movies Today", url: `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`, type: 'movie' },
        { title: "Trending Series Today", url: `${BASE_URL}/trending/tv/day?api_key=${API_KEY}`, type: 'tv' },
        { title: "Popular Movies", url: `${BASE_URL}/movie/popular?api_key=${API_KEY}`, type: 'movie' },
        { title: "Popular Series", url: `${BASE_URL}/tv/popular?api_key=${API_KEY}`, type: 'tv' },
        { title: "Top Rated Movies", url: `${BASE_URL}/movie/top_rated?api_key=${API_KEY}`, type: 'movie' },
        { title: "Top Rated Series", url: `${BASE_URL}/tv/top_rated?api_key=${API_KEY}`, type: 'tv' },
    ];

    rows.forEach(row => {
        const wrapper = document.createElement('div');
        wrapper.className = "animate-fade-in group/row relative";
        const listDiv = document.createElement('div');
        listDiv.className = "flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x min-h-[160px] scroll-smooth";
        
        wrapper.innerHTML = `
            <h2 class="text-lg font-bold text-white mb-3 pl-3 border-l-4 border-purple-600">${row.title}</h2>
        `;
        wrapper.appendChild(listDiv);
        container.appendChild(wrapper);
        
        fetchRow(row.url, null, row.type, listDiv);
        addScrollButtons(wrapper, listDiv);
    });
}

// Helper: Add horizontal scroll buttons
function addScrollButtons(wrapper, listElement) {
    wrapper.querySelectorAll('.scroll-btn').forEach(b => b.remove());

    const btnClass = "scroll-btn hidden md:flex absolute top-[55%] -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover/row:opacity-100 cursor-pointer border border-gray-600";
    
    const leftBtn = document.createElement('button');
    leftBtn.className = `${btnClass} left-2`;
    leftBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>`;
    leftBtn.onclick = () => listElement.scrollBy({ left: -400, behavior: 'smooth' });

    const rightBtn = document.createElement('button');
    rightBtn.className = `${btnClass} right-2`;
    rightBtn.innerHTML = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>`;
    rightBtn.onclick = () => listElement.scrollBy({ left: 400, behavior: 'smooth' });

    wrapper.appendChild(leftBtn);
    wrapper.appendChild(rightBtn);
}

// --- Contextual Row (Inside Movies/TV Tabs) ---
async function updateContextualRow(type, genreId, genreName) {
    const titleEl = document.getElementById('contextual-row-title');
    const title = genreId ? `Top Rated ${genreName}` : `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'}`;
    titleEl.textContent = title;
    
    addScrollButtons(elements.contextualRowSection, elements.contextualRowList);

    let url;
    if (genreId) {
        url = `${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=300&page=1`;
    } else {
        url = `${BASE_URL}/${type}/top_rated?api_key=${API_KEY}&page=1`;
    }
    fetchRow(url, 'contextual-row-list', type);
}

// --- Fetch Helper ---
async function fetchRow(url, containerId, type, element = null) {
    const container = element || document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = getRowSkeletons(6);
    try {
        const res = await fetch(url);
        const data = await res.json();
        container.innerHTML = '';
        data.results.forEach(item => container.appendChild(createMiniCard(item, type)));
    } catch(e) { console.error(e); }
}

function createMiniCard(item, type, isHistory = false) {
    const div = document.createElement('div');
    // Using group/card to ensure this element's hover effects are isolated
    div.className = "flex-none w-28 md:w-36 relative group/card cursor-pointer snap-start";
    const progressLabel = isHistory && item.season ? `S${item.season}:E${item.episode}` : (item.release_date || item.first_air_date || '').split('-')[0];

    div.innerHTML = `
        <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 relative shadow-lg">
            <img src="${getImageUrl(item.poster_path, 'small')}" class="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110" loading="lazy">
            <div class="absolute top-1 right-1 bg-black/60 backdrop-blur rounded px-1.5 py-0.5 text-[10px] text-yellow-400 font-bold">★ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</div>
            ${isHistory ? `<div class="absolute bottom-0 left-0 w-full h-1 bg-gray-700"><div class="h-full bg-purple-500 w-full"></div></div>` : ''}
        </div>
        <div class="mt-2">
            <h4 class="text-xs font-medium truncate text-gray-200 group-hover/card:text-purple-400 transition-colors">${item.title || item.name}</h4>
            <p class="text-[10px] text-gray-500">${progressLabel}</p>
        </div>
    `;
    div.onclick = () => openPlayer({...item, media_type: type});
    return div;
}

function getRowSkeletons(count) {
    let html = '';
    for(let i=0; i<count; i++) html += `<div class="flex-none w-28 md:w-36 aspect-[2/3] rounded-lg bg-gray-900 skeleton"></div>`;
    return html;
}

// --- Navigation Logic ---
function switchType(type) {
    if (currentState.type === type && type !== 'all') return;
    
    // UI Resets
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    
    // Mobile Button Logic
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-purple-500', 'text-white');
        btn.classList.add('text-gray-400');
    });

    // Active State Desktop
    const deskId = type === 'all' ? 'desk-btn-all' : type === 'settings' ? 'desk-btn-settings' : `desk-btn-${type}`;
    const deskEl = document.getElementById(deskId);
    if(deskEl) deskEl.classList.add('active');

    // Active State Mobile
    const mobId = type === 'all' ? 'mob-btn-all' : type === 'settings' ? 'mob-btn-settings' : `mob-btn-${type}`;
    const mobEl = document.getElementById(mobId);
    if(mobEl) {
        mobEl.classList.add('text-purple-500', 'text-white');
        mobEl.classList.remove('text-gray-400');
    }

    currentState.type = type;
    currentState.page = 1;
    currentState.hasMore = true;
    currentState.genreId = null;
    currentState.genreName = '';

    // View Switching Logic
    [elements.homeView, elements.categoryView, elements.gridView, elements.settingsView, elements.genreContainer].forEach(el => el.classList.add('hidden'));
    
    if (type === 'settings') {
        elements.settingsView.classList.remove('hidden');
    } else if (type === 'all') {
        elements.homeView.classList.remove('hidden');
        elements.gridView.classList.remove('hidden'); 
        elements.contextualRowSection.classList.add('hidden');
        elements.sectionTitle.textContent = "Overall Trending";
        updateContinueWatching();
        loadHomeData();
        elements.grid.innerHTML = '';
        loadContent();
    } else {
        elements.genreContainer.classList.remove('hidden');
        elements.homeView.classList.add('hidden');
        elements.categoryView.classList.remove('hidden'); 
        elements.gridView.classList.remove('hidden'); 
        elements.contextualRowSection.classList.remove('hidden');
        elements.sectionTitle.textContent = type === 'movie' ? "Trending Movies" : "Trending Series";
        
        fetchGenres();
        updateContextualRow(type, null); 
        elements.grid.innerHTML = '';
        loadContent();
    }
    
    adjustPadding();
    window.scrollTo(0,0);
}

function toggleMobileSearch(forceOpen = false) {
    if (forceOpen) {
        elements.mobSearchBar.classList.remove('hidden');
        elements.mobSearchInput.focus();
    } else {
        elements.mobSearchBar.classList.toggle('hidden');
        if (!elements.mobSearchBar.classList.contains('hidden')) elements.mobSearchInput.focus();
    }
    adjustPadding();
}

// --- Genres ---
async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/${currentState.type}/list?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        
        elements.genreList.innerHTML = '';
        data.genres.forEach(genre => {
            const btn = document.createElement('button');
            btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all border bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white`;
            btn.textContent = genre.name;
            btn.onclick = () => {
                currentState.genreId = genre.id;
                currentState.genreName = genre.name;
                currentState.page = 1;
                currentState.hasMore = true;
                elements.grid.innerHTML = '';
                
                updateContextualRow(currentState.type, genre.id, genre.name);
                elements.sectionTitle.textContent = `${genre.name} ${currentState.type === 'movie' ? 'Movies' : 'Series'}`;
                
                Array.from(elements.genreList.children).forEach(c => c.className = c.className.replace('bg-purple-600', 'bg-gray-800/50').replace('border-purple-600', 'border-gray-700'));
                btn.className = btn.className.replace('bg-gray-800/50', 'bg-purple-600').replace('border-gray-700', 'border-purple-600');
                
                loadContent();
            };
            elements.genreList.appendChild(btn);
        });
        setTimeout(adjustPadding, 100);
    } catch (e) { showToast("Failed to load genres"); }
}

// --- Infinite Scroll Grid ---
async function loadContent() {
    if (currentState.isLoading || !currentState.hasMore) return;
    currentState.isLoading = true;
    
    const temp = document.createElement('div');
    temp.id = 'temp-skeletons';
    temp.className = "contents"; 
    temp.innerHTML = getGridSkeletons(12);
    elements.grid.appendChild(temp);

    try {
        let url;
        if (currentState.type === 'all') {
            url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}&page=${currentState.page}&language=en-US`;
        } else {
            const endpoint = currentState.type === 'movie' ? 'movie' : 'tv';
            if (currentState.genreId) {
                // Filter by Genre
                url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&with_genres=${currentState.genreId}&page=${currentState.page}&language=en-US&sort_by=popularity.desc`;
            } else {
                // Default Trending
                url = `${BASE_URL}/trending/${endpoint}/week?api_key=${API_KEY}&page=${currentState.page}`;
            }
        }
        
        const response = await fetch(url);
        const data = await response.json();

        document.getElementById('temp-skeletons').remove();

        const validResults = data.results.filter(item => item.poster_path);

        if (validResults.length === 0) {
            currentState.hasMore = false;
        } else {
            renderCards(validResults);
            currentState.page++;
        }
    } catch (error) {
        if(document.getElementById('temp-skeletons')) document.getElementById('temp-skeletons').remove();
    } finally {
        currentState.isLoading = false;
    }
}

function getGridSkeletons(count) {
    let html = '';
    for(let i=0; i<count; i++) html += `<div class="rounded-xl overflow-hidden shadow-lg bg-gray-900 aspect-[2/3] relative skeleton"></div>`;
    return html;
}

function renderCards(items) {
    items.forEach(item => {
        const card = document.createElement('div');
        // Use group/card for isolation
        card.className = "group/card relative w-full overflow-hidden rounded-xl bg-gray-900 shadow-xl cursor-pointer transition-all duration-300 active:scale-95 hover:z-10";
        
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        // Larger Image for Vertical Grid
        card.innerHTML = `
            <div class="relative w-full aspect-[2/3]">
                <img src="${getImageUrl(item.poster_path, 'large')}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110">
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 flex items-center gap-1 border border-white/10">
                    <span class="text-yellow-400 text-[10px]">★</span>
                    <span class="text-white text-[10px] font-bold">${rating}</span>
                </div>
                ${currentState.type === 'all' ? `<div class="absolute top-2 left-2 bg-purple-600/80 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">${(item.media_type || 'movie') === 'tv' ? 'TV' : 'Movie'}</div>` : ''}
            </div>
            <div class="p-2.5">
                <h3 class="text-white text-xs md:text-sm font-semibold truncate leading-tight">${title}</h3>
                <span class="text-gray-500 text-[10px] md:text-xs mt-0.5 block">${year}</span>
            </div>
        `;

        card.onclick = () => {
            if(!item.media_type && currentState.type !== 'all') item.media_type = currentState.type;
            openPlayer(item);
        };
        elements.grid.appendChild(card);
    });
}

// --- Player & Details Fetch ---
function createBadge(text, colorClasses) {
    const span = document.createElement('span');
    span.className = `px-2 py-1 rounded text-xs border ${colorClasses}`;
    span.textContent = text;
    return span;
}

async function fetchDetails(type, id) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=en-US&append_to_response=release_dates,content_ratings`);
        const data = await res.json();
       
        // Extract Content Rating
        let rating = '';
        if (type === 'movie' && data.release_dates && data.release_dates.results) {
            const usRelease = data.release_dates.results.find(r => r.iso_3166_1 === 'US');
            if (usRelease) {
                const cert = usRelease.release_dates.find(d => d.certification !== '');
                if (cert) rating = cert.certification;
            }
        } else if (type === 'tv' && data.content_ratings && data.content_ratings.results) {
            const usRating = data.content_ratings.results.find(r => r.iso_3166_1 === 'US');
            if (usRating) rating = usRating.rating;
        }

        if (rating) {
             elements.modalTags.appendChild(createBadge(rating, 'text-white border-white/40 bg-white/10'));
        }
        
        // Append Genres
        if(data.genres) {
            data.genres.forEach(g => {
                elements.modalTags.appendChild(createBadge(g.name, 'text-gray-300 border-gray-700 bg-gray-800'));
            });
        }

        if(data.overview) elements.modalDesc.textContent = data.overview;

    } catch(e) { console.error(e); }
}

async function openPlayer(item) {
    elements.videoModal.classList.remove('hidden');
    setTimeout(() => { elements.videoModal.setAttribute('aria-hidden', 'false'); }, 10);

    const title = item.title || item.name;
    elements.modalTitle.textContent = title;
    const date = item.release_date || item.first_air_date || '';
    elements.modalSubtitle.textContent = date.split('-')[0];
    elements.modalDesc.textContent = item.overview || "Loading details...";
    
    document.title = title;
    currentState.currentShowTitle = title;

    elements.modalTags.innerHTML = '';
    
    if (item.vote_average) {
        elements.modalTags.appendChild(createBadge(`★ ${item.vote_average.toFixed(1)}`, 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'));
    }
    
    let mediaType = item.media_type;
    if(!mediaType) mediaType = currentState.type === 'tv' || item.first_air_date ? 'tv' : 'movie';
    
    const typeLabel = mediaType === 'tv' ? 'TV Series' : 'Movie';
    elements.modalTags.appendChild(createBadge(typeLabel, 'text-purple-400 border-purple-500/30 bg-purple-500/10'));

    fetchDetails(mediaType, item.id);

    elements.iframeLoader.classList.remove('hidden');
    
    if (mediaType === 'movie') {
        elements.tvControls.classList.add('hidden');
        elements.tvControls.classList.remove('flex');
        elements.videoFrame.onload = () => elements.iframeLoader.classList.add('hidden');
        elements.videoFrame.src = `${VIDLINK_URL}/movie/${item.id}?nextbutton=true`;
        saveToHistory(item); 
    } else {
        elements.tvControls.classList.remove('hidden');
        elements.tvControls.classList.add('flex');
        await setupTvControls(item.id, item);
    }
}

// Current Item tracking for navigation
let currentTvItem = null;

async function setupTvControls(tvId, itemData) {
    currentTvItem = itemData; // Store for nav buttons
    elements.seasonSelect.innerHTML = '';
    elements.episodeSelect.innerHTML = '';
    
    try {
        const response = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        
        const history = getHistory();
        const lastWatched = history[tvId];
        const defaultSeason = lastWatched?.season || 1;
        const defaultEpisode = lastWatched?.episode || 1;

        data.seasons.filter(s => s.season_number > 0).forEach(season => {
            const opt = document.createElement('option');
            opt.value = season.season_number;
            opt.textContent = `Season ${season.season_number}`;
            if(season.season_number == defaultSeason) opt.selected = true;
            elements.seasonSelect.appendChild(opt);
        });

        await updateEpisodeList(tvId, elements.seasonSelect.value, defaultEpisode, itemData);

        elements.seasonSelect.onchange = () => updateEpisodeList(tvId, elements.seasonSelect.value, 1, itemData);
        elements.episodeSelect.onchange = () => {
            const s = elements.seasonSelect.value;
            const e = elements.episodeSelect.value;
            playEpisode(tvId, s, e, itemData);
        };

    } catch (e) { showToast("Failed to load TV details"); }
}

async function updateEpisodeList(tvId, seasonNum, defaultEp = 1, itemData) {
    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
        const data = await res.json();
        
        elements.episodeSelect.innerHTML = '';
        data.episodes.forEach(ep => {
            const opt = document.createElement('option');
            opt.value = ep.episode_number;
            opt.textContent = `E${ep.episode_number}: ${ep.name}`;
            if(ep.episode_number == defaultEp) opt.selected = true;
            elements.episodeSelect.appendChild(opt);
        });
        
        // Handle 'last' keyword for moving to previous season
        let targetEp = defaultEp;
        if(defaultEp === 'last' && data.episodes.length > 0) {
            targetEp = data.episodes[data.episodes.length - 1].episode_number;
        } else if (defaultEp === 'first' && data.episodes.length > 0) {
             targetEp = data.episodes[0].episode_number;
        }

        // Auto select target
        if(data.episodes.length > 0) {
            const exists = data.episodes.find(ep => ep.episode_number == targetEp);
            const finalEp = exists ? targetEp : data.episodes[0].episode_number;
            elements.episodeSelect.value = finalEp;
            playEpisode(tvId, seasonNum, finalEp, itemData);
        }
    } catch(e) { console.error(e); }
}

function updateNavButtonsState() {
    const sSel = elements.seasonSelect;
    const eSel = elements.episodeSelect;
    
    // Safety check
    if (!sSel.options.length || !eSel.options.length) return;

    const isFirstSeason = sSel.selectedIndex === 0;
    const isLastSeason = sSel.selectedIndex === sSel.options.length - 1;
    const isFirstEp = eSel.selectedIndex === 0;
    const isLastEp = eSel.selectedIndex === eSel.options.length - 1;

    elements.btnPrevEp.disabled = isFirstSeason && isFirstEp;
    elements.btnNextEp.disabled = isLastSeason && isLastEp;
}

function navigateEpisode(direction) {
    const sSel = elements.seasonSelect;
    const eSel = elements.episodeSelect;
    
    if(!currentTvItem) return;

    const currentEpIndex = eSel.selectedIndex;
    const currentSeasonIndex = sSel.selectedIndex;

    // NEXT Logic
    if (direction === 1) {
        if (currentEpIndex < eSel.options.length - 1) {
            // Next Episode in current season
            eSel.selectedIndex++;
            playEpisode(currentTvItem.id, sSel.value, eSel.value, currentTvItem);
        } else if (currentSeasonIndex < sSel.options.length - 1) {
            // Next Season, First Episode
            sSel.selectedIndex++;
            updateEpisodeList(currentTvItem.id, sSel.value, 'first', currentTvItem);
        }
    } 
    // PREV Logic
    else {
        if (currentEpIndex > 0) {
            // Prev Episode in current season
            eSel.selectedIndex--;
            playEpisode(currentTvItem.id, sSel.value, eSel.value, currentTvItem);
        } else if (currentSeasonIndex > 0) {
            // Prev Season, Last Episode
            sSel.selectedIndex--;
            updateEpisodeList(currentTvItem.id, sSel.value, 'last', currentTvItem);
        }
    }
}

function playEpisode(tvId, season, episode, itemData) {
    elements.iframeLoader.classList.remove('hidden');
    elements.videoFrame.src = `${VIDLINK_URL}/tv/${tvId}/${season}/${episode}?nextbutton=true`;
    elements.videoFrame.onload = () => elements.iframeLoader.classList.add('hidden');
    document.title = `${currentState.currentShowTitle} - S${season}:E${episode}`;
    saveToHistory(itemData, season, episode);
    
    elements.episodeSelect.value = episode;
    updateNavButtonsState();
}

function closeModal() {
    elements.videoModal.setAttribute('aria-hidden', 'true');
    document.title = APP_TITLE;
    setTimeout(() => {
        elements.videoModal.classList.add('hidden');
        elements.videoFrame.src = '';
    }, 300);
}

// --- Utils: Search ---
let debounceTimer;
function setupSearch(inputId, resultsId) {
    const inputEl = document.getElementById(inputId);
    const resultsEl = document.getElementById(resultsId);
    if(!inputEl || !resultsEl) return;

    inputEl.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        if (!query) { resultsEl.classList.add('hidden'); return; }
        debounceTimer = setTimeout(async () => {
            try {
                const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${query}&page=1&include_adult=false`);
                const data = await res.json();
                renderSearchResults(data.results, resultsEl);
            } catch (err) { console.error(err); }
        }, 350);
    });
    document.addEventListener('click', (e) => {
        if (!inputEl.contains(e.target) && !resultsEl.contains(e.target)) resultsEl.classList.add('hidden');
    });
}

function renderSearchResults(results, container) {
    container.innerHTML = '';
    const filtered = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 10);
    if (filtered.length === 0) { container.classList.add('hidden'); return; }
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800/50 last:border-0 transition-colors";
        div.innerHTML = `<img src="${getImageUrl(item.poster_path, 'small')}" class="w-10 h-14 object-cover rounded mr-3 bg-gray-800"><div class="overflow-hidden"><h4 class="text-sm font-bold text-white truncate">${item.title || item.name}</h4><span class="text-xs text-gray-400 capitalize">${item.media_type}</span></div>`;
        div.onclick = () => { 
            openPlayer(item); 
            container.classList.add('hidden'); 
            document.getElementById('desk-search-input').value = ''; 
            document.getElementById('mobile-search-input').value = ''; 
            toggleMobileSearch(false); 
        };
        container.appendChild(div);
    });
    container.classList.remove('hidden');
}

function setupInfiniteScroll() {
    const sentinel = document.getElementById('sentinel');
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && currentState.hasMore && !currentState.isLoading) {
            loadContent();
        }
    }, { rootMargin: '400px' });
    observer.observe(sentinel);
}

function showToast(msg) {
    elements.toastMsg.textContent = msg;
    elements.toast.classList.remove('opacity-0');
    setTimeout(() => elements.toast.classList.add('opacity-0'), 3000);
}