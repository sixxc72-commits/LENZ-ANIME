
        const BASE_URL = 'https://scripapi.web.id/gateway.php/anime';
        const contentDiv = document.getElementById('content');
        const searchDropdown = document.getElementById('searchDropdown');
        const FALLBACK_GIF = 'https://i.ibb.co.com/ZpzNn06K/ezgif-com-animated-gif-maker.gif';

        // Global cache data detail anime aktif untuk mempermudah penyimpanan sistem favorit
        let currentAnimeData = null;
        let debounceTimer;

        async function fetchJikanPoster(title, imgElement) {
            try {
                const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
                const data = await res.json();
                if (data.data && data.data[0].images.jpg.large_image_url) {
                    imgElement.src = data.data[0].images.jpg.large_image_url;
                } else {
                    imgElement.src = FALLBACK_GIF;
                }
            } catch (e) {
                imgElement.src = FALLBACK_GIF;
            }
        }

        async function fetchAPI(endpoint) {
            try {
                contentDiv.innerHTML = '<div class="loader"><div class="spinner"></div><p>Memuat Data...</p></div>';
                const response = await fetch(`${BASE_URL}${endpoint}`);
                if (!response.ok) throw new Error();
                return await response.json();
            } catch (e) {
                contentDiv.innerHTML = '<div class="loader"><p style="color:var(--accent-color);">Gagal memuat data. Periksa koneksi Anda.</p></div>';
                return null;
            }
        }

        function findArray(obj) {
            if (Array.isArray(obj)) return obj;
            for (let key in obj) if (Array.isArray(obj[key])) return obj[key];
            return [];
        }

        function createCard(a, isClickable = true) {
            const slug = a.slug || a.endpoint || a.id;
            const title = a.title || a.judul;

            const cardClass = isClickable ? 'anime-card clickable' : 'anime-card static';
            const clickAttr = isClickable ? `onclick="loadDetail('${slug}')"` : '';

            return `
                <div class="${cardClass}" ${clickAttr}>
                    <div class="img-wrapper">
                        <img src="" 
                             onerror="this.onerror=null; this.src='${FALLBACK_GIF}';"
                             onload="if(!this.src || this.src === window.location.href) fetchJikanPoster('${title}', this)">
                    </div>
                    <h3>${title}</h3>
                </div>`;
        }

        /* MENULIS/MENAMPILKAN HALAMAN BERANDA + USER DASHBOARD */
        async function loadHome() {
            const data = await fetchAPI('/home');
            if (!data) return;
            const list = findArray(data.data || data);
            const limitedList = list.slice(0, 5);
            
            let htmlContent = `
                <div class="section-title">Rekomendasi Utama</div>
                <div class="anime-grid">${limitedList.map(item => createCard(item, false)).join('')}</div>
            `;

            // Bagian Fitur Simpan Favorit
            const favorites = JSON.parse(localStorage.getItem('anime_favorites') || '[]');
            htmlContent += `
                <div class="user-section">
                    <div class="section-title">⭐ Favorit Saya</div>
                    ${favorites.length === 0 ? '<p class="empty-text">Belum ada anime favorit yang disimpan.</p>' : 
                    `<div class="anime-grid">${favorites.map(item => createCard(item, true)).join('')}</div>`}
                </div>
            `;

            // Bagian Fitur Riwayat Menonton
            const history = JSON.parse(localStorage.getItem('anime_history') || '[]');
            htmlContent += `
                <div class="user-section">
                    <div class="section-title">🕒 Riwayat Menonton Anda</div>
                    ${history.length === 0 ? '<p class="empty-text">Belum ada riwayat menonton.</p>' : `
                        <div class="history-list">
                            ${history.map(item => `
                                <div class="history-item" onclick="loadWatch('${item.episodeSlug}')">
                                    <div class="history-info">
                                        <h4>${item.animeTitle}</h4>
                                        <p>Terakhir ditonton: ${item.episodeTitle}</p>
                                    </div>
                                    <div class="history-time">${item.timeString}</div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            `;

            contentDiv.innerHTML = htmlContent;
        }

        /* FUNGSI PENCARIAN PINTAR (DEBOUNCING) */
        async function debouncedSearch() {
            clearTimeout(debounceTimer);
            const q = document.getElementById('searchInput').value.trim();
            
            if (q.length < 3) {
                searchDropdown.innerHTML = '';
                searchDropdown.style.display = 'none';
                return;
            }

            searchDropdown.style.display = 'block';
            searchDropdown.innerHTML = '<div class="dropdown-loading">Mencari anime...</div>';

            debounceTimer = setTimeout(async () => {
                try {
                    const response = await fetch(`${BASE_URL}/search?q=${encodeURIComponent(q)}`);
                    if (!response.ok) throw new Error();
                    const data = await response.json();
                    const list = findArray(data.data || data);
                    
                    if (list.length === 0) {
                        searchDropdown.innerHTML = '<div class="dropdown-loading">Anime tidak ditemukan.</div>';
                        return;
                    }

                    const limitedList = list.slice(0, 5);

                    let dropdownHtml = limitedList.map(item => {
                        const slug = item.slug || item.endpoint || item.id;
                        const title = item.title || item.judul;
                        const imgId = `drop-img-${slug.replace(/[^a-zA-Z0-9]/g, '')}`;

                        setTimeout(() => {
                            const imgEl = document.getElementById(imgId);
                            if (imgEl) fetchJikanPoster(title, imgEl);
                        }, 50);

                        return `
                            <div class="dropdown-item" onclick="selectFromDropdown('${slug}')">
                                <img id="${imgId}" src="" onerror="this.onerror=null; this.src='${FALLBACK_GIF}';" alt="">
                                <div class="dropdown-info">
                                    <h4>${title}</h4>
                                </div>
                            </div>
                        `;
                    }).join('');

                    searchDropdown.innerHTML = dropdownHtml;

                } catch (error) {
                    searchDropdown.innerHTML = '<div class="dropdown-loading" style="color:var(--accent-color);">Gagal memuat hasil.</div>';
                }
            }, 400); 
        }

        function selectFromDropdown(slug) {
            searchDropdown.innerHTML = '';
            searchDropdown.style.display = 'none';
            document.getElementById('searchInput').value = '';
            loadDetail(slug);
        }

        // Menutup dropdown jika klik di luar area input pencarian
        document.addEventListener('click', function(event) {
            const searchContainer = document.getElementById('searchInput')?.parentNode?.parentNode;
            if (searchContainer && !searchContainer.contains(event.target)) {
                searchDropdown.style.display = 'none';
            }
        });

        async function loadDetail(slug) {
            const data = await fetchAPI(`/detail?slug=${slug}`);
            if (!data) return;
            const anime = data.data || data.result || data;
            let eps = findArray(anime.episode || anime.episodes || anime);
            
            eps.reverse(); 

            currentAnimeData = {
                slug: slug,
                title: anime.title || anime.judul,
                poster: anime.poster || anime.image || ''
            };
            
            let epsHtml = eps.map((e, index) => {
                const episodeLabel = `EPS ${index + 1}`; 
                return `
                    <button class="server-btn" onclick="saveToHistory('${currentAnimeData.title}', '${episodeLabel}', '${e.slug || e.endpoint || e.id}'); loadWatch('${e.slug || e.endpoint || e.id}')">
                        ${episodeLabel}
                    </button>`;
            }).join('');

            const favorites = JSON.parse(localStorage.getItem('anime_favorites') || '[]');
            const isFav = favorites.some(item => item.slug === slug);
            const favBtnText = isFav ? '❤️ Hapus dari Favorit' : '⭐ Simpan Ke Favorit';
            const favBtnClass = isFav ? 'fav-btn is-fav' : 'fav-btn';

            contentDiv.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:10px;">
                    <button class="back-btn" style="margin-bottom:0;" onclick="loadHome()">« Kembali ke Beranda</button>
                    <button class="${favBtnClass}" onclick="toggleFavorite()">${favBtnText}</button>
                </div>
                <div class="detail-header">
                    <h2 class="detail-title">${anime.title || anime.judul}</h2>
                </div>
                <h3 class="episode-section-title">Daftar Episode:</h3>
                <div class="btn-grid">${epsHtml}</div>
            `;
        }

        async function loadWatch(slug) {
            const data = await fetchAPI(`/watch?slug=${slug}`);
            if (!data) return;
            const streamData = data.data || data.result || data;
            const servers = streamData.streaming_servers || [];
            
            let buttons = servers.map((s, idx) => {
                if (s.url && !s.url.includes('Video Not Available')) {
                    const activeClass = idx === 0 ? 'active' : '';
                    return `<button class="server-btn ${activeClass}" onclick="changeServer(this, '${s.url}')">${s.name}</button>`;
                }
                return '';
            }).join('');

            contentDiv.innerHTML = `
                <button class="back-btn" onclick="window.history.back()">« Kembali</button>
                <div class="video-container">
                    <iframe id="p" src="${servers[0]?.url || ''}" allowfullscreen></iframe>
                </div>
                <h3 class="episode-section-title">Pilih Server Streaming:</h3>
                <div class="btn-grid">${buttons}</div>
            `;
        }

        function changeServer(btn, url) {
            document.getElementById('p').src = url;
            document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }

        /* FUNGSI MANAJEMEN LOCALSTORAGE (FAVORIT & RIWAYAT) */
        function toggleFavorite() {
            if (!currentAnimeData) return;
            let favorites = JSON.parse(localStorage.getItem('anime_favorites') || '[]');
            const index = favorites.findIndex(item => item.slug === currentAnimeData.slug);

            if (index > -1) {
                favorites.splice(index, 1); 
            } else {
                favorites.unshift(currentAnimeData); 
            }

            localStorage.setItem('anime_favorites', JSON.stringify(favorites));
            loadDetail(currentAnimeData.slug); 
        }

        function saveToHistory(animeTitle, episodeTitle, episodeSlug) {
            let history = JSON.parse(localStorage.getItem('anime_history') || '[]');
            
            history = history.filter(item => item.animeTitle !== animeTitle);

            const now = new Date();
            const timeString = now.toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' });

            const newHistoryItem = {
                animeTitle: animeTitle,
                episodeTitle: episodeTitle,
                episodeSlug: episodeSlug,
                timeString: timeString
            };

            history.unshift(newHistoryItem); 
            if (history.length > 10) history.pop(); 

            localStorage.setItem('anime_history', JSON.stringify(history));
        }

        window.onload = loadHome;
    


        /* FITUR AUTO NEXT EPISODE */
        (function() {
            let currentEpisodeList = [];
            let currentEpisodeIndex = -1;
            let currentAnimeSlug = ''; 

            const originalLoadDetail = window.loadDetail;
            window.loadDetail = async function(slug) {
                currentAnimeSlug = slug; 
                await originalLoadDetail(slug);
                
                const epButtons = contentDiv.querySelectorAll('.btn-grid .server-btn');
                currentEpisodeList = [];
                
                epButtons.forEach((btn, idx) => {
                    const onclickStr = btn.getAttribute('onclick') || '';
                    const match = onclickStr.match(/loadWatch\(['"]([^'"]+)['"]\)/);
                    if (match && match[1]) {
                        currentEpisodeList.push({
                            slug: match[1],
                            title: btn.innerText.trim()
                        });
                    }
                });
            };

            const originalLoadWatch = window.loadWatch;
            window.loadWatch = async function(slug) {
                currentEpisodeIndex = currentEpisodeList.findIndex(ep => ep.slug === slug);
                await originalLoadWatch(slug);

                const backBtn = contentDiv.querySelector('.back-btn');
                if (backBtn && backBtn.getAttribute('onclick') === 'window.history.back()') {
                    backBtn.setAttribute('onclick', currentAnimeSlug ? `loadDetail('${currentAnimeSlug}')` : `loadHome()`);
                }

                const nextEpisodeIndex = currentEpisodeIndex + 1; 

                if (nextEpisodeIndex >= 0 && nextEpisodeIndex < currentEpisodeList.length) {
                    const nextEpisode = currentEpisodeList[nextEpisodeIndex];

                    const nextBtn = document.createElement('button');
                    nextBtn.className = 'server-btn';
                    nextBtn.style.background = 'linear-gradient(90deg, var(--success-color), #20bf6b)';
                    nextBtn.style.color = '#fff';
                    nextBtn.style.fontWeight = 'bold';
                    nextBtn.style.width = '100%';
                    nextBtn.style.padding = '14px';
                    nextBtn.style.marginBottom = '20px';
                    nextBtn.style.border = 'none';
                    nextBtn.style.borderRadius = '8px';
                    nextBtn.style.boxShadow = '0 4px 15px rgba(46, 213, 115, 0.3)';
                    nextBtn.innerText = `▶ Putar Selanjutnya: ${nextEpisode.title}`;
                    
                    nextBtn.onclick = function() {
                        const currentHistory = JSON.parse(localStorage.getItem('anime_history') || '[]');
                        const activeAnimeTitle = currentHistory[0]?.animeTitle || "Anime";
                        saveToHistory(activeAnimeTitle, nextEpisode.title, nextEpisode.slug);
                        window.loadWatch(nextEpisode.slug);
                    };

                    const videoContainer = contentDiv.querySelector('.video-container');
                    if (videoContainer) {
                        videoContainer.parentNode.insertBefore(nextBtn, videoContainer.nextSibling);
                    }
                }
            };
        })();
    