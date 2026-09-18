process.env.NODE_ENV ??= "test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.DATABASE_URL ??=
  "postgresql://pos_user:pos_password@localhost:5434/restaurant_pos";
process.env.JWT_SECRET ??= "test-jwt-secret-change-me";
process.env.JWT_EXPIRES_IN ??= "15m";
process.env.CORS_ORIGIN ??= "http://localhost:5173";
process.env.PORT ??= "3000";

import "elysia/type-system/format";
