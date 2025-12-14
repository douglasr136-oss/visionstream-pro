// script.js - VISIONSTREAM PRO Player (Versão Render - CORRIGIDA)
function initVisionStream() {
    console.log('🚀 VISIONSTREAM PRO Inicializando...');
    
    // ==================== CONFIGURAÇÃO DO SISTEMA ====================
    const CONFIG = {
        BACKEND_URL: 'https://visionstream-proxy.onrender.com',
        API_KEY: 'visionstream_prod_1735661234',
        PROVIDERS: {
            'provider1': { name: 'Provedor Principal', icon: 'fa-wifi' },
            'provider2': { name: 'Provedor Secundário', icon: 'fa-satellite-dish' }
        }
    };
    
    // Elementos DOM
    const macInput = document.getElementById('mac');
    const keyInput = document.getElementById('key');
    const activateBtn = document.getElementById('activateBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusText = document.getElementById('statusText');
    const channelCount = document.getElementById('channelCount');
    const categoryCount = document.getElementById('categoryCount');
    const lastUpdate = document.getElementById('lastUpdate');
    const videoPlayer = document.getElementById('videoPlayer');
    const playerPlaceholder = document.getElementById('playerPlaceholder');
    const currentChannel = document.getElementById('currentChannel');
    const streamStatus = document.getElementById('streamStatus');
    const channelSearch = document.getElementById('channelSearch');
    const categoriesTabs = document.getElementById('categoriesTabs');
    const channelsGrid = document.getElementById('channelsGrid');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const exportBtn = document.getElementById('exportBtn');
    const instructionsBtn = document.getElementById('instructionsBtn');
    const instructionsModal = document.getElementById('instructionsModal');
    const closeModal = document.querySelector('.close-modal');
    const reloadBtn = document.getElementById('reloadBtn');
    
    // Estado da aplicação
    let appState = {
        activated: false,
        currentPlaylist: null,
        channels: [],
        categories: [],
        currentChannel: null,
        currentCategory: 'all',
        currentProvider: 'provider1',
        searchTerm: ''
    };
    
    // HLS instance
    let hls = null;
    
    // ==================== INICIALIZAÇÃO DO SISTEMA ====================
    function initSystem() {
        // Verificar se há dados salvos
        loadFromLocalStorage();
        
        // Configurar placeholder inicial
        if (playerPlaceholder) playerPlaceholder.style.display = 'flex';
        if (videoPlayer) videoPlayer.style.display = 'none';
        
        // Configurar eventos do player de vídeo
        if (videoPlayer) {
            videoPlayer.addEventListener('playing', () => {
                if (streamStatus) {
                    streamStatus.textContent = 'Transmitindo';
                    streamStatus.style.color = 'var(--success)';
                }
            });
            
            videoPlayer.addEventListener('waiting', () => {
                if (streamStatus) {
                    streamStatus.textContent = 'Buffering...';
                    streamStatus.style.color = 'var(--warning)';
                }
            });
            
            videoPlayer.addEventListener('ended', () => {
                if (streamStatus) {
                    streamStatus.textContent = 'Transmissão encerrada';
                    streamStatus.style.color = 'var(--text-secondary)';
                }
            });
        }
        
        // Inicializar seletor de provedor
        initProviderSelector();
        
        // Verificar status dos provedores
        checkProvidersStatus();
        
        // Mostrar notificação de boas-vindas
        setTimeout(() => {
            showNotification('VISIONSTREAM PRO Carregado! Selecione um provedor.', 'info');
        }, 2000);
    }
    
    // ==================== SELEÇÃO DE PROVEDOR ====================
    function initProviderSelector() {
        const playlistPanel = document.querySelector('.playlist-input');
        if (!playlistPanel) return;
        
        playlistPanel.innerHTML = `
            <div class="provider-selection">
                <div class="provider-header">
                    <i class="fas fa-server"></i>
                    <h3>SISTEMA DE PROVEDORES</h3>
                </div>
                <div class="provider-subtitle">
                    <i class="fas fa-info-circle"></i>
                    <p>Selecione o provedor para carregar a playlist</p>
                </div>
                <div class="provider-buttons">
                    ${Object.entries(CONFIG.PROVIDERS).map(([id, provider]) => `
                        <button class="provider-btn ${id === 'provider1' ? 'active' : ''}" 
                                data-provider="${id}" id="providerBtn_${id}"
                                ${!appState.activated ? 'disabled' : ''}>
                            <div class="provider-icon">
                                <i class="fas ${provider.icon}"></i>
                            </div>
                            <div class="provider-info">
                                <h4>${provider.name}</h4>
                                <span class="provider-status" id="status_${id}">🔴 Offline</span>
                            </div>
                            <div class="provider-action">
                                <i class="fas fa-arrow-right"></i>
                            </div>
                        </button>
                    `).join('')}
                </div>
                <div class="provider-footer">
                    <i class="fas fa-sync-alt"></i>
                    <span>Sistema otimizado para alta velocidade</span>
                </div>
            </div>
        `;
        
        // Adicionar eventos aos botões
        Object.keys(CONFIG.PROVIDERS).forEach(providerId => {
            const btn = document.getElementById(`providerBtn_${providerId}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    selectProvider(providerId);
                });
            }
        });
    }
    
    function selectProvider(providerId) {
        if (!appState.activated) {
            showNotification('Ative o sistema primeiro!', 'error');
            return;
        }
        
        // Atualizar UI
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`providerBtn_${providerId}`);
        if (activeBtn) activeBtn.classList.add('active');
        
        // Atualizar estado e carregar
        appState.currentProvider = providerId;
        loadM3UPlaylist(providerId);
    }
    
    async function checkProvidersStatus() {
        try {
            const response = await fetch(`${CONFIG.BACKEND_URL}/health`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            
            if (response.ok) {
                const data = await response.json();
                Object.keys(CONFIG.PROVIDERS).forEach(providerId => {
                    const statusEl = document.getElementById(`status_${providerId}`);
                    if (statusEl) {
                        statusEl.textContent = '🟢 Online';
                        statusEl.style.color = 'var(--success)';
                    }
                });
                console.log('✅ Backend online');
            }
        } catch (error) {
            console.log('⚠️ Backend offline ou em inicialização');
        }
    }
    
    // ==================== CARREGAMENTO DE PLAYLIST ====================
    async function loadM3UPlaylist(providerName) {
        if (!appState.activated) {
            showNotification('Ative o sistema primeiro!', 'error');
            return;
        }
        
        try {
            showNotification(`🔄 Conectando ao ${CONFIG.PROVIDERS[providerName].name}...`, 'info');
            if (streamStatus) {
                streamStatus.textContent = 'Conectando ao servidor...';
                streamStatus.style.color = 'var(--warning)';
            }
            
            // Atualizar status do provedor
            const statusEl = document.getElementById(`status_${providerName}`);
            if (statusEl) {
                statusEl.textContent = '🟡 Conectando...';
                statusEl.style.color = 'var(--warning)';
            }
            
            // URL do proxy backend
            const proxyUrl = `${CONFIG.BACKEND_URL}/api/playlist?provider=${providerName}&_=${Date.now()}`;
            
            console.log('🔗 Conectando ao proxy:', proxyUrl);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'audio/x-mpegurl, text/plain, */*',
                    'X-API-Key': CONFIG.API_KEY,
                    'X-Client-Version': 'VISIONSTREAM-PRO/2.0'
                },
                mode: 'cors',
                cache: 'no-store'
            });
            
            if (!response.ok) {
                throw new Error(`Servidor respondeu com erro ${response.status}`);
            }
            
            const m3uContent = await response.text();
            
            if (!m3uContent || m3uContent.trim() === '') {
                throw new Error('Playlist recebida está vazia');
            }
            
            if (!m3uContent.includes('#EXT')) {
                console.error('Conteúdo recebido:', m3uContent.substring(0, 200));
                throw new Error('Formato de playlist inválido');
            }
            
            // Parse da lista M3U
            const parsed = parseM3U(m3uContent);
            appState.channels = parsed.channels.map((ch, idx) => ({ ...ch, index: idx }));
            appState.categories = parsed.categories;
            appState.currentPlaylist = proxyUrl;
            appState.currentProvider = providerName;
            
            // Atualizar interface
            updateChannelsDisplay();
            updateCategoriesTabs();
            
            if (channelCount) channelCount.textContent = appState.channels.length;
            if (categoryCount) categoryCount.textContent = appState.categories.length;
            
            const now = new Date();
            if (lastUpdate) {
                lastUpdate.textContent = now.toLocaleTimeString('pt-BR') + ' - ' + now.toLocaleDateString('pt-BR');
            }
            
            // Atualizar status do provedor
            if (statusEl) {
                statusEl.textContent = `🟢 ${appState.channels.length} canais`;
                statusEl.style.color = 'var(--success)';
            }
            
            showNotification(`✅ ${appState.channels.length} canais carregados!`, 'success');
            if (streamStatus) {
                streamStatus.textContent = `Conectado - ${appState.channels.length} canais`;
                streamStatus.style.color = 'var(--success)';
            }
            
            // Salvar no localStorage
            saveToLocalStorage('visionstream_channels', appState.channels);
            saveToLocalStorage('visionstream_categories', appState.categories);
            saveToLocalStorage('visionstream_lastProvider', providerName);
            saveToLocalStorage('visionstream_lastUpdate', now.toISOString());
            
        } catch (error) {
            console.error('❌ Erro ao carregar playlist:', error);
            
            // Atualizar status do provedor
            const statusEl = document.getElementById(`status_${providerName}`);
            if (statusEl) {
                statusEl.textContent = '🔴 Erro';
                statusEl.style.color = 'var(--danger)';
            }
            
            let userMessage = 'Falha ao carregar playlist: ';
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                userMessage += 'Não foi possível conectar ao servidor.';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                userMessage += 'Acesso não autorizado. Verifique a chave de API.';
            } else if (error.message.includes('502')) {
                userMessage += 'Provedor temporariamente indisponível.';
            } else {
                userMessage += error.message;
            }
            
            showNotification(userMessage, 'error');
            if (streamStatus) {
                streamStatus.textContent = 'Falha na conexão';
                streamStatus.style.color = 'var(--danger)';
            }
            
            // Tentar carregar do cache
            loadFromLocalStorage();
        }
    }
    
    // ==================== SISTEMA DE ATIVAÇÃO ====================
    function isValidMAC(mac) {
        const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macPattern.test(mac);
    }
    
    function isValidKey(key) {
        const keyPattern = /^VISION-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return keyPattern.test(key);
    }
    
    if (activateBtn) {
        activateBtn.addEventListener('click', function() {
            const mac = macInput ? macInput.value.trim() : 'A1:B2:C3:D4:E5:F6';
            const key = keyInput ? keyInput.value.trim() : 'VISION-7A3B-9C2D';
            
            if (!isValidMAC(mac)) {
                if (statusText) {
                    statusText.textContent = 'MAC inválido! Use: AA:BB:CC:DD:EE:FF';
                    statusText.style.color = 'var(--danger)';
                }
                showNotification('Formato MAC inválido!', 'error');
                return;
            }
            
            if (!isValidKey(key)) {
                if (statusText) {
                    statusText.textContent = 'KEY inválida! Use: VISION-XXXX-XXXX';
                    statusText.style.color = 'var(--danger)';
                }
                showNotification('Formato KEY inválido!', 'error');
                return;
            }
            
            // Ativação bem-sucedida
            appState.activated = true;
            if (statusText) {
                statusText.textContent = 'Sistema ativado com sucesso!';
                statusText.style.color = 'var(--success)';
            }
            
            // Habilitar botões de provedor
            document.querySelectorAll('.provider-btn').forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
            
            // Animação de confirmação
            activateBtn.innerHTML = '<i class="fas fa-check"></i> Sistema Ativo';
            activateBtn.style.background = 'linear-gradient(45deg, var(--success), var(--neon-green))';
            
            showNotification('Sistema ativado! Selecione um provedor.', 'success');
        });
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', function() {
            if (macInput) macInput.value = 'A1:B2:C3:D4:E5:F6';
            if (keyInput) keyInput.value = 'VISION-7A3B-9C2D';
            if (statusText) {
                statusText.textContent = 'Aguardando ativação';
                statusText.style.color = 'var(--text-secondary)';
            }
            
            // Resetar botão
            if (activateBtn) {
                activateBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> Ativar Sistema';
                activateBtn.style.background = '';
            }
            
            // Desativar funcionalidades
            appState.activated = false;
            document.querySelectorAll('.provider-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.7';
            });
            
            // Limpar lista
            appState.channels = [];
            appState.categories = [];
            updateChannelsDisplay();
            updateCategoriesTabs();
            
            if (channelCount) channelCount.textContent = '0';
            if (categoryCount) categoryCount.textContent = '0';
            if (lastUpdate) lastUpdate.textContent = 'Nunca';
            
            showNotification('Sistema resetado!', 'info');
        });
    }
    
    // ==================== PARSE M3U ====================
    function parseM3U(content) {
        const lines = content.split('\n');
        const channels = [];
        const categories = new Set(['Geral']);
        
        let currentChannel = {};
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            if (line.startsWith('#EXTINF:')) {
                const extinfLine = line;
                
                let logo = '';
                const logoMatch = extinfLine.match(/tvg-logo="([^"]*)"/i);
                if (logoMatch) logo = logoMatch[1];
                
                let group = 'Geral';
                const groupMatch = extinfLine.match(/group-title="([^"]*)"/i);
                if (groupMatch) group = groupMatch[1];
                
                const lastCommaIndex = extinfLine.lastIndexOf(',');
                let name = lastCommaIndex > -1 ? extinfLine.substring(lastCommaIndex + 1) : 'Canal sem nome';
                name = name.trim().replace(/^\s*-\s*/, '').replace(/\|.*$/, '');
                
                currentChannel = {
                    logo: logo,
                    group: group || 'Geral',
                    name: name || `Canal ${channels.length + 1}`,
                    url: ''
                };
                
                categories.add(currentChannel.group);
                
            } else if (line && !line.startsWith('#') && currentChannel.name) {
                currentChannel.url = line.trim();
                
                if (currentChannel.url.startsWith('http')) {
                    channels.push({...currentChannel});
                }
                
                currentChannel = {};
            }
        }
        
        // Fallback para parse alternativo
        if (channels.length === 0) {
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.startsWith('#EXTINF:')) {
                    const nameMatch = line.match(/,(.*)$/);
                    if (nameMatch) {
                        currentChannel = {
                            logo: '',
                            group: 'Geral',
                            name: nameMatch[1].trim(),
                            url: ''
                        };
                        categories.add('Geral');
                    }
                } else if (line && !line.startsWith('#') && currentChannel.name) {
                    currentChannel.url = line.trim();
                    if (currentChannel.url.startsWith('http')) {
                        channels.push({...currentChannel});
                    }
                    currentChannel = {};
                }
            }
        }
        
        return {
            channels: channels,
            categories: Array.from(categories).sort()
        };
    }
    
    // ==================== EXIBIÇÃO DE CANAIS ====================
    function updateChannelsDisplay() {
        if (!channelsGrid) return;
        
        channelsGrid.innerHTML = '';
        
        if (appState.channels.length === 0) {
            channelsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-broadcast-tower"></i>
                    <h3>Nenhum canal carregado</h3>
                    <p>Selecione um provedor para carregar os canais disponíveis</p>
                </div>
            `;
            return;
        }
        
        // Filtrar canais
        let filteredChannels = appState.channels;
        
        if (appState.currentCategory !== 'all') {
            filteredChannels = filteredChannels.filter(channel => channel.group === appState.currentCategory);
        }
        
        if (appState.searchTerm) {
            const term = appState.searchTerm.toLowerCase();
            filteredChannels = filteredChannels.filter(channel => 
                channel.name.toLowerCase().includes(term) || 
                channel.group.toLowerCase().includes(term)
            );
        }
        
        // Limitar exibição
        const displayChannels = filteredChannels.slice(0, 200);
        
        // Criar cards
        displayChannels.forEach((channel, index) => {
            const channelCard = document.createElement('div');
            channelCard.className = 'channel-card';
            channelCard.dataset.index = index;
            
            let iconClass = 'fas fa-tv';
            if (channel.name.toLowerCase().includes('filme') || channel.name.toLowerCase().includes('movie')) {
                iconClass = 'fas fa-film';
            } else if (channel.name.toLowerCase().includes('esporte') || channel.name.toLowerCase().includes('sport')) {
                iconClass = 'fas fa-futbol';
            } else if (channel.name.toLowerCase().includes('notícia') || channel.name.toLowerCase().includes('news')) {
                iconClass = 'fas fa-newspaper';
            } else if (channel.name.toLowerCase().includes('infantil') || channel.name.toLowerCase().includes('kid')) {
                iconClass = 'fas fa-child';
            }
            
            const logoDisplay = channel.logo && channel.logo.trim() !== ''
                ? `<img src="${channel.logo}" alt="${channel.name}" onerror="this.onerror=null; this.src=''; this.outerHTML='<i class=\\'${iconClass}\\'></i>'">`
                : `<i class="${iconClass}"></i>`;
            
            channelCard.innerHTML = `
                <div class="channel-logo">
                    ${logoDisplay}
                </div>
                <div class="channel-info">
                    <div class="channel-name" title="${channel.name}">${channel.name}</div>
                    <div class="channel-category">${channel.group}</div>
                </div>
            `;
            
            channelCard.addEventListener('click', () => playChannel(channel));
            channelsGrid.appendChild(channelCard);
        });
        
        // Mensagem se houver mais canais
        if (filteredChannels.length > displayChannels.length) {
            const moreChannels = document.createElement('div');
            moreChannels.className = 'empty-state';
            moreChannels.innerHTML = `
                <i class="fas fa-filter"></i>
                <h3>+${filteredChannels.length - displayChannels.length} canais</h3>
                <p>Use a busca para encontrar canais específicos</p>
            `;
            channelsGrid.appendChild(moreChannels);
        }
    }
    
    function updateCategoriesTabs() {
        if (!categoriesTabs) return;
        
        categoriesTabs.innerHTML = '';
        
        // Botão "Todos"
        const allTab = document.createElement('button');
        allTab.className = `category-tab ${appState.currentCategory === 'all' ? 'active' : ''}`;
        allTab.textContent = `Todos (${appState.channels.length})`;
        allTab.dataset.category = 'all';
        allTab.addEventListener('click', () => {
            appState.currentCategory = 'all';
            updateCategoriesTabs();
            updateChannelsDisplay();
        });
        categoriesTabs.appendChild(allTab);
        
        // Categorias
        appState.categories.forEach(category => {
            const count = appState.channels.filter(ch => ch.group === category).length;
            if (count === 0) return;
            
            const tab = document.createElement('button');
            tab.className = `category-tab ${appState.currentCategory === category ? 'active' : ''}`;
            tab.textContent = `${category} (${count})`;
            tab.dataset.category = category;
            tab.addEventListener('click', () => {
                appState.currentCategory = category;
                updateCategoriesTabs();
                updateChannelsDisplay();
            });
            categoriesTabs.appendChild(tab);
        });
    }
    
    // ==================== PLAYER DE VÍDEO ====================
    function playChannel(channel) {
        if (!channel.url || !videoPlayer) {
            showNotification('URL do canal inválida!', 'error');
            return;
        }
        
        console.log('🎬 Reproduzindo canal:', channel.name);
        
        if (currentChannel) currentChannel.textContent = channel.name;
        if (streamStatus) {
            streamStatus.textContent = 'Conectando...';
            streamStatus.style.color = 'var(--warning)';
        }
        
        if (playerPlaceholder) playerPlaceholder.style.display = 'none';
        videoPlayer.style.display = 'block';
        
        // Destruir HLS anterior
        if (hls) {
            hls.destroy();
            hls = null;
        }
        
        // Limpar overlay
        const playOverlay = document.getElementById('playOverlay');
        if (playOverlay) playOverlay.remove();
        
        // Remover src atual
        videoPlayer.src = '';
        videoPlayer.removeAttribute('src');
        
        // Verificar formato
        const url = channel.url.toLowerCase();
        const isM3U8 = url.includes('.m3u8');
        
        console.log('📊 Formato detectado:', { isM3U8, url: channel.url });
        
        // Usar HLS.js se disponível
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
            console.log('🚀 Usando HLS.js');
            
            hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90
            });
            
            hls.loadSource(channel.url);
            hls.attachMedia(videoPlayer);
            
            hls.on(Hls.Events.MANIFEST_PARSED, function() {
                console.log('✅ Manifesto HLS carregado');
                attemptAutoPlay();
            });
            
            hls.on(Hls.Events.ERROR, function(event, data) {
                console.error('❌ Erro HLS:', data);
                if (data.fatal) {
                    switch(data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            hls.recoverMediaError();
                            break;
                        default:
                            tryDirectPlay(channel.url);
                            break;
                    }
                }
            });
            
        } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl') && isM3U8) {
            console.log('🍎 Usando HLS nativo');
            videoPlayer.src = channel.url;
            videoPlayer.addEventListener('loadedmetadata', attemptAutoPlay);
            videoPlayer.addEventListener('error', handleVideoError);
        } else {
            console.log('🔧 Usando reprodução direta');
            tryDirectPlay(channel.url);
        }
        
        appState.currentChannel = channel;
        saveToLocalStorage('visionstream_lastChannel', channel);
        
        // Destacar canal selecionado
        document.querySelectorAll('.channel-card').forEach(card => {
            card.classList.remove('playing');
        });
        const clickedCard = document.querySelector(`.channel-card[data-index="${channel.index}"]`);
        if (clickedCard) clickedCard.classList.add('playing');
    }
    
    function tryDirectPlay(url) {
        videoPlayer.src = url;
        videoPlayer.load();
        
        videoPlayer.addEventListener('canplay', attemptAutoPlay);
        videoPlayer.addEventListener('error', handleVideoError);
    }
    
    function attemptAutoPlay() {
        console.log('🎯 Tentando autoplay...');
        
        videoPlayer.play().then(() => {
            console.log('✅ Autoplay bem-sucedido!');
            if (streamStatus) {
                streamStatus.textContent = 'Transmitindo';
                streamStatus.style.color = 'var(--success)';
            }
            showNotification(`Assistindo: ${appState.currentChannel.name}`, 'success');
            
            // Remover overlay
            const playOverlay = document.getElementById('playOverlay');
            if (playOverlay) playOverlay.remove();
            
        }).catch(error => {
            console.log('⚠️ Autoplay bloqueado:', error.name);
            
            if (streamStatus) {
                streamStatus.textContent = '▶ Clique para reproduzir';
                streamStatus.style.color = 'var(--warning)';
            }
            
            addPlayOverlay();
        });
    }
    
    function handleVideoError() {
        console.error('❌ Erro no vídeo:', videoPlayer.error);
        
        let errorMsg = 'Erro ao carregar vídeo';
        if (videoPlayer.error) {
            switch(videoPlayer.error.code) {
                case 1: errorMsg = 'Acesso cancelado'; break;
                case 2: errorMsg = 'Erro de rede'; break;
                case 3: errorMsg = 'Formato não suportado'; break;
                case 4: errorMsg = 'URL inválida'; break;
            }
        }
        
        showNotification(errorMsg, 'error');
        if (streamStatus) {
            streamStatus.textContent = 'Erro de reprodução';
            streamStatus.style.color = 'var(--danger)';
        }
    }
    
    function addPlayOverlay() {
        // Remover existente
        const existing = document.getElementById('playOverlay');
        if (existing) existing.remove();
        
        // Criar overlay
        const overlay = document.createElement('div');
        overlay.id = 'playOverlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10;
            cursor: pointer;
            border-radius: 12px;
        `;
        
        overlay.innerHTML = `
            <div style="
                background: var(--card-bg);
                padding: 30px;
                border-radius: 20px;
                text-align: center;
                border: 2px solid var(--neon-purple);
                box-shadow: 0 0 30px rgba(147,51,234,0.5);
            ">
                <div style="
                    font-size: 60px;
                    color: var(--neon-green);
                    margin-bottom: 20px;
                    animation: pulse 1.5s infinite;
                ">
                    ▶
                </div>
                <h3 style="
                    color: var(--neon-purple);
                    margin: 0 0 10px 0;
                    font-size: 24px;
                ">
                    CLIQUE PARA REPRODUZIR
                </h3>
                <p style="color: var(--text-secondary); margin: 0;">
                    O navegador requer uma interação para iniciar o vídeo
                </p>
            </div>
        `;
        
        // Adicionar ao container
        const container = videoPlayer.parentElement;
        if (container) {
            container.style.position = 'relative';
            container.appendChild(overlay);
        }
        
        // Configurar clique
        overlay.addEventListener('click', function() {
            videoPlayer.play().then(() => {
                overlay.remove();
            }).catch(e => {
                console.error('Erro ao reproduzir:', e);
            });
        });
    }
    
    // ==================== LOCALSTORAGE ====================
    function loadFromLocalStorage() {
        try {
            const channels = getFromLocalStorage('visionstream_channels');
            const categories = getFromLocalStorage('visionstream_categories');
            const lastChannel = getFromLocalStorage('visionstream_lastChannel');
            const lastProvider = getFromLocalStorage('visionstream_lastProvider');
            const lastUpdateTime = getFromLocalStorage('visionstream_lastUpdate');
            
            if (channels && channels.length > 0) {
                appState.channels = channels.map((ch, idx) => ({ ...ch, index: idx }));
                appState.categories = categories || ['Geral'];
                
                if (lastChannel) appState.currentChannel = lastChannel;
                if (lastProvider) appState.currentProvider = lastProvider;
                
                updateChannelsDisplay();
                updateCategoriesTabs();
                
                if (channelCount) channelCount.textContent = appState.channels.length;
                if (categoryCount) categoryCount.textContent = appState.categories.length;
                
                if (lastUpdateTime && lastUpdate) {
                    const date = new Date(lastUpdateTime);
                    lastUpdate.textContent = date.toLocaleTimeString('pt-BR') + ' - ' + date.toLocaleDateString('pt-BR');
                } else if (lastUpdate) {
                    lastUpdate.textContent = 'Do cache local';
                }
                
                // Ativar automaticamente se houver dados
                appState.activated = true;
                if (statusText) {
                    statusText.textContent = 'Sistema ativado (cache)';
                    statusText.style.color = 'var(--success)';
                }
                
                // Habilitar botões
                document.querySelectorAll('.provider-btn').forEach(btn => {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
            }
        } catch (e) {
            console.error('Erro ao carregar cache:', e);
        }
    }
    
    function saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Erro ao salvar no cache:', e);
        }
    }
    
    function getFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Erro ao ler cache:', e);
            return null;
        }
    }
    
    // ==================== NOTIFICAÇÕES ====================
    function showNotification(message, type = 'info') {
        // Remover existente
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => existing.remove(), 300);
        }
        
        // Criar nova
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        let icon = 'info-circle';
        if (type === 'success') icon = 'check-circle';
        if (type === 'error') icon = 'exclamation-circle';
        if (type === 'warning') icon = 'exclamation-triangle';
        
        notification.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // Remover após 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    // ==================== EVENT LISTENERS ====================
    if (reloadBtn) {
        reloadBtn.addEventListener('click', () => {
            if (appState.currentProvider) {
                loadM3UPlaylist(appState.currentProvider);
            } else {
                showNotification('Selecione um provedor primeiro', 'error');
            }
        });
    }
    
    if (channelSearch) {
        channelSearch.addEventListener('input', () => {
            appState.searchTerm = channelSearch.value;
            updateChannelsDisplay();
        });
    }
    
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            const elem = videoPlayer;
            
            if (!document.fullscreenElement) {
                if (elem.requestFullscreen) elem.requestFullscreen();
                else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
                else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
                else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
                
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Sair da Tela Cheia';
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Tela Cheia';
            }
        });
        
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Tela Cheia';
            }
        });
    }
    
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (appState.channels.length === 0) {
                showNotification('Nenhuma lista para exportar', 'error');
                return;
            }
            
            let m3uContent = '#EXTM3U\n';
            appState.channels.forEach(channel => {
                m3uContent += `#EXTINF:-1 tvg-id="" tvg-name="${channel.name}" tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}\n`;
                m3uContent += `${channel.url}\n`;
            });
            
            const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `visionstream_${new Date().toISOString().slice(0,10)}.m3u`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showNotification('Lista exportada!', 'success');
        });
    }
    
    if (instructionsBtn && instructionsModal && closeModal) {
        instructionsBtn.addEventListener('click', () => {
            instructionsModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
        
        closeModal.addEventListener('click', () => {
            instructionsModal.classList.remove('active');
            document.body.style.overflow = '';
        });
        
        instructionsModal.addEventListener('click', (e) => {
            if (e.target === instructionsModal) {
                instructionsModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && instructionsModal.classList.contains('active')) {
                instructionsModal.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
    
    // ==================== INICIALIZAR ====================
    initSystem();
    
    // Expor funções globais
    window.parseM3U = parseM3U;
    window.showNotification = showNotification;
    window.playChannel = playChannel;
}

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVisionStream);
} else {
    initVisionStream();
}
