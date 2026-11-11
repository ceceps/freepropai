import { ScrapingOrchestratorService } from '../src/services/scrapingOrchestrator.service';

const SOURCES = [
  {
    sourceName: 'acehome',
    sourceUrl: 'https://www.acehome.co.id/?reg=BBR&kat=rumah',
    maxPages: 2,
  },
  {
    sourceName: 'hepihos',
    sourceUrl: 'https://hepihos.com/cecep-saefulloh',
    maxPages: 2,
  },
  {
    sourceName: 'prolov',
    sourceUrl: 'https://prolov.id',
    maxPages: 1,
  },
];

async function main() {
  const orchestrator = new ScrapingOrchestratorService();
  const summary: Array<{ sourceName: string; status: string; found?: number; error?: string }> = [];

  for (const source of SOURCES) {
    console.log(`Starting scrape for ${source.sourceName}: ${source.sourceUrl}`);
    try {
      const job = await orchestrator.runJob(source);
      summary.push({
        sourceName: source.sourceName,
        status: job.status,
        found: job.totalListingsFound,
        error: job.errorMessage || undefined,
      });
      console.log(`${source.sourceName}: ${job.status} (${job.totalListingsFound ?? 0} listings)`);
    } catch (error: any) {
      summary.push({
        sourceName: source.sourceName,
        status: 'failed',
        error: error.message,
      });
      console.error(`${source.sourceName} failed: ${error.message}`);
    }
  }

  console.log(JSON.stringify({ ok: true, summary }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
