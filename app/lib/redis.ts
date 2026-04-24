
import Redis from 'ioredis';

const redisUrl = process.env.REDIS || 'redis://localhost:6379';

// Loguear URL (sin password) para depuración en producción
const logUrl = redisUrl.replace(/:[^:@]+@/, ':****@');
console.log(`[Redis] Intentando conectar a: ${logUrl}`);

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis = globalForRedis.redis ?? new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Manejar errores de conexión de forma silenciosa para evitar crasheos
redis.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    // No loguear excesivamente en producción si no es necesario
    console.warn(`[Redis] Error de conexión: ${err.message}. Verifique la variable REDIS.`);
  } else {
    console.error('[Redis] Error:', err);
  }
});

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;

export default redis;
