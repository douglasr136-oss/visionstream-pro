// server.js - VISIONSTREAM PRO BACKEND (COMPLETO)
const express = require('express');
const cors = require('cors');
const https = require('https');
const http = require('http');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 10000;

// ==================== CONFIGURAÇÃO CORS ====================
app.use(cors({
    origin: '*',
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Accept']
}));

// Headers CORS manuais
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    next();
});

app.use(express.json());

// ==================== PROVEDORES ====================
const PROVIDERS = {
    'provider1': {
        name: 'Provedor Principal',
        url: 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts'
    },
    'provider2': {
        name: 'Provedor Secundário',
        url: 'http://example.com/playlist.m3u'
    }
};

// ==================== FUNÇÃO PARA BUSCAR M3U ====================
function fetchM3U(url) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const protocol = isHttps ? https : http;
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    'Connection': 'keep-alive'
                },
                timeout: 25000
            };
            
            console.log(`🌐 Conectando a: ${urlObj.hostname}`);
            
            const req = protocol.request(options, (res) => {
                let data = '';
                let statusCode = res.statusCode;
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`✅ Resposta: ${statusCode}, ${data.length} bytes`);
                    
                    if (statusCode >= 200 && statusCode < 300) {
                        resolve({
                            success: true,
                            status: statusCode,
                            data: data,
                            headers: res.headers
                        });
                    } else {
                        reject(new Error(`HTTP ${statusCode}`));
                    }
                });
            });
            
            req.on('error', (err) => {
                console.error('❌ Erro de conexão:', err.message);
                reject(err);
            });
            
            req.on('timeout', () => {
                console.error('⏰ Timeout na conexão');
                req.destroy();
                reject(new Error('Timeout após 25 segundos'));
            });
            
            req.end();
            
        } catch (error) {
            console.error('❌ Erro ao parsear URL:', error.message);
            reject(error);
        }
    });
}

// ==================== ROTA DE SAÚDE ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO Proxy',
        version: '2.0.1',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        providers: Object.keys(PROVIDERS).length
    });
});

// ==================== ROTA PRINCIPAL ====================
// ==================== ROTA PRINCIPAL (VERSÃO CORRIGIDA) ====================
app.get('/api/playlist', async (req, res) => {
    console.log('\n' + '='.repeat(60));
    console.log('📥 REQUISIÇÃO /api/playlist RECEBIDA');
    console.log('='.repeat(60));
    
    console.log('📍 Origem:', req.headers.origin || 'Desconhecida');
    console.log('📋 Query params:', req.query);
    
    try {
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            console.error(`❌ Provedor ${providerId} não encontrado`);
            
            // ENVIA HEADERS CORS ANTES DO ERRO
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado');
        }
        
        console.log(`📡 Provedor selecionado: ${provider.name}`);
        console.log(`🔗 Tentando conectar ao provedor...`);
        
        // Tenta buscar do provedor real
        let m3uContent = '';
        try {
            const result = await fetchM3U(provider.url);
            m3uContent = result.data;
            console.log(`✅ Conexão bem-sucedida: ${m3uContent.length} bytes`);
            
        } catch (providerError) {
            console.error('❌ ERRO na conexão com o provedor:', providerError.message);
            console.log('🔄 Usando playlist de fallback...');
            
            // Fallback SIMPLES - APENAS PARA TESTE
            m3uContent = `#EXTM3U
# Playlist de Teste - VisionStream PRO
# Provedor: ${provider.name}
# Data: ${new Date().toLocaleString('pt-BR')}
# Status: Modo de testes ativado

#EXTINF:-1 tvg-id="teste1" tvg-name="GLOBO HD TESTE" group-title="Abertos",GLOBO HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="teste2" tvg-name="SBT HD TESTE" group-title="Abertos",SBT HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="teste3" tvg-name="RECORD HD TESTE" group-title="Abertos",RECORD HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="teste4" tvg-name="BAND HD TESTE" group-title="Abertos",BAND HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="teste5" tvg-name="HBO HD TESTE" group-title="Filmes",HBO HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="teste6" tvg-name="ESPN HD TESTE" group-title="Esportes",ESPN HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# Canais: 6
# Esta é uma lista de teste do VisionStream PRO`;
        }
        
        // Contar canais
        const channelCount = (m3uContent.match(/#EXTINF:/g) || []).length;
        console.log(`🎯 Canais processados: ${channelCount}`);
        
        // Adicionar cabeçalho VisionStream
        const enhancedPlaylist = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
# Status: Online
${m3uContent}`;
        
        // ===== HEADERS CRUCIAIS =====
        // CORS PRIMEIRO, SEMPRE
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS, POST');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, Accept');
        
        // Headers de conteúdo
        res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        
        // Headers personalizados
        res.setHeader('X-VisionStream-Status', 'OK');
        res.setHeader('X-VisionStream-Channels', channelCount);
        res.setHeader('X-VisionStream-Provider', provider.name);
        
        console.log(`📤 Enviando resposta com ${channelCount} canais`);
        console.log('✅ Headers enviados:', {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'audio/x-mpegurl',
            'X-VisionStream-Channels': channelCount
        });
        console.log('='.repeat(60) + '\n');
        
        // ENVIAR A RESPOSTA FINAL
        res.status(200).send(enhancedPlaylist);
        
    } catch (error) {
        console.error('💥 ERRO FATAL NO SERVIDOR:', error.message);
        
        // MESMO EM ERRO, ENVIAR HEADERS CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        
        const errorPlaylist = `#EXTM3U
# VisionStream PRO - Servidor Online
# Erro: ${error.message}
# Data: ${new Date().toLocaleString('pt-BR')}

#EXTINF:-1,ERRO NO SERVIDOR - Tente novamente
http://example.com/error`;
        
        res.status(500).send(errorPlaylist);
    }
});
// ==================== ROTA DE TESTE ====================
app.get('/api/test', (req, res) => {
    console.log('✅ Rota de teste acessada');
    
    const testM3U = `#EXTM3U
#EXTINF:-1 tvg-id="test1" tvg-name="TESTE 1" group-title="Testes",Canal de Teste 1
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="test2" tvg-name="TESTE 2" group-title="Testes",Canal de Teste 2
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# Playlist de teste - VisionStream PRO
# Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    
    res.setHeader('Content-Type', 'audio/x-mpegurl');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(testM3U);
});

// ==================== ROTA DE PROVEDORES ====================
app.get('/api/providers', (req, res) => {
    const providersList = Object.entries(PROVIDERS).map(([id, config]) => ({
        id: id,
        name: config.name,
        url: config.url.replace(/password=[^&]*/, 'password=***')
    }));
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.json({
        success: true,
        count: providersList.length,
        providers: providersList,
        timestamp: new Date().toISOString()
    });
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════════╗
    ║                 VISIONSTREAM PRO BACKEND                    ║
    ╠══════════════════════════════════════════════════════════════╣
    ║   🚀  Servidor rodando na porta ${PORT}                     ║
    ║   ✅  CORS CONFIGURADO - Aceita todas as origens            ║
    ║   📡  Provedores: ${Object.keys(PROVIDERS).length}           ║
    ╠══════════════════════════════════════════════════════════════╣
    ║   🔗  Health:      /health                                  ║
    ║   📋  Playlist:    /api/playlist?provider=provider1         ║
    ║   🧪  Teste:       /api/test                                ║
    ║   📊  Provedores:  /api/providers                           ║
    ╚══════════════════════════════════════════════════════════════╝
    `);
    
    console.log('👁️  Logs detalhados ativados');
    console.log('📡 Pronto para receber requisições...\n');
});
