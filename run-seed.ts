import { runAutoSeeder } from "./src/lib/db/seeder";
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

runAutoSeeder().then(console.log).catch(console.error);
