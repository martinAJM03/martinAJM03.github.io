// --- Configuration ---
const API_KEY = "e88fbaeaee5254c8c9b67b1d5836af0b"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL_SMALL = "https://image.tmdb.org/t/p/w300"; 
const IMG_URL_LARGE = "https://image.tmdb.org/t/p/w500"; 
const IMG_URL_ORIGINAL = "https://image.tmdb.org/t/p/original";
const VIDKING_URL = "https://vidking.net";
const APP_TITLE = "Lensloria - Stream Movies & TV";
const HISTORY_KEY = "lensloria_watch_history";
const WATCHLIST_KEY = "lensloria_watchlist";
const SETTINGS_KEY = "lensloria_settings";

// --- State ---
let currentState = {
    type: 'all', 
    genreId: null,
    genreName: '',
    page: 1,
    isLoading: false,
    hasMore: true
};

let currentDetailsItem = null; 
let currentPlayingItem = null;
let currentSelectedSeason = 1; 
let currentSeasonsData = []; 
let userSettings = { dataSaver: false, autoplay: true };

// --- DOM Elements ---
const elements = {
    navbar: document.getElementById('navbar'),
    mobileNavbar: document.getElementById('mobile-navbar'),
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
    emptyState: document.getElementById('empty-state'),
    genreList: document.getElementById('genre-list'),
    genreContainer: document.getElementById('genre-container'),
    deskSearchInput: document.getElementById('desk-search-input'),
    deskSearchResults: document.getElementById('desk-search-results'),
    mobSearchInput: document.getElementById('mobile-search-input'),
    mobSearchResults: document.getElementById('mobile-search-results'),
    mobSearchBar: document.getElementById('mobile-search-bar'),
    
    // Header Actions
    sectionTitle: document.getElementById('section-title'),
    headerActionBtn: document.getElementById('header-action-btn'),

    // More Menu Elements
    moreMenu: document.getElementById('more-menu'),
    mobBtnMore: document.getElementById('mob-btn-more'),

    // Details Modal Elements
    detailsModal: document.getElementById('details-modal'),
    detailsModalContent: document.getElementById('details-modal-content'),
    detailsHeader: document.getElementById('details-header'),
    stickyTitle: document.getElementById('sticky-title'),
    detailsBackdrop: document.getElementById('details-backdrop'),
    detailsTitle: document.getElementById('details-title'),
    detailsDesc: document.getElementById('details-description'),
    detailsBadges: document.getElementById('details-badges'),
    detailsTvSection: document.getElementById('details-tv-section'),
    detailsPlayBtn: document.getElementById('details-play-btn'),
    detailsWatchlistBtn: document.getElementById('details-watchlist-btn'),
    detailsPlayText: document.getElementById('play-btn-text'),
    
    // Season Selector
    seasonSelectorBtn: document.getElementById('season-selector-btn'),
    seasonSelectorText: document.getElementById('season-selector-text'),
    seasonModal: document.getElementById('season-modal'),
    seasonListContainer: document.getElementById('season-list-container'),
    
    episodesList: document.getElementById('episodes-list'),
    headerSeasonContainer: document.getElementById('season-sticky-bar'),

    // Player Modal Elements
    videoModal: document.getElementById('video-modal'),
    videoFrame: document.getElementById('video-frame'),
    iframeLoader: document.getElementById('iframe-loader'),
    
    continueSection: document.getElementById('continue-watching-section'),
    continueList: document.getElementById('continue-watching-list'),
    toast: document.getElementById('toast'),
    toastMsg: document.getElementById('toast-msg')
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    adjustPadding();
    window.addEventListener('resize', adjustPadding);
    
    attachNavListeners();
    setupMoreMenu();
    safeEventListener('mob-search-toggle', 'click', () => toggleMobileSearch());
    safeEventListener('setting-datasaver', 'change', () => toggleSetting('dataSaver'));
    
    // Sticky Header Logic
    if(elements.detailsModalContent) {
        elements.detailsModalContent.addEventListener('scroll', () => {
            const titleBottom = elements.detailsTitle.offsetTop + elements.detailsTitle.offsetHeight;
            const scrollTop = elements.detailsModalContent.scrollTop;
            
            if (scrollTop > titleBottom) {
                elements.detailsHeader.classList.add('bg-black/90', 'backdrop-blur-md', 'shadow-md', 'border-zinc-800');
                elements.detailsHeader.classList.remove('border-transparent');
                elements.stickyTitle.classList.remove('opacity-0');
            } else {
                elements.detailsHeader.classList.remove('bg-black/90', 'backdrop-blur-md', 'shadow-md', 'border-zinc-800');
                elements.detailsHeader.classList.add('border-transparent');
                elements.stickyTitle.classList.add('opacity-0');
            }
        });
    }

    // Season Selector Listener
    safeEventListener('season-selector-btn', 'click', openSeasonModal);

    safeEventListener('details-play-btn', 'click', () => {
        if (!currentDetailsItem) return;
        const history = getHistory()[currentDetailsItem.id];
        if (currentDetailsItem.media_type === 'tv') {
            const s = history?.season || currentSelectedSeason || 1;
            const e = history?.episode || 1;
            playContent(currentDetailsItem, s, e);
        } else {
            playContent(currentDetailsItem);
        }
    });
    
    safeEventListener('details-watchlist-btn', 'click', () => {
        if (!currentDetailsItem) return;
        toggleWatchlist(currentDetailsItem);
    });

    switchType('all'); 
    setupInfiniteScroll();
    setupSearch('desk-search-input', 'desk-search-results');
    setupSearch('mobile-search-input', 'mobile-search-results');
});

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
        'desk-btn-all': 'all', 'desk-btn-movie': 'movie', 'desk-btn-tv': 'tv',
        'desk-btn-history': 'history', 'desk-btn-watchlist': 'watchlist', 'desk-btn-settings': 'settings',
        'mob-btn-all': 'all', 'mob-btn-movie': 'movie', 'mob-btn-tv': 'tv',
        'logo-btn': 'all'
    };
    for (const [id, type] of Object.entries(btns)) {
        safeEventListener(id, 'click', () => {
            closeDetailsModal(true);
            closeVideoModal();
            closeMoreMenu();
            switchType(type);
        });
    }
}

function setupMoreMenu() {
    const toggleMenu = (e) => {
        e.stopPropagation();
        const menu = elements.moreMenu;
        const isOpen = menu.classList.contains('open');
        if (isOpen) {
            closeMoreMenu();
        } else {
            menu.classList.remove('hidden');
            void menu.offsetWidth; 
            menu.classList.add('open');
            // Mobile positioning
            menu.style.bottom = '70px';
            menu.style.top = 'auto';
            menu.style.right = '10px';
            menu.style.transformOrigin = 'bottom right';
        }
    };

    if(elements.mobBtnMore) elements.mobBtnMore.onclick = (e) => toggleMenu(e);
    
    document.addEventListener('click', (e) => {
        if (!elements.moreMenu.contains(e.target)) closeMoreMenu();
    });
}

function closeMoreMenu() {
    elements.moreMenu.classList.remove('open');
    setTimeout(() => elements.moreMenu.classList.add('hidden'), 200);
}

function loadSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if(saved) userSettings = JSON.parse(saved);
    const dsEl = document.getElementById('setting-datasaver');
    if(dsEl) dsEl.checked = userSettings.dataSaver;
}

function toggleSetting(key) {
    userSettings[key] = !userSettings[key];
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(userSettings));
    showToast(`${key === 'dataSaver' ? 'Data Saver' : 'Setting'} ${userSettings[key] ? 'Enabled' : 'Disabled'}`);
}

// --- Watchlist & History Logic ---
function getHistory() { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '{}'); }
function getWatchlist() { return JSON.parse(localStorage.getItem(WATCHLIST_KEY) || '{}'); }

function saveToHistory(item, season = null, episode = null) {
    const history = getHistory();
    history[item.id] = {
        id: item.id,
        type: item.media_type || (season ? 'tv' : 'movie'),
        title: item.title || item.name,
        poster_path: item.poster_path,
        vote_average: item.vote_average,
        release_date: item.release_date || item.first_air_date,
        season: season,
        episode: episode,
        timestamp: Date.now()
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    if(currentState.type === 'all') updateContinueWatching();
}

function toggleWatchlist(item) {
    const list = getWatchlist();
    if (list[item.id]) {
        delete list[item.id];
        showToast("Removed from Watchlist");
    } else {
        list[item.id] = {
            id: item.id,
            media_type: item.media_type,
            title: item.title || item.name,
            poster_path: item.poster_path,
            vote_average: item.vote_average,
            release_date: item.release_date || item.first_air_date,
            timestamp: Date.now()
        };
        showToast("Added to Watchlist");
    }
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
    updateWatchlistButtonState(item.id);
    if(currentState.type === 'watchlist') loadLocalContent('watchlist');
}

function updateWatchlistButtonState(id) {
    const list = getWatchlist();
    const btn = elements.detailsWatchlistBtn;
    if (list[id]) {
        btn.classList.add('watchlist-btn-active', 'text-yellow-500', 'border-yellow-500');
        btn.innerHTML = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
    } else {
        btn.classList.remove('watchlist-btn-active', 'text-yellow-500', 'border-yellow-500');
        btn.innerHTML = `<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>`;
    }
}

function clearHistoryData() {
    if(confirm("Clear entire watch history?")) {
        localStorage.removeItem(HISTORY_KEY);
        if (currentState.type === 'all') updateContinueWatching();
        if (currentState.type === 'history') loadLocalContent('history');
        showToast("History cleared!");
    }
}

function clearWatchlistData() {
    if(confirm("Clear entire watchlist?")) {
        localStorage.removeItem(WATCHLIST_KEY);
        if (currentState.type === 'watchlist') loadLocalContent('watchlist');
        showToast("Watchlist cleared!");
    }
}

function getImageUrl(path, type = 'small') {
    if(!path) return 'https://via.placeholder.com/300x450';
    if(userSettings.dataSaver) return `https://image.tmdb.org/t/p/w300${path}`;
    if(type === 'original') return `${IMG_URL_ORIGINAL}${path}`;
    return type === 'large' ? `${IMG_URL_LARGE}${path}` : `${IMG_URL_SMALL}${path}`;
}

function updateContinueWatching() {
    const section = elements.continueSection;
    const list = elements.continueList;
    
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
    addScrollButtons(section, list);
}

// --- Navigation Logic ---
function switchType(type) {
    closeDetailsModal(true);
    closeMoreMenu();
    
    if (currentState.type === type && type !== 'all') return;
    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('text-purple-500', 'text-white');
        btn.classList.add('text-zinc-400');
    });

    // Handle Active States for Nav
    if(['all', 'movie', 'tv', 'history', 'watchlist', 'settings'].includes(type)) {
        const deskId = `desk-btn-${type}`;
        const deskEl = document.getElementById(deskId);
        if(deskEl) deskEl.classList.add('active');

        // Mobile Nav Highlights
        if (['all', 'movie', 'tv'].includes(type)) {
             const mobId = `mob-btn-${type}`;
             const mobEl = document.getElementById(mobId);
             if(mobEl) {
                 mobEl.classList.add('text-purple-500', 'text-white');
                 mobEl.classList.remove('text-zinc-400');
             }
        } else if (['watchlist', 'history', 'settings'].includes(type)) {
             if(elements.mobBtnMore) {
                 elements.mobBtnMore.classList.add('text-purple-500', 'text-white');
                 elements.mobBtnMore.classList.remove('text-zinc-400');
             }
        }
    }

    currentState.type = type;
    currentState.page = 1;
    currentState.hasMore = true;
    currentState.genreId = null;
    currentState.genreName = '';

    [elements.homeView, elements.categoryView, elements.gridView, elements.settingsView, elements.genreContainer].forEach(el => el.classList.add('hidden'));
    elements.headerActionBtn.classList.add('hidden');
    // Clear listeners
    const newBtn = elements.headerActionBtn.cloneNode(true);
    elements.headerActionBtn.parentNode.replaceChild(newBtn, elements.headerActionBtn);
    elements.headerActionBtn = newBtn;

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
    } else if (type === 'watchlist' || type === 'history') {
        elements.gridView.classList.remove('hidden');
        elements.contextualRowSection.classList.add('hidden');
        elements.sectionTitle.textContent = type === 'watchlist' ? 'My Watchlist' : 'Watch History';
        
        elements.headerActionBtn.textContent = type === 'watchlist' ? 'Clear Watchlist' : 'Clear History';
        elements.headerActionBtn.classList.remove('hidden');
        elements.headerActionBtn.addEventListener('click', type === 'watchlist' ? clearWatchlistData : clearHistoryData);

        elements.grid.innerHTML = '';
        loadLocalContent(type);
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

// --- Data Loading ---
function loadHomeData() {
    const container = document.getElementById('home-rows-container');
    container.innerHTML = ''; 
    const rows = [
        { title: "Trending Movies Today", url: `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`, type: 'movie' },
        { title: "Trending Series Today", url: `${BASE_URL}/trending/tv/day?api_key=${API_KEY}`, type: 'tv' },
        { title: "Popular Movies", url: `${BASE_URL}/movie/popular?api_key=${API_KEY}`, type: 'movie' },
        { title: "Popular Series", url: `${BASE_URL}/tv/popular?api_key=${API_KEY}`, type: 'tv' },
    ];

    rows.forEach(row => {
        const wrapper = document.createElement('div');
        wrapper.className = "animate-fade-in group/row relative";
        const listDiv = document.createElement('div');
        listDiv.className = "flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x min-h-[160px] scroll-smooth";
        wrapper.innerHTML = `<h2 class="text-lg font-bold text-white mb-3 pl-3 border-l-4 border-purple-600">${row.title}</h2>`;
        wrapper.appendChild(listDiv);
        container.appendChild(wrapper);
        fetchRow(row.url, null, row.type, listDiv);
        addScrollButtons(wrapper, listDiv);
    });
}

async function loadContent() {
    if (['watchlist', 'history', 'settings'].includes(currentState.type)) return;
    if (currentState.isLoading || !currentState.hasMore) return;
    
    currentState.isLoading = true;
    const temp = document.createElement('div');
    temp.id = 'temp-skeletons';
    temp.className = "contents"; 
    temp.innerHTML = getGridSkeletons(12);
    elements.grid.appendChild(temp);
    
    try {
        let url = currentState.type === 'all' ? `${BASE_URL}/trending/all/week?api_key=${API_KEY}&page=${currentState.page}&language=en-US` : (currentState.genreId ? `${BASE_URL}/discover/${currentState.type === 'movie'?'movie':'tv'}?api_key=${API_KEY}&with_genres=${currentState.genreId}&page=${currentState.page}&language=en-US&sort_by=popularity.desc` : `${BASE_URL}/trending/${currentState.type === 'movie'?'movie':'tv'}/week?api_key=${API_KEY}&page=${currentState.page}`);
        const response = await fetch(url);
        const data = await response.json();
        if(document.getElementById('temp-skeletons')) document.getElementById('temp-skeletons').remove();
        
        if (data.results) {
            const validResults = data.results.filter(item => item.poster_path);
            if (validResults.length === 0) currentState.hasMore = false;
            else { renderCards(validResults); currentState.page++; }
        } else {
             currentState.hasMore = false;
        }
    } catch (error) { 
        if(document.getElementById('temp-skeletons')) document.getElementById('temp-skeletons').remove(); 
    } finally { currentState.isLoading = false; }
}

function loadLocalContent(type) {
    elements.grid.innerHTML = '';
    elements.emptyState.classList.add('hidden');
    let items = [];
    
    if (type === 'watchlist') {
        items = Object.values(getWatchlist()).sort((a, b) => b.timestamp - a.timestamp);
    } else if (type === 'history') {
        items = Object.values(getHistory()).sort((a, b) => b.timestamp - a.timestamp);
    }
    
    if (items.length === 0) {
        elements.emptyState.classList.remove('hidden');
        return;
    }
    
    renderCards(items);
    currentState.hasMore = false; 
}

// --- Rendering ---
function renderCards(items) {
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = "group/card relative w-full overflow-hidden rounded-xl bg-zinc-900 shadow-xl cursor-pointer transition-all duration-300 active:scale-95 hover:z-10";
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
        const typeLabel = item.media_type || item.type || (currentState.type !== 'all' ? currentState.type : 'movie');
        
        card.innerHTML = `
            <div class="relative w-full aspect-[2/3]">
                <img src="${getImageUrl(item.poster_path, 'large')}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-110">
                <div class="absolute top-2 right-2 bg-black/60 backdrop-blur-md rounded-md px-1.5 py-0.5 flex items-center gap-1 border border-white/10">
                    <span class="text-yellow-400 text-[10px]">★</span>
                    <span class="text-white text-[10px] font-bold">${rating}</span>
                </div>
                ${(currentState.type === 'all' || currentState.type === 'watchlist' || currentState.type === 'history') ? `<div class="absolute top-2 left-2 bg-purple-600/80 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-sm">${typeLabel === 'tv' ? 'TV' : 'Movie'}</div>` : ''}
            </div>
            <div class="p-2.5">
                <h3 class="text-white text-xs md:text-sm font-semibold truncate leading-tight">${title}</h3>
                <span class="text-zinc-500 text-[10px] md:text-xs mt-0.5 block">${year}</span>
            </div>
        `;
        card.onclick = () => {
            if(!item.media_type) item.media_type = (item.type || (currentState.type !== 'all' && currentState.type !== 'watchlist' && currentState.type !== 'history' ? currentState.type : 'movie'));
            openDetailsModal(item);
        };
        elements.grid.appendChild(card);
    });
}

function createMiniCard(item, type, isHistory = false) {
    const div = document.createElement('div');
    div.className = "flex-none w-28 md:w-36 relative group/card cursor-pointer snap-start";
    const progressLabel = isHistory && item.season ? `S${item.season}:E${item.episode}` : (item.release_date || item.first_air_date || '').split('-')[0];

    div.innerHTML = `
        <div class="aspect-[2/3] rounded-lg overflow-hidden bg-zinc-900 relative shadow-lg">
            <img src="${getImageUrl(item.poster_path, 'small')}" class="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-110" loading="lazy">
            <div class="absolute top-1 right-1 bg-black/60 backdrop-blur rounded px-1.5 py-0.5 text-[10px] text-yellow-400 font-bold">★ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</div>
            ${isHistory ? `<div class="absolute bottom-0 left-0 w-full h-1 bg-zinc-700"><div class="h-full bg-purple-500 w-full"></div></div>` : ''}
        </div>
        <div class="mt-2">
            <h4 class="text-xs font-medium truncate text-zinc-200 group-hover/card:text-purple-400 transition-colors">${item.title || item.name}</h4>
            <p class="text-[10px] text-zinc-500">${progressLabel}</p>
        </div>
    `;
    div.onclick = () => {
        const fullItem = { ...item, media_type: type };
        openDetailsModal(fullItem);
    };
    return div;
}

// --- Details Modal ---
async function openDetailsModal(item) {
    currentDetailsItem = item;
    const title = item.title || item.name;
    const isTv = (item.media_type === 'tv' || (!item.media_type && item.first_air_date));
    currentDetailsItem.media_type = isTv ? 'tv' : 'movie'; 

    elements.detailsTitle.textContent = title;
    elements.stickyTitle.textContent = title; 
    elements.detailsDesc.textContent = item.overview || "Loading details...";
    elements.detailsBackdrop.src = getImageUrl(item.backdrop_path || item.poster_path, 'original');
    
    elements.detailsBadges.innerHTML = '';
    elements.detailsBadges.appendChild(createBadge(isTv ? 'TV Series' : 'Movie', 'text-white border-white/40 bg-white/10'));
    
    updateWatchlistButtonState(item.id);

    const date = item.release_date || item.first_air_date;
    if (date) {
        const year = date.split('-')[0];
        if(year) elements.detailsBadges.appendChild(createBadge(year, 'text-zinc-300 border-zinc-600 bg-zinc-800', 'badge-year'));
    }
    
    if (item.vote_average) {
        elements.detailsBadges.appendChild(createBadge(`★ ${item.vote_average.toFixed(1)}`, 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'));
    }

    if (isTv) {
        elements.detailsTvSection.classList.remove('hidden');
        elements.detailsPlayText.textContent = "Loading History...";
        setupTvDetails(item.id, item);
    } else {
        elements.detailsTvSection.classList.add('hidden');
        elements.detailsPlayText.textContent = "Play Movie";
    }

    elements.detailsModal.classList.remove('hidden');
    document.body.classList.add('no-scroll'); 
    elements.detailsModalContent.scrollTop = 0;
    elements.detailsHeader.classList.remove('bg-black/90', 'backdrop-blur-md', 'shadow-md', 'border-zinc-800');
    elements.detailsHeader.classList.add('border-transparent');
    elements.stickyTitle.classList.add('opacity-0');

    setTimeout(() => { elements.detailsModal.setAttribute('aria-hidden', 'false'); }, 10);
    fetchExtendedDetails(currentDetailsItem.media_type, item.id);
}

function closeDetailsModal(fullClose = false) {
    elements.detailsModal.setAttribute('aria-hidden', 'true'); 
    setTimeout(() => {
        elements.detailsModal.classList.add('hidden');
        if (fullClose) {
            currentDetailsItem = null;
            document.body.classList.remove('no-scroll'); 
        }
    }, 300); 
}

// --- Player Logic ---
function playContent(item, season = null, episode = null) {
    currentPlayingItem = item;
    
    // Hide Mobile Nav when playing
    if(elements.mobileNavbar) elements.mobileNavbar.classList.add('translate-y-full');

    elements.detailsModal.classList.add('hidden');
    elements.videoModal.classList.remove('hidden');
    setTimeout(() => { elements.videoModal.setAttribute('aria-hidden', 'false'); }, 10);
    elements.iframeLoader.classList.remove('hidden');
    
    const isTv = item.media_type === 'tv';
    // FIX: Fallback to "Show" or a generic title to ensure we don't see "undefined" in tab
    const displayTitle = item.name || item.title || "Show";
    document.title = isTv ? `${displayTitle} S${season}:E${episode}` : (displayTitle || "Movie");

    let url = '';
    // FIX: Added playsinline=1 for inline iOS player, mute=1 for autoplay support
    if (isTv) {
        url = `${VIDKING_URL}/embed/tv/${item.id}/${season}/${episode}?autoplay=1&mute=1&playsinline=1`;
        saveToHistory(item, season, episode);
    } else {
        url = `${VIDKING_URL}/embed/movie/${item.id}?autoplay=1&mute=1&playsinline=1`;
        saveToHistory(item);
    }
    
    elements.videoFrame.src = url;
    elements.videoFrame.onload = () => elements.iframeLoader.classList.add('hidden');
}

function closeVideoModal() {
    elements.videoModal.setAttribute('aria-hidden', 'true');
    document.title = APP_TITLE;

    // Show Mobile Nav
    if(elements.mobileNavbar) elements.mobileNavbar.classList.remove('translate-y-full');
    
    setTimeout(() => {
        elements.videoModal.classList.add('hidden');
        elements.videoFrame.src = '';
        currentPlayingItem = null;
        
        if (currentDetailsItem) {
            elements.detailsModal.classList.remove('hidden');
            if (currentDetailsItem.media_type === 'tv') setupTvDetails(currentDetailsItem.id, currentDetailsItem);
        } else {
             document.body.classList.remove('no-scroll');
        }
    }, 300);
}

// --- TV Details & Season Modal ---
async function setupTvDetails(tvId, itemData) {
    elements.episodesList.innerHTML = '<div class="p-4 text-center text-zinc-500 text-xs">Loading episodes...</div>';
    currentSeasonsData = [];
    
    try {
        const response = await fetch(`${BASE_URL}/tv/${tvId}?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        
        const history = getHistory()[tvId];
        let seasonToLoad = 1;
        if (history && history.season) seasonToLoad = history.season;
        else if (data.seasons && data.seasons.length > 0) {
            const first = data.seasons.find(s => s.season_number > 0);
            if(first) seasonToLoad = first.season_number;
        }

        if (history && history.season && history.episode) {
            elements.detailsPlayText.textContent = `Continue S${history.season}:E${history.episode}`;
        } else {
            elements.detailsPlayText.textContent = "Play S1:E1";
        }

        currentSelectedSeason = seasonToLoad;

        if (data.seasons) {
            currentSeasonsData = data.seasons
                .filter(s => s.season_number > 0)
                .sort((a,b) => a.season_number - b.season_number);
            
            elements.seasonSelectorText.textContent = `SEASON ${currentSelectedSeason}`;
            await updateEpisodeListInDetails(tvId, currentSelectedSeason);
        }
    } catch (e) { showToast("Failed to load TV details"); }
}

function openSeasonModal() {
    if(!currentSeasonsData.length) return;
    elements.seasonListContainer.innerHTML = '';
    
    currentSeasonsData.forEach(season => {
        const div = document.createElement('div');
        div.className = `p-4 rounded-xl cursor-pointer transition flex items-center justify-between group ${season.season_number === currentSelectedSeason ? 'bg-zinc-800 border border-purple-500/30' : 'bg-zinc-900/50 hover:bg-zinc-800'}`;
        
        div.innerHTML = `
            <div class="flex flex-col">
                <span class="font-bold text-white text-base group-hover:text-purple-400 transition">Season ${season.season_number}</span>
                <span class="text-xs text-zinc-500 mt-0.5">${season.episode_count || 0} Episodes</span>
            </div>
            ${season.season_number === currentSelectedSeason ? '<svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>' : ''}
        `;
        
        div.onclick = () => {
            currentSelectedSeason = season.season_number;
            elements.seasonSelectorText.textContent = `SEASON ${season.season_number}`;
            closeSeasonModal();
            updateEpisodeListInDetails(currentDetailsItem.id, season.season_number);
        };
        elements.seasonListContainer.appendChild(div);
    });

    elements.seasonModal.classList.remove('hidden');
    setTimeout(() => elements.seasonModal.setAttribute('aria-hidden', 'false'), 10);
}

function closeSeasonModal() {
    elements.seasonModal.setAttribute('aria-hidden', 'true');
    setTimeout(() => elements.seasonModal.classList.add('hidden'), 300);
}

async function updateEpisodeListInDetails(tvId, seasonNum) {
    try {
        elements.episodesList.innerHTML = '<div class="p-4 text-center text-zinc-500 text-xs animate-pulse">Loading...</div>';
        const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
        const data = await res.json();
        
        elements.episodesList.innerHTML = '';
        if(data.episodes) {
            data.episodes.forEach(ep => {
                const row = document.createElement('div');
                row.className = "episode-card flex flex-col gap-2 p-3 rounded-lg cursor-pointer border-l-4 border-transparent";
                
                const history = getHistory()[tvId];
                if (history && history.season == seasonNum && history.episode == ep.episode_number) {
                    row.classList.add('active');
                }

                const imgUrl = ep.still_path ? getImageUrl(ep.still_path, 'small') : null;
                const imgHTML = imgUrl 
                    ? `
                    <div class="relative w-32 aspect-video shrink-0 rounded overflow-hidden bg-zinc-800 group">
                        <img src="${imgUrl}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" loading="lazy">
                        <div class="play-overlay absolute inset-0 flex items-center justify-center bg-black/20 transition-all duration-300">
                             <div class="bg-white/90 rounded-full p-1.5">
                                <svg class="w-3 h-3 text-black fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                             </div>
                        </div>
                    </div>`
                    : `<div class="w-32 aspect-video shrink-0 rounded bg-zinc-800 flex items-center justify-center text-zinc-500 text-[10px]">No Image</div>`;

                const runtime = ep.runtime ? `${ep.runtime} min` : 'N/A';
                const airDate = ep.air_date ? ep.air_date : '';
                const metaString = [airDate, runtime].filter(Boolean).join(' • ');

                row.innerHTML = `
                    <div class="flex gap-3 items-center">
                        ${imgHTML}
                        <h4 class="text-sm font-bold text-gray-100">S${seasonNum} E${ep.episode_number} - ${ep.name}</h4>
                    </div>
                    
                    <p class="text-xs text-zinc-400 leading-tight whitespace-normal">${ep.overview || 'No description available.'}</p>
                    
                    <p class="text-[10px] text-zinc-500 font-medium">${metaString}</p>
                `;
                
                row.onclick = () => playContent(currentDetailsItem, seasonNum, ep.episode_number);
                elements.episodesList.appendChild(row);
            });
        }
    } catch(e) { console.error(e); }
}

// --- Helpers & Shared ---
function getGridSkeletons(count) {
    let html = '';
    for(let i=0; i<count; i++) html += `<div class="rounded-xl overflow-hidden shadow-lg bg-zinc-900 aspect-[2/3] relative skeleton"></div>`;
    return html;
}

function getRowSkeletons(count) {
    let html = '';
    for(let i=0; i<count; i++) html += `<div class="flex-none w-28 md:w-36 aspect-[2/3] rounded-lg bg-zinc-900 skeleton"></div>`;
    return html;
}

function createBadge(text, colorClasses, id = null) {
    const span = document.createElement('span');
    span.className = `px-2 py-1 rounded text-xs border ${colorClasses}`;
    span.textContent = text;
    if(id) span.id = id;
    return span;
}

function addScrollButtons(wrapper, listElement) {
    wrapper.querySelectorAll('.scroll-btn').forEach(b => b.remove());
    const btnClass = "scroll-btn hidden md:flex absolute top-[55%] -translate-y-1/2 z-20 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-opacity opacity-0 group-hover/row:opacity-100 cursor-pointer border border-zinc-600";
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

async function updateContextualRow(type, genreId, genreName) {
    const titleEl = document.getElementById('contextual-row-title');
    titleEl.textContent = genreId ? `Top Rated ${genreName}` : `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'}`;
    addScrollButtons(elements.contextualRowSection, elements.contextualRowList);
    let url = genreId ? `${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${genreId}&sort_by=vote_average.desc&vote_count.gte=300&page=1` : `${BASE_URL}/${type}/top_rated?api_key=${API_KEY}&page=1`;
    fetchRow(url, 'contextual-row-list', type);
}

async function fetchRow(url, containerId, type, element = null) {
    const container = element || document.getElementById(containerId);
    if(!container) return;
    container.innerHTML = getRowSkeletons(6);
    try {
        const res = await fetch(url);
        const data = await res.json();
        container.innerHTML = '';
        if (data.results) {
            data.results.forEach(item => container.appendChild(createMiniCard(item, type)));
        }
    } catch(e) { console.error("Network Error in fetchRow:", e); }
}

async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/${currentState.type}/list?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        elements.genreList.innerHTML = '';
        if (data.genres) {
            data.genres.forEach(genre => {
                const btn = document.createElement('button');
                btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all border bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:text-white`;
                btn.textContent = genre.name;
                btn.onclick = () => {
                    currentState.genreId = genre.id;
                    currentState.genreName = genre.name;
                    currentState.page = 1;
                    currentState.hasMore = true;
                    elements.grid.innerHTML = '';
                    updateContextualRow(currentState.type, genre.id, genre.name);
                    elements.sectionTitle.textContent = `${genre.name} ${currentState.type === 'movie' ? 'Movies' : 'Series'}`;
                    Array.from(elements.genreList.children).forEach(c => c.className = c.className.replace('bg-purple-600', 'bg-zinc-800/50').replace('border-purple-600', 'border-zinc-700'));
                    btn.className = btn.className.replace('bg-zinc-800/50', 'bg-purple-600').replace('border-zinc-700', 'border-purple-600');
                    loadContent();
                };
                elements.genreList.appendChild(btn);
            });
        }
        setTimeout(adjustPadding, 100);
    } catch (e) { showToast("Failed to load genres"); }
}

async function fetchExtendedDetails(type, id) {
    try {
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=en-US&append_to_response=release_dates,content_ratings`);
        const data = await res.json();
        
        if (data.overview && elements.detailsDesc.textContent === "Loading details...") {
            elements.detailsDesc.textContent = data.overview;
        }
        if (data.backdrop_path) {
            elements.detailsBackdrop.src = getImageUrl(data.backdrop_path, 'original');
        }
        
        // Genre Tags
        if(data.genres) {
             data.genres.slice(0, 2).forEach(g => {
                elements.detailsBadges.appendChild(createBadge(g.name, 'text-zinc-400 border-zinc-700 bg-transparent'));
            });
        }
    } catch(e) { console.error(e); }
}

function setupSearch(inputId, resultsId) {
    let debounceTimer;
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
    if (!results) return;
    const filtered = results.filter(item => item.media_type === 'movie' || item.media_type === 'tv').slice(0, 10);
    if (filtered.length === 0) { container.classList.add('hidden'); return; }
    filtered.forEach(item => {
        const div = document.createElement('div');
        div.className = "flex items-center p-3 hover:bg-zinc-800 cursor-pointer border-b border-zinc-800/50 last:border-0 transition-colors";
        div.innerHTML = `<img src="${getImageUrl(item.poster_path, 'small')}" class="w-10 h-14 object-cover rounded mr-3 bg-zinc-800"><div class="overflow-hidden"><h4 class="text-sm font-bold text-white truncate">${item.title || item.name}</h4><span class="text-xs text-zinc-400 capitalize">${item.media_type}</span></div>`;
        div.onclick = () => { 
            openDetailsModal(item); 
            container.classList.add('hidden'); 
            document.getElementById('desk-search-input').value = ''; 
            document.getElementById('mobile-search-input').value = ''; 
            toggleMobileSearch(false); 
        };
        container.appendChild(div);
    });
    container.classList.remove('hidden');
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