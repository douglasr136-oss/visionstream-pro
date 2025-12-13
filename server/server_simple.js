// server_simple.js - VERSÃO ULTRA SIMPLES
const express = require('express');
const app = express();

app.use(require('cors')());

// ROTA SEM VALIDAÇÃO NENHUMA
app.get('/api/playlist', (req, res) => {
    console.log('✅ Playlist acessada');
    res.set('Content-Type', 'audio/x-mpegurl');
    res.send(`#EXTM3U
#EXTINF:-1,Teste VisionStream
http://example.com/test.m3u8`);
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

app.get('/', (req, res) => {
    res.send('VisionStream Proxy Online!');
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
    console.log('🚀 Servidor simples rodando na porta', port);
});
