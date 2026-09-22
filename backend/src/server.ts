import 'dotenv/config';
import { createApp } from './app';

// Backend API port (frontend runs on a different port: 3000)
const port = Number(process.env.PORT ?? 5000);

createApp().listen(port, () => {
  console.log(`Backend API listening on http://localhost:${port}`);
});
