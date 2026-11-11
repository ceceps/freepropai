import { ScrapingOrchestratorService } from '../src/services/scrapingOrchestrator.service';

async function main() {
  const orchestrator = new ScrapingOrchestratorService();
  const result = await orchestrator.rescrapeImportedMissingImages();
  console.log(JSON.stringify({
    scanned: result.scanned,
    missing: result.missing,
    refreshed: result.refreshed,
    failed: result.failed,
    skipped: result.skipped,
  }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
