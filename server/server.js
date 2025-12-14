// server.js - VISIONSTREAM PRO (CONEXÃO DIRETA COM JSON RESPONSE)
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CONFIGURAÇÃO ====================
app.use(cors({
    origin: ['https://visionstream-app.onrender.com', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());

// ==================== SEUS PROVEDORES REAIS ====================
const PROVIDERS = {
    // PROVEDOR 1 - Caderno Online (SEU LINK ORIGINAL)
    'provider1': {
        name: 'Provedor Principal',
        url: 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts',
        method: 'GET'
    },
    
    // PROVEDOR 2 - Adicione outros aqui
    'provider2': {
        name: 'Provedor Secundário', 
        url: 'http://outroprovedor.com/api.php?user=cliente&pass=senha&type=m3u',
        method: 'GET'
    }
};

// ==================== FUNÇÃO DE CONEXÃO DIRETA ====================
function fetchDirect(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const transport = isHttps ? https : http;
        
        const reqOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'User-Agent': 'VISIONSTREAM-PRO/2.0',
                'Accept': 'audio/x-mpegurl, application/x-mpegurl, text/plain, */*',
                'Connection': 'keep-alive',
                ...options.headers
            },
            timeout: 20000
        };
        
        console.log(`🌐 Conectando DIRETAMENTE a: ${urlObj.hostname}`);
        
        const req = transport.request(reqOptions, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`✅ Resposta recebida: ${res.statusCode}, ${data.length} bytes`);
                
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve({
                        success: true,
                        status: res.statusCode,
                        data: data,
                        headers: res.headers
                    });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
                }
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Erro na conexão direta:', err.message);
            reject(err);
        });
        
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Timeout de 20 segundos'));
        });
        
        req.end();
    });
}

// ==================== FUNÇÃO PARA CONVERTER M3U → JSON ====================
function parseM3UToJSON(m3uContent) {
    const channels = [];
    const lines = m3uContent.split('\n');
    
    let currentChannel = {};
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Linha #EXTINF: contém metadados do canal
        if (line.startsWith('#EXTINF:')) {
            currentChannel = {};
            
            // Extrai duração (se existir)
            const durationMatch = line.match(/#EXTINF:([-\d.]+)/);
            currentChannel.duration = durationMatch ? durationMatch[1] : '-1';
            
            // Extrai nome do canal (depois da última vírgula)
            const nameMatch = line.match(/,(.*)$/);
            currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Canal sem nome';
            
            // Extrai atributos (tvg-id, tvg-name, group-title)
            const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
            currentChannel.tvgId = tvgIdMatch ? tvgIdMatch[1] : '';
            
            const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
            currentChannel.tvgName = tvgNameMatch ? tvgNameMatch[1] : currentChannel.name;
            
            const groupMatch = line.match(/group-title="([^"]*)"/);
            currentChannel.groupTitle = groupMatch ? groupMatch[1] : 'Sem categoria';
            
            // Adiciona ID único
            currentChannel.id = `channel_${channels.length + 1}`;
            
        } 
        // Linha de URL (não começa com #) - finaliza o canal
        else if (line && !line.startsWith('#') && Object.keys(currentChannel).length > 0) {
            currentChannel.url = line;
            
            // Adiciona informações adicionais
            currentChannel.type = 'mpegts';
            currentChannel.logo = currentChannel.tvgId ? 
                `https://logo.iptvcdn.com/${currentChannel.tvgId}.png` : '';
            
            channels.push({...currentChannel});
            currentChannel = {};
        }
    }
    
    return channels;
}

// ==================== ROTA PRINCIPAL (VERSÃO JSON) ====================
app.get('/api/playlist', async (req, res) => {
    try {
        // 1. VALIDAÇÃO DA CHAVE
        const apiKey = req.query.api_key || req.headers['x-api-key'];
        const validApiKey = process.env.API_KEY || 'visionstream_prod_1735661234';
        
        console.log(`🔑 API Key recebida: ${apiKey}`);
        console.log(`🔑 API Key esperada: ${validApiKey}`);
        
        if (!apiKey || apiKey !== validApiKey) {
            return res.status(403).json({ 
                success: false, 
                error: 'Acesso não autorizado',
                message: 'API Key inválida ou ausente' 
            });
        }
        
        // 2. IDENTIFICA PROVEDOR
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            return res.status(400).json({ 
                success: false, 
                error: 'Provedor não encontrado',
                available: Object.keys(PROVIDERS) 
            });
        }
        
        console.log(`📡 Buscando: ${provider.name}`);
        console.log(`🔗 URL: ${provider.url}`);
        
        // 3. TENTA CONEXÃO DIRETA
        let m3uContent = '';
        try {
            const result = await fetchDirect(provider.url);
            
            if (!result.data || result.data.trim() === '') {
                throw new Error('Resposta vazia do provedor');
            }
            
            m3uContent = result.data;
            console.log(`✅ Conexão direta: ${m3uContent.length} bytes`);
            
        } catch (directError) {
            console.error('❌ Falha na conexão direta:', directError.message);
            
            // Fallback com node-fetch
            try {
                const fetch = (await import('node-fetch')).default;
                const response = await fetch(provider.url, {
                    headers: { 'User-Agent': 'VISIONSTREAM-PRO/2.0' },
                    timeout: 15000
                });
                
                if (response.ok) {
                    m3uContent = await response.text();
                    console.log(`✅ Fallback OK: ${m3uContent.length} bytes`);
                } else {
                    throw new Error(`HTTP ${response.status}`);
                }
            } catch (fetchError) {
                console.error('❌ Todos os métodos falharam');
                return res.status(502).json({
                    success: false,
                    error: 'Falha na conexão com o provedor',
                    provider: provider.name,
                    message: fetchError.message
                });
            }
        }
        
        // 4. CONVERTE M3U PARA JSON
        const channels = parseM3UToJSON(m3uContent);
        
        if (channels.length === 0) {
            console.warn('⚠️ Nenhum canal extraído do M3U');
            // Log apenas dos primeiros caracteres para debug
            console.log('Primeiros 500 chars do M3U:', m3uContent.substring(0, 500));
        }
        
        console.log(`🎯 ${channels.length} canais convertidos para JSON`);
        
        // 5. RETORNA JSON (FORMATO ESPERADO PELO FRONTEND)
        res.json({
            success: true,
            count: channels.length,
            provider: provider.name,
            lastUpdated: new Date().toISOString(),
            channels: channels
        });
        
    } catch (error) {
        console.error('💥 Erro fatal na rota /api/playlist:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            message: error.message
        });
    }
});

// ==================== ROTAS ADICIONAIS ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO (Direct Connection - JSON)',
        timestamp: new Date().toISOString(),
        providers: Object.keys(PROVIDERS).length
    });
});

app.get('/api/providers', (req, res) => {
    const providersList = Object.entries(PROVIDERS).map(([id, config]) => ({
        id,
        name: config.name,
        url: config.url.replace(/password=[^&]*/, 'password=***')
    }));
    
    res.json({
        success: true,
        providers: providersList
    });
});

// ==================== ROTA DE TESTE M3U (OPCIONAL) ====================
app.get('/api/playlist/m3u', async (req, res) => {
    // Rota alternativa que retorna M3U puro (para testes)
    try {
        const apiKey = req.query.api_key;
        const validApiKey = process.env.API_KEY || 'visionstream_prod_1735661234';
        
        if (!apiKey || apiKey !== validApiKey) {
            return res.status(403).send('#EXTM3U\n# Erro: Acesso não autorizado');
        }
        
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        const result = await fetchDirect(provider.url);
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.send(result.data);
        
    } catch (error) {
        res.status(500).send('#EXTM3U\n# Erro interno do servidor');
    }
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════╗
    ║   VISIONSTREAM PRO (JSON API)                   ║
    ║   🚀 Servidor rodando na porta ${PORT}          ║
    ╠══════════════════════════════════════════════════╣
    ║   Formato: JSON (frontend Vue.js)               ║
    ║   Provedores: ${Object.keys(PROVIDERS).length} configurados ║
    ║   Health: http://localhost:${PORT}/health        ║
    ║   API Playlist: /api/playlist?api_key=...       ║
    ╚══════════════════════════════════════════════════╝
    `);
});
