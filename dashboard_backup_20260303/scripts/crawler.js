
/**
 * Daily Crawler Master Script
 * This script is executed by GitHub Actions to run all registered platform crawlers.
 */
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function runCrawlers() {
    console.log(`[${new Date().toISOString()}] Starting Daily Crawl...`);

    try {
        // 1. Musinsa Crawler (Python)
        console.log('--- Running Musinsa Crawler ---');
        execSync('python generic_crawler/musinsa_crawler.py', {
            cwd: rootDir,
            stdio: 'inherit'
        });

        // 2. SSG Department Store Crawler (Python + Playwright)
        console.log('--- Running SSG Department Store Crawler ---');
        execSync('python generic_crawler/ssg_crawler.py', {
            cwd: rootDir,
            stdio: 'inherit'
        });

        // 3. Olive Young Crawler
        console.log('--- Running Olive Young Crawler ---');
        execSync('python generic_crawler/oliveyoung_crawler.py', { cwd: rootDir, stdio: 'inherit' });

        // 4. Ably Crawler
        console.log('--- Running Ably Crawler ---');
        execSync('python generic_crawler/ably_crawler.py', { cwd: rootDir, stdio: 'inherit' });

        // 5. Naver Data Lab Crawler
        console.log('--- Running Naver Data Lab Crawler ---');
        execSync('python generic_crawler/naver_datalab_crawler.py', { cwd: rootDir, stdio: 'inherit' });

        // 6. Google Trends Crawler
        console.log('--- Running Google Trends Crawler ---');
        execSync('python generic_crawler/google_trends_crawler.py', { cwd: rootDir, stdio: 'inherit' });

        // 7. Global AI Analysis Processor
        console.log('--- Running Global AI Analysis Processor ---');
        execSync('python scripts/ai_processor.py', { cwd: rootDir, stdio: 'inherit' });

        console.log(`[${new Date().toISOString()}] Daily Crawl Completed Successfully.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Daily Crawl Failed:`, error.message);
        process.exit(1);
    }
}

runCrawlers();
