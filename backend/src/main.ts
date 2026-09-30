import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.FRONTEND_URL || true, credentials: true });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`EasyDukan API ready → http://localhost:${port}/graphql`);
}
bootstrap();
