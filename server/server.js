// server.js - VISIONSTREAM PRO BACKEND (COM LOGS DETALHADOS)
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

// Middleware para logs
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('📍 Origem:', req.headers.origin || 'N/A');
    console.log('👤 User-Agent:', req.headers['user-agent']?.substring(0, 50) || 'N/A');
    next();
});

// ==================== PROVEDORES ====================
const PROVIDERS = {
    'provider1': {
        name: 'Provedor Principal (Caderno.Online)',
        url: 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts'
    },
    'provider2': {
        name: 'Provedor Secundário (Teste)',
        url: 'http://example.com/playlist.m3u'
    }
};

// ==================== FUNÇÃO PARA BUSCAR M3U (COM LOGS DETALHADOS) ====================
function fetchM3U(url) {
    return new Promise((resolve, reject) => {
        try {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const protocol = isHttps ? https : http;
            
            console.log(`🔍 Detalhes da URL analisada:`);
            console.log(`   - Protocolo: ${urlObj.protocol}`);
            console.log(`   - Hostname: ${urlObj.hostname}`);
            console.log(`   - Porta: ${urlObj.port || (isHttps ? '443 (padrão HTTPS)' : '80 (padrão HTTP)')}`);
            console.log(`   - Caminho: ${urlObj.pathname + urlObj.search}`);
            
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': '*/*',
                    'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Referer': 'http://caderno.online/',
                    'DNT': '1'
                },
                timeout: 30000,
                rejectUnauthorized: false // Permite certificados auto-assinados (para testes)
            };
            
            console.log(`🌐 Conectando a: ${urlObj.hostname} (${urlObj.protocol})`);
            console.log(`📡 Opções da requisição:`, {
                hostname: options.hostname,
                port: options.port,
                path: options.path.substring(0, 100) + (options.path.length > 100 ? '...' : ''),
                timeout: options.timeout
            });
            
            const req = protocol.request(options, (res) => {
                let data = '';
                let statusCode = res.statusCode;
                
                console.log(`📥 Resposta recebida do servidor:`);
                console.log(`   - Status: HTTP ${statusCode} ${res.statusMessage}`);
                console.log(`   - Content-Type: ${res.headers['content-type'] || 'Não informado'}`);
                console.log(`   - Content-Length: ${res.headers['content-length'] || 'Desconhecido'} bytes`);
                console.log(`   - Headers:`, JSON.stringify(res.headers, null, 2));
                
                res.setEncoding('utf8');
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    console.log(`✅ Resposta completa: ${data.length} bytes`);
                    
                    // Log dos primeiros 500 caracteres para debug
                    const preview = data.substring(0, 500);
                    console.log(`📄 Prévia do conteúdo (primeiros 500 chars):\n${preview}${data.length > 500 ? '...' : ''}`);
                    
                    if (statusCode >= 200 && statusCode < 300) {
                        // Verifica se é um M3U válido
                        if (data.includes('#EXTM3U') || data.includes('#EXTINF')) {
                            console.log(`🎯 Conteúdo M3U válido detectado!`);
                            resolve({
                                success: true,
                                status: statusCode,
                                data: data,
                                headers: res.headers
                            });
                        } else {
                            console.warn(`⚠️ Resposta HTTP ${statusCode} mas não parece ser M3U válido`);
                            console.warn(`🔍 Conteúdo recebido: ${data.substring(0, 200)}`);
                            reject(new Error(`Resposta não é M3U válido (HTTP ${statusCode})`));
                        }
                    } else {
                        console.error(`❌ Erro HTTP do servidor: ${statusCode} ${res.statusMessage}`);
                        reject(new Error(`HTTP ${statusCode}: ${res.statusMessage}`));
                    }
                });
            });
            
            req.on('error', (err) => {
                console.error(`❌ Erro de conexão com ${urlObj.hostname}:`);
                console.error(`   - Código: ${err.code}`);
                console.error(`   - Mensagem: ${err.message}`);
                console.error(`   - Stack: ${err.stack}`);
                reject(err);
            });
            
            req.on('timeout', () => {
                console.error(`⏰ Timeout na conexão com ${urlObj.hostname} após ${options.timeout}ms`);
                req.destroy();
                reject(new Error(`Timeout após ${options.timeout}ms`));
            });
            
            req.on('socket', (socket) => {
                console.log(`🔌 Socket criado para ${urlObj.hostname}`);
                socket.on('error', (err) => {
                    console.error(`🔌 Erro no socket: ${err.message}`);
                });
            });
            
            console.log(`🚀 Enviando requisição para ${urlObj.hostname}...`);
            req.end();
            
        } catch (error) {
            console.error(`❌ Erro ao analisar/processar URL ${url}:`);
            console.error(`   - Tipo: ${error.name}`);
            console.error(`   - Mensagem: ${error.message}`);
            console.error(`   - Stack: ${error.stack}`);
            reject(error);
        }
    });
}

// ==================== ROTA DE SAÚDE ====================
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'VISIONSTREAM PRO Proxy (Debug Mode)',
        version: '2.0.1-debug',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        providers: Object.keys(PROVIDERS).length,
        memory: process.memoryUsage()
    });
});

// ==================== ROTA PRINCIPAL (COM LOGS COMPLETOS) ====================
app.get('/api/playlist', async (req, res) => {
    console.log('\n' + '='.repeat(70));
    console.log('📥 REQUISIÇÃO /api/playlist RECEBIDA - INICIANDO PROCESSAMENTO');
    console.log('='.repeat(70));
    
    console.log('📋 Query params:', req.query);
    console.log('🔍 Provider solicitado:', req.query.provider || 'provider1 (padrão)');
    console.log('📍 Origem da requisição:', req.headers.origin || 'Desconhecida');
    
    try {
        const providerId = req.query.provider || 'provider1';
        const provider = PROVIDERS[providerId];
        
        if (!provider) {
            console.error(`❌ Provedor "${providerId}" não encontrado na configuração`);
            console.error(`   Provedores disponíveis: ${Object.keys(PROVIDERS).join(', ')}`);
            
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            return res.status(400).send('#EXTM3U\n# Erro: Provedor não encontrado\n# Provedores disponíveis: ' + Object.keys(PROVIDERS).join(', '));
        }
        
        console.log(`📡 Provedor selecionado: ${provider.name}`);
        console.log(`🔗 URL do provedor: ${provider.url}`);
        console.log(`🕐 Iniciando tentativa de conexão em: ${new Date().toISOString()}`);
        
        // Tenta buscar do provedor real
        let m3uContent = '';
        let usedFallback = false;
        let fetchError = null;
        
        try {
            console.log(`🔄 Tentando buscar playlist REAL de: ${provider.url}`);
            console.log(`⏳ Aguardando resposta do servidor remoto...`);
            
            const startTime = Date.now();
            const result = await fetchM3U(provider.url);
            const endTime = Date.now();
            
            console.log(`✅ Conexão bem-sucedida! Tempo total: ${endTime - startTime}ms`);
            console.log(`✅ Playlist real obtida: ${result.data.length} bytes`);
            
            m3uContent = result.data;
            usedFallback = false;
            
            // Verifica conteúdo
            if (m3uContent.includes('#EXTM3U')) {
                console.log(`🎯 Conteúdo confirmado: É um arquivo M3U válido!`);
            } else {
                console.warn(`⚠️ ATENÇÃO: Conteúdo recebido não contém #EXTM3U`);
                console.warn(`📄 Amostra do conteúdo: ${m3uContent.substring(0, 300)}`);
            }
            
        } catch (providerError) {
            // CAPTURA E LOG DO ERRO REAL
            fetchError = providerError;
            console.error(`\n❌❌❌ FALHA CRÍTICA AO BUSCAR DO PROVEDOR REAL ❌❌❌`);
            console.error(`❌ Tipo do erro: ${providerError.name}`);
            console.error(`❌ Mensagem do erro: ${providerError.message}`);
            console.error(`❌ Stack do erro completo:`);
            console.error(providerError.stack);
            console.error(`❌❌❌ FIM DO ERRO ❌❌❌\n`);
            
            console.log(`🔄 Usando playlist de fallback devido ao erro acima...`);
            
            // Fallback: playlist de teste
            m3uContent = `#EXTM3U
# Playlist de Fallback - VisionStream PRO
# Provedor: ${provider.name}
# Data: ${new Date().toLocaleString('pt-BR')}
# Status: ❌ NÃO FOI POSSÍVEL CONECTAR AO PROVEDOR PRINCIPAL
# Erro: ${providerError.message}
# Tempo: ${new Date().toISOString()}

#EXTINF:-1 tvg-id="globo.br" tvg-name="GLOBO HD" tvg-logo="https://i.imgur.com/globo.png" group-title="Abertos",GLOBO HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="sbt.br" tvg-name="SBT HD" tvg-logo="https://i.imgur.com/sbt.png" group-title="Abertos",SBT HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="record.br" tvg-name="RECORD HD" tvg-logo="https://i.imgur.com/record.png" group-title="Abertos",RECORD HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="band.br" tvg-name="BAND HD" tvg-logo="https://i.imgur.com/band.png" group-title="Abertos",BAND HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="hbo.br" tvg-name="HBO HD" tvg-logo="https://i.imgur.com/hbo.png" group-title="Filmes",HBO HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="espn.br" tvg-name="ESPN HD" tvg-logo="https://i.imgur.com/espn.png" group-title="Esportes",ESPN HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

#EXTINF:-1 tvg-id="disney.br" tvg-name="DISNEY HD" tvg-logo="https://i.imgur.com/disney.png" group-title="Infantil",DISNEY HD
https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8

# Canais: 7
# Esta é uma lista de fallback porque não foi possível conectar ao provedor principal`;
            
            usedFallback = true;
            console.log(`🔄 Fallback gerado: ${m3uContent.length} bytes`);
        }
        
        // Contar canais
        const channelCount = (m3uContent.match(/#EXTINF:/g) || []).length;
        console.log(`🎯 Total de canais no conteúdo: ${channelCount}`);
        console.log(`📊 Usou fallback? ${usedFallback ? 'SIM ❌' : 'NÃO ✅'}`);
        
        // Adicionar cabeçalho VisionStream
        const enhancedPlaylist = `#EXTM3U
# Playlist: ${provider.name}
# Processado por: VISIONSTREAM PRO
# Data: ${new Date().toLocaleString('pt-BR')}
# Canais: ${channelCount}
# Status: ${usedFallback ? 'FALLBACK (Provedor offline)' : 'ONLINE (Conexão bem-sucedida)'}
${usedFallback && fetchError ? `# Erro Original: ${fetchError.message}\n` : ''}
${m3uContent}`;
        
        // Configurar headers de resposta
        res.setHeader('Content-Type', 'audio/x-mpegurl; charset=utf-8');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.setHeader('X-VisionStream-Channels', channelCount);
        res.setHeader('X-VisionStream-Provider', provider.name);
        res.setHeader('X-VisionStream-Status', usedFallback ? 'fallback' : 'live');
        res.setHeader('X-VisionStream-Version', '2.0.1-debug');
        
        console.log(`📤 Enviando resposta ao frontend:`);
        console.log(`   - Canais: ${channelCount}`);
        console.log(`   - Status: ${usedFallback ? 'FALLBACK' : 'LIVE'}`);
        console.log(`   - Tamanho: ${enhancedPlaylist.length} bytes`);
        console.log('='.repeat(70) + '\n');
        
        res.send(enhancedPlaylist);
        
    } catch (error) {
        console.error('\n💥💥💥 ERRO FATAL NO SERVIDOR (fora do try principal) 💥💥💥');
        console.error(`💥 Tipo: ${error.name}`);
        console.error(`💥 Mensagem: ${error.message}`);
        console.error(`💥 Stack completo:`);
        console.error(error.stack);
        console.error('💥💥💥 FIM DO ERRO FATAL 💥💥💥\n');
        
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        
        const errorPlaylist = `#EXTM3U
# VisionStream PRO - Erro Fatal no Servidor
# Erro: ${error.message}
# Data: ${new Date().toISOString()}
# Stack: ${error.stack.substring(0, 200)}...

#EXTINF:-1,ERRO NO SERVIDOR - Contate o suporte
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

// ==================== TESTE DIRETO DA URL ====================
app.get('/api/test-url', async (req, res) => {
    console.log('🧪 Teste direto da URL do caderno.online');
    
    try {
        const testUrl = 'http://caderno.online/get.php?username=Douglasr&password=478356523&type=m3u_plus&output=mpegts';
        console.log(`🔗 Testando URL: ${testUrl}`);
        
        const result = await fetchM3U(testUrl);
        
        res.json({
            success: true,
            status: result.status,
            length: result.data.length,
            preview: result.data.substring(0, 500),
            isM3U: result.data.includes('#EXTM3U'),
            headers: result.headers
        });
        
    } catch (error) {
        res.json({
            success: false,
            error: error.message,
            stack: error.stack,
            code: error.code
        });
    }
});

// ==================== INICIALIZAÇÃO ====================
app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════════════════╗
    ║               VISIONSTREAM PRO BACKEND (DEBUG)                  ║
    ╠══════════════════════════════════════════════════════════════════╣
    ║   🚀  Servidor rodando na porta ${PORT}                         ║
    ║   🔍  MODO DEBUG ATIVADO - Logs detalhados                      ║
    ║   📡  Provedores: ${Object.keys(PROVIDERS).length}               ║
    ╠══════════════════════════════════════════════════════════════════╣
    ║   🔗  Health:      /health                                      ║
    ║   📋  Playlist:    /api/playlist?provider=provider1             ║
    ║   🧪  Teste URL:   /api/test-url                                ║
    ║   🧪  Teste:       /api/test                                    ║
    ║   📊  Provedores:  /api/providers                               ║
    ╚══════════════════════════════════════════════════════════════════╝
    `);
    
    console.log('👁️  MODO DEBUG ATIVADO - Todos os logs serão detalhados');
    console.log('📡 Pronto para receber requisições...\n');
});
