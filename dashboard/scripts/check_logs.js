import { fetchCrawlLogs } from '../supabase.js';

async function check() {
    try {
        console.log('Fetching crawl logs...');
        const { data, count } = await fetchCrawlLogs();
        console.log(`Total logs in table: ${count}`);
        console.log('All logs (ID desc):');
        // Sort by ID descending client-side since fetchCrawlLogs has fixed order
        data.sort((a, b) => b.id - a.id).forEach(log => {
            console.log(`- ID: ${log.id}, Job: ${log.job_name}, Status: ${log.status}, Started: ${log.started_at}, Finished: ${log.finished_at}`);
        });
    } catch (error) {
        console.error('Error fetching logs:', error);
    }
}

check();
