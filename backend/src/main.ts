import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
const GuacamoleLite = require('guacamole-lite');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(3000);
  const server = app.getHttpServer();
  
  console.log('VDI Backend running on port 3000');

  const guacdNodes = [
    { host: '101.47.159.90', port: 4822 },
    { host: '101.47.159.85', port: 4822 },
    { host: '101.47.159.88', port: 4822 },
  ];

  // [CHUẨN] Đọc từ biến môi trường, có fallback
  const GUAC_KEY = process.env.GUAC_CRYPT_KEY || 'MySuperSecretKeyForEncryption123';

  // Log ra để debug xem nó nhận key gì (xóa đi khi deploy thật)
  console.log(`[VDI] Using Encryption Key: ${GUAC_KEY === 'MySuperSecretKeyForEncryption123' ? 'Default' : 'Custom from ENV'}`);

  const clientOptions = {
    crypt: {
      cypher: 'AES-256-CBC',
      key: GUAC_KEY,
    },
    log: { level: 'INFO' },
    maxInactivityTime: 0
  };

  const guacCallbacks = {
    processConnectionSettings: function (settings, callback) {
      if (!settings || !settings.connection) {
        return callback(new Error('Missing connection settings'));
      }
      try {
         const connection = settings.connection;
         const targetSettings = connection.settings ? connection.settings : connection;
         
         // Normalize logic giữ nguyên
         const normalizeDimension = (value: unknown, multiple = 4, min = 100) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return undefined;
            const intVal = Math.max(min, Math.floor(n));
            return intVal - (intVal % multiple);
         };

         if (settings.width) targetSettings.width = normalizeDimension(settings.width);
         if (settings.height) targetSettings.height = normalizeDimension(settings.height);
         if (settings.dpi) targetSettings.dpi = Math.round(Number(settings.dpi));

         callback(null, settings);
      } catch (e) {
         callback(e);
      }
    }
  };

  guacdNodes.forEach((node, index) => {
    new GuacamoleLite(
      { server, path: `/guaclite${index}` },
      node, 
      clientOptions,
      guacCallbacks
    );
    console.log(`[VDI] 🚀 Mounted: /guaclite${index} -> ${node.host}`);
  });
}
bootstrap();