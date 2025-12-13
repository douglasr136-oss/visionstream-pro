# VISIONSTREAM PRO - Sistema Completo de IPTV

Sistema profissional para revenda de IPTV com frontend e backend integrados.

## 🚀 Implantação Rápida no Render

1. **Faça push** deste repositório para o GitHub
2. **Acesse** [dashboard.render.com](https://dashboard.render.com)
3. **Clique em "New +" → "Blueprint"**
4. **Conecte este repositório**
5. **Clique em "Apply"** - O Render faz todo o resto!

## 🔧 Configuração Pós-Deploy

Após o deploy:

1. **Acesse o dashboard do Render**
2. **Vá para o serviço `visionstream-proxy`**
3. **Copie a `API_KEY`** gerada automaticamente
4. **Atualize** no `public/script.js`:
   ```javascript
   const API_KEY = 'COLE_A_CHAVE_AQUI';
