// --- Configuration ---
const API_KEY = "e88fbaeaee5254c8c9b67b1d5836af0b"; 
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL_SMALL = "https://image.tmdb.org/t/p/w300"; 
const IMG_URL_LARGE = "https://image.tmdb.org/t/p/w500"; 
const VIDLINK_URL = "https://vidlink.pro";
const APP_TITLE = "Lensloria - Stream Movies & TV";
const HISTORY_KEY = "lensloria_watch_history";

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

// --- DOM Elements ---
const navbar = document.getElementById('navbar');
const mainContent = document.getElementById('main-content');
const homeView = document.getElementById('home-view');
const homeRowsContainer = document.getElementById('home-rows-container');
const categoryView = document.getElementById('category-view');
const gridView = document.getElementById('grid-view');
const contextualRowSection = document.getElementById('contextual-row-section');
const contextualRowList = document.getElementById('contextual-row-list');
const contextualRowTitle = document.getElementById('contextual-row-title');
const grid = document.getElementById('content-grid');
const genreList = document.getElementById('genre-list');
const genreContainer = document.getElementById('genre-container');
const deskSearchInput = document.getElementById('desk-search-input');
const deskSearchResults = document.getElementById('desk-search-results');
const mobSearchInput = document.getElementById('mobile-search-input');
const mobSearchResults = document.getElementById('mobile-search-results');
const mobSearchBar = document.getElementById('mobile-search-bar');
const videoModal = document.getElementById('video-modal');
const videoFrame = document.getElementById('video-frame');
const modalTitle = document.getElementById('modal-title');
const modalSubtitle = document.getElementById('modal-subtitle');
const modalDescription = document.getElementById('modal-description');
const modalTags = document.getElementById('modal-tags');
const tvControls = document.getElementById('tv-controls');
const seasonSelect = document.getElementById('season-select');
const episodeSelect = document.getElementById('episode-select');
const iframeLoader = document.getElementById('iframe-loader');
const continueWatchingSection = document.getElementById('continue-watching-section');
const continueWatchingList = document.getElementById('continue-watching-list');
const sectionTitle = document.getElementById('section-title');
const settingsView = document.getElementById('settings-view');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    adjustPadding();
    window.addEventListener('resize', adjustPadding);
    switchType('all'); 
    setupInfiniteScroll();
    setupSearch(deskSearchInput, deskSearchResults);
    setupSearch(mobSearchInput, mobSearchResults);
});

function adjustPadding() {
    const navHeight = navbar.offsetHeight;
    mainContent.style.paddingTop = `${navHeight + 10}px`;
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
    if (currentState.type !== 'all') {
        continueWatchingSection.classList.add('hidden');
        return;
    }
    const history = getHistory();
    const items = Object.values(history).sort((a, b) => b.timestamp - a.timestamp);
    if (items.length === 0) { continueWatchingSection.classList.add('hidden'); return; }
    continueWatchingSection.classList.remove('hidden');
    continueWatchingList.innerHTML = '';
    items.forEach(item => continueWatchingList.appendChild(createMiniCard(item, item.type, true)));
}

// --- Settings Logic ---
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


// --- Home Rows Data ---
function loadHomeData() {
    homeRowsContainer.innerHTML = ''; 
    const rows = [
        { title: "Trending Movies Today", url: `${BASE_URL}/trending/movie/day?api_key=${API_KEY}`, type: 'movie' },
        { title: "Trending Series Today", url: `${BASE_URL}/trending/tv/day?api_key=${API_KEY}`, type: 'tv' },
        { title: "Popular Movies", url: `${BASE_URL}/movie/popular?api_key=${API_KEY}`, type: 'movie' },
        { title: "Popular Series", url: `${BASE_URL}/tv/popular?api_key=${API_KEY}`, type: 'tv' },
        { title: "Top Rated Movies", url: `${BASE_URL}/movie/top_rated?api_key=${API_KEY}`, type: 'movie' },
        { title: "Top Rated Series", url: `${BASE_URL}/tv/top_rated?api_key=${API_KEY}`, type: 'tv' },
        { title: "Action Movies", url: `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=28&sort_by=popularity.desc`, type: 'movie' },
        { title: "Comedy Series", url: `${BASE_URL}/discover/tv?api_key=${API_KEY}&with_genres=35&sort_by=popularity.desc`, type: 'tv' },
    ];

    rows.forEach(row => {
        const wrapper = document.createElement('div');
        wrapper.className = "animate-fade-in";
        wrapper.innerHTML = `
            <h2 class="text-lg font-bold text-white mb-3 pl-3 border-l-4 border-purple-600">${row.title}</h2>
            <div class="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x min-h-[160px]" id="row-${Math.random().toString(36).substr(2,9)}"></div>
        `;
        homeRowsContainer.appendChild(wrapper);
        fetchRow(row.url, null, row.type, wrapper.querySelector('div'));
    });
}

// --- Contextual Row (Inside Movies/TV Tabs) ---
async function updateContextualRow(type, genreId, genreName) {
    const title = genreId ? `Top Rated ${genreName}` : `Top Rated ${type === 'movie' ? 'Movies' : 'TV Shows'}`;
    contextualRowTitle.textContent = title;
    
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
    // Compact: w-28 mobile, w-36 desktop
    div.className = "flex-none w-28 md:w-36 relative group cursor-pointer snap-start";
    const progressLabel = isHistory && item.season ? `S${item.season}:E${item.episode}` : (item.release_date || item.first_air_date || '').split('-')[0];

    div.innerHTML = `
        <div class="aspect-[2/3] rounded-lg overflow-hidden bg-gray-900 relative shadow-lg">
            <img src="${IMG_URL_SMALL + item.poster_path}" class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy">
            <div class="absolute top-1 right-1 bg-black/60 backdrop-blur rounded px-1.5 py-0.5 text-[10px] text-yellow-400 font-bold">★ ${item.vote_average ? item.vote_average.toFixed(1) : 'N/A'}</div>
            ${isHistory ? `<div class="absolute bottom-0 left-0 w-full h-1 bg-gray-700"><div class="h-full bg-purple-500 w-full"></div></div>` : ''}
        </div>
        <div class="mt-2">
            <h4 class="text-xs font-medium truncate text-gray-200 group-hover:text-purple-400 transition-colors">${item.title || item.name}</h4>
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
    // Handle specific Nav IDs 
    if (type === 'settings') {
         document.getElementById('desk-btn-settings').classList.add('active');
         // No specific ID for mobile button in this loop context
    } else {
        const deskBtnId = type === 'all' ? 'desk-btn-all' : `desk-btn-${type}`;
        const deskBtn = document.getElementById(deskBtnId);
        if (deskBtn) deskBtn.classList.add('active');
    }

    // Reset Mobile Nav (Assuming IDs exist - adjusted for potential missing IDs in provided HTML)
    // Note: In the provided HTML, I added ID 'mob-btn-settings'.
    // If you haven't updated HTML, this part might need adjustment.
    // Assuming standard IDs: mob-btn-all, mob-btn-movie, mob-btn-tv, mob-btn-settings
    const mobBtns = ['mob-btn-all', 'mob-btn-movie', 'mob-btn-tv', 'mob-btn-settings'];
    mobBtns.forEach(id => {
        const btn = document.getElementById(id);
        if(btn) {
            btn.classList.remove('text-purple-500', 'text-white');
            btn.classList.add('text-gray-400');
        }
    });

    const mobActiveId = type === 'all' ? 'mob-btn-all' : type === 'settings' ? 'mob-btn-settings' : `mob-btn-${type}`;
    const mobActiveBtn = document.getElementById(mobActiveId);
    if(mobActiveBtn) {
        mobActiveBtn.classList.add('text-purple-500', 'text-white');
        mobActiveBtn.classList.remove('text-gray-400');
    }


    currentState.type = type;
    currentState.page = 1;
    currentState.hasMore = true;
    currentState.genreId = null;
    currentState.genreName = '';

    // View Switching
    if (type === 'settings') {
        genreContainer.classList.add('hidden');
        homeView.classList.add('hidden');
        categoryView.classList.add('hidden');
        gridView.classList.add('hidden');
        settingsView.classList.remove('hidden');
    } else if (type === 'all') {
        genreContainer.classList.add('hidden');
        homeView.classList.remove('hidden');
        categoryView.classList.add('hidden');
        gridView.classList.remove('hidden'); // Show overall trending at bottom
        contextualRowSection.classList.add('hidden'); 
        settingsView.classList.add('hidden');
        sectionTitle.textContent = "Overall Trending";
        updateContinueWatching();
        loadHomeData();
        grid.innerHTML = '';
        loadContent();
    } else {
        genreContainer.classList.remove('hidden');
        homeView.classList.add('hidden');
        categoryView.classList.add('hidden'); 
        gridView.classList.remove('hidden');
        contextualRowSection.classList.remove('hidden'); // Show Top Rated row
        settingsView.classList.add('hidden');
        sectionTitle.textContent = type === 'movie' ? "Trending Movies" : "Trending Series";
        
        fetchGenres();
        updateContextualRow(type, null); 
        grid.innerHTML = '';
        loadContent();
    }
    
    adjustPadding();
    window.scrollTo(0,0);
}

function toggleMobileSearch(forceOpen = false) {
    if (forceOpen) {
        mobSearchBar.classList.remove('hidden');
        mobSearchInput.focus();
    } else {
        mobSearchBar.classList.toggle('hidden');
        if (!mobSearchBar.classList.contains('hidden')) mobSearchInput.focus();
    }
    adjustPadding();
}

// --- Genres ---
async function fetchGenres() {
    try {
        const response = await fetch(`${BASE_URL}/genre/${currentState.type}/list?api_key=${API_KEY}&language=en-US`);
        const data = await response.json();
        
        genreList.innerHTML = '';
        data.genres.forEach(genre => {
            const btn = document.createElement('button');
            btn.className = `whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold transition-all border bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white`;
            btn.textContent = genre.name;
            btn.onclick = () => {
                currentState.genreId = genre.id;
                currentState.genreName = genre.name;
                currentState.page = 1;
                currentState.hasMore = true;
                grid.innerHTML = '';
                
                updateContextualRow(currentState.type, genre.id, genre.name);
                sectionTitle.textContent = `${genre.name} ${currentState.type === 'movie' ? 'Movies' : 'Series'}`;
                
                Array.from(genreList.children).forEach(c => c.className = c.className.replace('bg-purple-600', 'bg-gray-800/50').replace('border-purple-600', 'border-gray-700'));
                btn.className = btn.className.replace('bg-gray-800/50', 'bg-purple-600').replace('border-gray-700', 'border-purple-600');
                
                loadContent();
            };
            genreList.appendChild(btn);
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
    grid.appendChild(temp);

    try {
        let url;
        if (currentState.type === 'all') {
            url = `${BASE_URL}/trending/all/week?api_key=${API_KEY}&page=${currentState.page}&language=en-US`;
        } else {
            const endpoint = currentState.type === 'movie' ? 'movie' : 'tv';
            if (currentState.genreId) {
                url = `${BASE_URL}/discover/${endpoint}?api_key=${API_KEY}&with_genres=${currentState.genreId}&page=${currentState.page}&language=en-US&sort_by=popularity.desc`;
            } else {
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
        card.className = "group relative w-full overflow-hidden rounded-xl bg-gray-900 shadow-xl cursor-pointer transition-all duration-300 active:scale-95 hover:z-10";
        
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || '').split('-')[0];
        const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';

        // Larger Image for Vertical Grid
        card.innerHTML = `
            <div class="relative w-full aspect-[2/3]">
                <img src="${IMG_URL_LARGE + item.poster_path}" alt="${title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110">
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
        grid.appendChild(card);
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
        const res = await fetch(`${BASE_URL}/${type}/${id}?api_key=${API_KEY}&language=en-US`);
        const data = await res.json();
        
        if(data.genres) {
            data.genres.forEach(g => {
                modalTags.appendChild(createBadge(g.name, 'text-gray-300 border-gray-700 bg-gray-800'));
            });
        }
        if(data.overview) modalDescription.textContent = data.overview;
    } catch(e) { console.error(e); }
}

async function openPlayer(item) {
    videoModal.classList.remove('hidden');
    setTimeout(() => { videoModal.setAttribute('aria-hidden', 'false'); }, 10);

    const title = item.title || item.name;
    modalTitle.textContent = title;
    const date = item.release_date || item.first_air_date || '';
    modalSubtitle.textContent = date.split('-')[0];
    modalDescription.textContent = item.overview || "Loading details...";
    
    document.title = title;
    currentState.currentShowTitle = title;

    modalTags.innerHTML = '';
    
    if (item.vote_average) {
        modalTags.appendChild(createBadge(`★ ${item.vote_average.toFixed(1)}`, 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'));
    }
    
    let mediaType = item.media_type;
    if(!mediaType) mediaType = currentState.type === 'tv' || item.first_air_date ? 'tv' : 'movie';
    
    const typeLabel = mediaType === 'tv' ? 'TV Series' : 'Movie';
    modalTags.appendChild(createBadge(typeLabel, 'text-purple-400 border-purple-500/30 bg-purple-500/10'));

    fetchDetails(mediaType, item.id);

    iframeLoader.classList.remove('hidden');
    
    if (mediaType === 'movie') {
        tvControls.classList.add('hidden');
        videoFrame.onload = () => iframeLoader.classList.add('hidden');
        videoFrame.src = `${VIDLINK_URL}/movie/${item.id}?nextbutton=true`;
        saveToHistory(item); 
    } else {
        tvControls.classList.remove('hidden');
        await setupTvControls(item.id, item);
    }
}

async function setupTvControls(tvId, itemData) {
    seasonSelect.innerHTML = '';
    episodeSelect.innerHTML = '';
    
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
            seasonSelect.appendChild(opt);
        });

        await updateEpisodeList(tvId, seasonSelect.value, defaultEpisode, itemData);

        seasonSelect.onchange = () => updateEpisodeList(tvId, seasonSelect.value, 1, itemData);
        episodeSelect.onchange = () => {
            const s = seasonSelect.value;
            const e = episodeSelect.value;
            playEpisode(tvId, s, e, itemData);
        };

    } catch (e) { showToast("Failed to load TV details"); }
}

async function updateEpisodeList(tvId, seasonNum, defaultEp = 1, itemData) {
    try {
        const res = await fetch(`${BASE_URL}/tv/${tvId}/season/${seasonNum}?api_key=${API_KEY}`);
        const data = await res.json();
        
        episodeSelect.innerHTML = '';
        data.episodes.forEach(ep => {
            const opt = document.createElement('option');
            opt.value = ep.episode_number;
            opt.textContent = `E${ep.episode_number}: ${ep.name}`;
            if(ep.episode_number == defaultEp) opt.selected = true;
            episodeSelect.appendChild(opt);
        });
        
        if(data.episodes.length > 0) {
            const exists = data.episodes.find(ep => ep.episode_number == defaultEp);
            const targetEp = exists ? defaultEp : data.episodes[0].episode_number;
            if(!exists) episodeSelect.value = targetEp;
            playEpisode(tvId, seasonNum, targetEp, itemData);
        }
    } catch(e) { console.error(e); }
}

function playEpisode(tvId, season, episode, itemData) {
    iframeLoader.classList.remove('hidden');
    videoFrame.src = `${VIDLINK_URL}/tv/${tvId}/${season}/${episode}?nextbutton=true`;
    videoFrame.onload = () => iframeLoader.classList.add('hidden');
    document.title = `${currentState.currentShowTitle} - S${season}:E${episode}`;
    saveToHistory(itemData, season, episode);
}

function closeModal() {
    videoModal.setAttribute('aria-hidden', 'true');
    document.title = APP_TITLE;
    setTimeout(() => {
        videoModal.classList.add('hidden');
        videoFrame.src = '';
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
        div.innerHTML = `<img src="${IMG_URL_SMALL + item.poster_path}" class="w-10 h-14 object-cover rounded mr-3 bg-gray-800"><div class="overflow-hidden"><h4 class="text-sm font-bold text-white truncate">${item.title || item.name}</h4><span class="text-xs text-gray-400 capitalize">${item.media_type}</span></div>`;
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
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.classList.remove('opacity-0');
    setTimeout(() => toast.classList.add('opacity-0'), 3000);
}