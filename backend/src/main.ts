require('dotenv').config();
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as crypto from 'crypto';
const GuacamoleLite = require('guacamole-lite');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const server = app.getHttpServer();

  // 1. Lấy cấu hình Worker (từ docker-compose)
  const GUACD_HOST = process.env.GUACD_HOST || '127.0.0.1';
  const GUACD_PORT = 4822;
  const GUAC_KEY = process.env.GUAC_CRYPT_KEY || 'MySuperSecretKeyForEncryption123';

  console.log(`✅ VDI Node Started. Target: ${GUACD_HOST}`);

  // 2. Tắt mã hóa thư viện để ta tự xử lý (Chống lỗi Crash)
  const clientOptions = {
    crypt: null, 
    log: { level: 'DEBUG' }
  };

  // 3. Hàm giải mã Token (Chống lỗi Double Token)
  const decryptToken = (tokenInput: any) => {
    try {
      // [FIX CRASH] Nếu token là mảng, lấy cái đầu tiên
      let tokenStr = tokenInput;
      if (Array.isArray(tokenInput)) {
        console.warn('⚠️ Detected Double Token, auto-fixing...');
        tokenStr = tokenInput[0];
      }

      if (!tokenStr) throw new Error('Empty token');

      // Giải mã
      const jsonStr = Buffer.from(tokenStr, 'base64').toString('utf8');
      const payload = JSON.parse(jsonStr);
      
      const iv = Buffer.from(payload.iv, 'base64');
      const encryptedText = Buffer.from(payload.value, 'base64');
      
      const decipher = crypto.createDecipheriv('aes-256-cbc', GUAC_KEY, iv);
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return JSON.parse(decrypted.toString());
    } catch (e) {
      console.error(`❌ Decrypt Error: ${e.message}`);
      return null;
    }
  };

  // 4. Callback
  const guacCallbacks = {
    processConnectionSettings: function (settings, callback) {
      // Tự giải mã
      const decrypted = decryptToken(settings.token);
      if (!decrypted) {
        return callback(new Error('Token validation failed'));
      }

      // Lấy thông tin kết nối
      const connection = decrypted.connection;
      const targetSettings = connection.settings || connection;
      
      // Fix màn hình
      const normalizeDimension = (value) => {
          const n = Number(value);
          return Number.isFinite(n) ? Math.max(100, Math.floor(n)) : undefined;
      };

      if (settings.width) targetSettings.width = normalizeDimension(settings.width);
      if (settings.height) targetSettings.height = normalizeDimension(settings.height);
      if (settings.dpi) targetSettings.dpi = Number(settings.dpi);

      console.log(`🎯 [Connected] VM: ${targetSettings.hostname}`);
      
      // Trả về settings đã giải mã
      callback(null, decrypted);
    }
  };

  // 5. Khởi tạo (Path chung /guaclite để Nginx rewrite vào)
  new GuacamoleLite(
    { server, path: '/guaclite' }, 
    { host: GUACD_HOST, port: GUACD_PORT }, 
    clientOptions, 
    guacCallbacks
  );

  await app.listen(3000);
}
bootstrap();