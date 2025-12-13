// script.js - VISIONSTREAM PRO Player (Versão Render)
document.addEventListener('DOMContentLoaded', function() {
    // ==================== CONFIGURAÇÃO DO SISTEMA ====================
    const CONFIG = {
        // URL do seu backend no Render (ATUALIZE APÓS DEPLOY)
        BACKEND_URL: 'https://visionstream-proxy.onrender.com',
        
        // Sua chave de API (VOCÊ VAI PEGAR NO RENDER E ATUALIZAR AQUI)
        API_KEY: 'visionstream_key_123',
        
        // Provedores disponíveis
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
    const m3uUrlInput = document.getElementById('m3uUrl');
    const loadListBtn = document.getElementById('loadListBtn');
    const reloadBtn = document.getElementById('reloadBtn');
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
    const presetButtons = document.querySelectorAll('.preset-btn');
    
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
        // Remover campo de URL antigo e adicionar seletor de provedor
        initProviderSelector();
        
        // Verificar se há dados salvos
        loadFromLocalStorage();
        
        // Configurar placeholder inicial
        playerPlaceholder.style.display = 'flex';
        videoPlayer.style.display = 'none';
        
        // Configurar eventos do player de vídeo
        videoPlayer.addEventListener('playing', () => {
            streamStatus.textContent = 'Transmitindo';
            streamStatus.style.color = 'var(--success)';
        });
        
        videoPlayer.addEventListener('waiting', () => {
            streamStatus.textContent = 'Buffering...';
            streamStatus.style.color = 'var(--warning)';
        });
        
        videoPlayer.addEventListener('ended', () => {
            streamStatus.textContent = 'Transmissão encerrada';
            streamStatus.style.color = 'var(--text-secondary)';
        });
        
        // Mostrar notificação de boas-vindas
        setTimeout(() => {
            showNotification('Bem-vindo ao VISIONSTREAM PRO! Sistema otimizado para Render.com', 'info');
        }, 1000);
        
        // Verificar configuração
        if (CONFIG.API_KEY === 'SUA_CHAVE_API_AQUI_COLE_A_CHAVE_DO_RENDER') {
            console.warn('⚠️ ATENÇÃO: Configure a API_KEY no arquivo script.js');
            showNotification('Configure a chave de API no sistema', 'warning');
        }
    }
    
    // ==================== SELEÇÃO DE PROVEDOR ====================
    function initProviderSelector() {
        // Remover o campo de URL antigo
        const urlInputGroup = document.querySelector('.url-input-container');
        if (urlInputGroup) {
            urlInputGroup.style.display = 'none';
        }
        
        // Criar container de seleção de provedor
        const providerContainer = document.createElement('div');
        providerContainer.className = 'provider-selection';
        providerContainer.innerHTML = `
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
                            data-provider="${id}" id="providerBtn_${id}">
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
        `;
        
        // Inserir no painel de playlist
        const playlistPanel = document.querySelector('.playlist-input');
        if (playlistPanel) {
            playlistPanel.innerHTML = '';
            playlistPanel.appendChild(providerContainer);
        }
        
        // Adicionar eventos aos botões
        Object.keys(CONFIG.PROVIDERS).forEach(providerId => {
            const btn = document.getElementById(`providerBtn_${providerId}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    selectProvider(providerId);
                });
            }
        });
        
        // Verificar status dos provedores
        checkProvidersStatus();
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
        document.getElementById(`providerBtn_${providerId}`).classList.add('active');
        
        // Atualizar estado
        appState.currentProvider = providerId;
        
        // Carregar playlist
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
            }
        } catch (error) {
            console.log('Backend offline ou em inicialização');
        }
    }
    
    // ==================== FUNÇÃO PRINCIPAL DE CARREGAMENTO ====================
    async function loadM3UPlaylist(providerName) {
        if (!appState.activated) {
            showNotification('Ative o sistema primeiro! Clique em "Ativar Sistema"', 'error');
            return;
        }
        
        try {
            showNotification(`🔄 Conectando ao ${CONFIG.PROVIDERS[providerName].name}...`, 'info');
            streamStatus.textContent = 'Conectando ao servidor...';
            streamStatus.style.color = 'var(--warning)';
            
            // Atualizar status do provedor
            const statusEl = document.getElementById(`status_${providerName}`);
            if (statusEl) {
                statusEl.textContent = '🟡 Conectando...';
                statusEl.style.color = 'var(--warning)';
            }
            
            // URL do proxy backend
            const proxyUrl = `${CONFIG.BACKEND_URL}/api/playlist?provider=${providerName}&_=${Date.now()}`;
            
            console.log('🔗 Conectando ao proxy:', CONFIG.BACKEND_URL);
            console.log('📡 Provedor selecionado:', providerName);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'audio/x-mpegurl, text/plain, */*',
                    'X-API-Key': CONFIG.API_KEY,
                    'X-Client-Version': 'VISIONSTREAM-PRO/2.0-RENDER'
                },
                mode: 'cors',
                cache: 'no-store'
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Sem detalhes');
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
            appState.channels = parsed.channels;
            appState.categories = parsed.categories;
            appState.currentPlaylist = proxyUrl;
            appState.currentProvider = providerName;
            
            // Atualizar interface
            updateChannelsDisplay();
            updateCategoriesTabs();
            
            channelCount.textContent = appState.channels.length;
            categoryCount.textContent = appState.categories.length;
            
            const now = new Date();
            lastUpdate.textContent = now.toLocaleTimeString('pt-BR') + ' - ' + now.toLocaleDateString('pt-BR');
            
            // Atualizar status do provedor
            if (statusEl) {
                statusEl.textContent = `🟢 ${appState.channels.length} canais`;
                statusEl.style.color = 'var(--success)';
            }
            
            showNotification(`✅ ${CONFIG.PROVIDERS[providerName].name} carregado! ${appState.channels.length} canais disponíveis.`, 'success');
            streamStatus.textContent = `Conectado - ${appState.channels.length} canais`;
            streamStatus.style.color = 'var(--success)';
            
            // Salvar no localStorage
            saveToLocalStorage('visionstream_lastPlaylist', proxyUrl);
            saveToLocalStorage('visionstream_channels', appState.channels);
            saveToLocalStorage('visionstream_categories', appState.categories);
            saveToLocalStorage('visionstream_lastProvider', providerName);
            
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
            streamStatus.textContent = 'Falha na conexão';
            streamStatus.style.color = 'var(--danger)';
            
            // Tentar carregar do cache
            loadFromLocalStorage();
        }
    }
    
    // ==================== FUNÇÕES DO SISTEMA DE ATIVAÇÃO ====================
    function isValidMAC(mac) {
        const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        return macPattern.test(mac);
    }
    
    function isValidKey(key) {
        const keyPattern = /^VISION-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
        return keyPattern.test(key);
    }
    
    activateBtn.addEventListener('click', function() {
        const mac = macInput.value.trim();
        const key = keyInput.value.trim();
        
        if (!isValidMAC(mac)) {
            statusText.textContent = 'MAC inválido! Use: AA:BB:CC:DD:EE:FF';
            statusText.style.color = 'var(--danger)';
            showNotification('Formato MAC inválido!', 'error');
            return;
        }
        
        if (!isValidKey(key)) {
            statusText.textContent = 'KEY inválida! Use: VISION-XXXX-XXXX';
            statusText.style.color = 'var(--danger)';
            showNotification('Formato KEY inválido!', 'error');
            return;
        }
        
        // Ativação bem-sucedida
        appState.activated = true;
        statusText.textContent = 'Sistema ativado com sucesso!';
        statusText.style.color = 'var(--success)';
        
        // Habilitar botões
        document.querySelectorAll('.provider-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });
        
        // Animação de confirmação
        activateBtn.innerHTML = '<i class="fas fa-check"></i> Sistema Ativo';
        activateBtn.style.background = 'linear-gradient(45deg, var(--success), var(--neon-green))';
        
        showNotification('Sistema ativado! Selecione um provedor para começar.', 'success');
        
        // Efeito visual
        activateBtn.classList.add('activated');
        setTimeout(() => activateBtn.classList.remove('activated'), 1000);
    });
    
    resetBtn.addEventListener('click', function() {
        macInput.value = 'A1:B2:C3:D4:E5:F6';
        keyInput.value = 'VISION-7A3B-9C2D';
        statusText.textContent = 'Aguardando ativação';
        statusText.style.color = 'var(--text-secondary)';
        
        // Resetar botão
        activateBtn.innerHTML = '<i class="fas fa-unlock-alt"></i> Ativar Sistema';
        activateBtn.style.background = '';
        
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
        
        channelCount.textContent = '0';
        categoryCount.textContent = '0';
        lastUpdate.textContent = 'Nunca';
        
        showNotification('Sistema resetado!', 'info');
    });
    
    // ==================== FUNÇÕES DE CANAIS E CATEGORIAS ====================
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
    
    function updateChannelsDisplay() {
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
        if (!channel.url) {
            showNotification('URL do canal inválida!', 'error');
            return;
        }
        
        currentChannel.textContent = channel.name;
        streamStatus.textContent = 'Conectando...';
        streamStatus.style.color = 'var(--warning)';
        
        playerPlaceholder.style.display = 'none';
        videoPlayer.style.display = 'block';
        
        if (hls) {
            hls.destroy();
            hls = null;
        }
        
        videoPlayer.onerror = null;
        videoPlayer.oncanplay = null;
        
        if (channel.url.includes('.m3u8')) {
            if (typeof Hls !== 'undefined' && Hls.isSupported()) {
                hls = new Hls({
                    enableWorker: true,
                    lowLatencyMode: true,
                    backBufferLength: 90
                });
                
                hls.loadSource(channel.url);
                hls.attachMedia(videoPlayer);
                
                hls.on(Hls.Events.MANIFEST_PARSED, function() {
                    videoPlayer.play().then(() => {
                        streamStatus.textContent = 'Transmitindo (HLS)';
                        streamStatus.style.color = 'var(--success)';
                        showNotification(`Assistindo: ${channel.name}`, 'success');
                    }).catch(e => {
                        console.error('Erro ao reproduzir:', e);
                        streamStatus.textContent = 'Clique para reproduzir';
                        streamStatus.style.color = 'var(--warning)';
                    });
                });
                
                hls.on(Hls.Events.ERROR, function(event, data) {
                    console.error('HLS Error:', data);
                    if (data.fatal) {
                        switch(data.type) {
                            case Hls.ErrorTypes.NETWORK_ERROR:
                                showNotification('Erro de rede', 'error');
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
            } else if (videoPlayer.canPlayType('application/vnd.apple.mpegurl')) {
                tryDirectPlay(channel.url);
            } else {
                showNotification('Navegador incompatível com HLS', 'error');
                streamStatus.textContent = 'Incompatível';
                streamStatus.style.color = 'var(--danger)';
            }
        } else {
            tryDirectPlay(channel.url);
        }
        
        appState.currentChannel = channel;
        saveToLocalStorage('visionstream_lastChannel', channel);
    }
    
    function tryDirectPlay(url) {
        videoPlayer.src = url;
        videoPlayer.load();
        
        if (url.includes('.mp4')) {
            videoPlayer.type = 'video/mp4';
        } else if (url.includes('.m3u8')) {
            videoPlayer.type = 'application/vnd.apple.mpegurl';
        }
        
        const playPromise = videoPlayer.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                streamStatus.textContent = 'Transmitindo';
                streamStatus.style.color = 'var(--success)';
                showNotification(`Stream iniciado: ${appState.currentChannel.name}`, 'success');
            }).catch(e => {
                console.error('Erro ao reproduzir:', e);
                streamStatus.textContent = 'Clique para reproduzir';
                streamStatus.style.color = 'var(--warning)';
                showNotification('Clique no botão play', 'info');
            });
        }
        
        videoPlayer.onerror = function() {
            console.error('Erro no vídeo:', videoPlayer.error);
            streamStatus.textContent = 'Erro ao carregar';
            streamStatus.style.color = 'var(--danger)';
            showNotification(`Erro no canal: ${videoPlayer.error?.code || 'DESCONHECIDO'}`, 'error');
        };
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
                appState.channels = channels;
                appState.categories = categories || ['Geral'];
                
                if (lastChannel) appState.currentChannel = lastChannel;
                if (lastProvider) appState.currentProvider = lastProvider;
                
                updateChannelsDisplay();
                updateCategoriesTabs();
                
                channelCount.textContent = appState.channels.length;
                categoryCount.textContent = appState.categories.length;
                
                if (lastUpdateTime) {
                    const date = new Date(lastUpdateTime);
                    lastUpdate.textContent = date.toLocaleTimeString('pt-BR') + ' - ' + date.toLocaleDateString('pt-BR');
                } else {
                    lastUpdate.textContent = 'Do cache local';
                }
                
                // Ativar automaticamente
                appState.activated = true;
                statusText.textContent = 'Sistema ativado (cache)';
                statusText.style.color = 'var(--success)';
                
                showNotification('Dados carregados do cache', 'info');
            }
        } catch (e) {
            console.error('Erro ao carregar do localStorage:', e);
        }
    }
    
    function saveToLocalStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error('Erro ao salvar no localStorage:', e);
        }
    }
    
    function getFromLocalStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Erro ao ler do localStorage:', e);
            return null;
        }
    }
    
    // ==================== NOTIFICAÇÕES ====================
    function showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                if (existingNotification.parentNode) {
                    existingNotification.remove();
                }
            }, 300);
        }
        
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
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
    
    // ==================== EVENT LISTENERS ====================
    reloadBtn.addEventListener('click', () => {
        if (appState.currentProvider) {
            loadM3UPlaylist(appState.currentProvider);
        } else {
            showNotification('Selecione um provedor primeiro', 'error');
        }
    });
    
    channelSearch.addEventListener('input', () => {
        appState.searchTerm = channelSearch.value;
        updateChannelsDisplay();
    });
    
    channelSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            appState.searchTerm = channelSearch.value;
            updateChannelsDisplay();
        }
    });
    
    fullscreenBtn.addEventListener('click', () => {
        const elem = videoPlayer;
        
        if (!document.fullscreenElement) {
            if (elem.requestFullscreen) {
                elem.requestFullscreen();
            } else if (elem.mozRequestFullScreen) {
                elem.mozRequestFullScreen();
            } else if (elem.webkitRequestFullscreen) {
                elem.webkitRequestFullscreen();
            } else if (elem.msRequestFullscreen) {
                elem.msRequestFullscreen();
            }
            fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i> Sair da Tela Cheia';
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Tela Cheia';
        }
    });
    
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement) {
            fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i> Tela Cheia';
        }
    });
    
    exportBtn.addEventListener('click', () => {
        if (appState.channels.length === 0) {
            showNotification('Nenhuma lista para exportar', 'error');
            return;
        }
        
        let m3uContent = '#EXTM3U\n';
        m3uContent += `#PLAYLIST: VISIONSTREAM PRO Export\n`;
        m3uContent += `#EXTGRP:${appState.categories.join(';')}\n`;
        
        appState.channels.forEach(channel => {
            m3uContent += `#EXTINF:-1 tvg-id="" tvg-name="${channel.name}" tvg-logo="${channel.logo}" group-title="${channel.group}",${channel.name}\n`;
            m3uContent += `${channel.url}\n`;
        });
        
        const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `visionstream_${new Date().toISOString().slice(0,10)}.m3u`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification('Lista exportada com sucesso!', 'success');
    });
    
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
    
    // ==================== INICIALIZAÇÃO ====================
    initSystem();
    
    // Funções globais
    window.parseM3U = parseM3U;
    window.showNotification = showNotification;
});
