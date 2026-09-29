import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PipelineListingDetail } from '../../types';

const { getListing, importPipelineListing, generateCalendarForListing } = vi.hoisted(() => ({
  getListing: vi.fn(),
  importPipelineListing: vi.fn(),
  generateCalendarForListing: vi.fn(),
}));

vi.mock('../../services/api', () => ({
  pipelineApi: {
    getListing,
    importPipelineListing,
    generateCalendarForListing,
  },
}));

import ScrapedListingDetail from './ScrapedListingDetail';

const PIPELINE_ID = '11111111-1111-1111-1111-111111111111';
const MAIN_ID = 'c13f69c4-6671-4194-bdbb-842692a59847';

function baseDetail(overrides: Partial<PipelineListingDetail> = {}): PipelineListingDetail {
  return {
    id: PIPELINE_ID,
    title: 'Acehome Graha Puspa Parongpong',
    propertyType: 'house',
    price: 1_500_000_000,
    pricePerM2: null,
    lb: 120,
    lt: 150,
    bedrooms: 3,
    bathrooms: 2,
    garage: 1,
    floors: 2,
    certificate: 'SHM',
    address: null,
    description: 'A sample scraped listing',
    features: null,
    photos: null,
    photoLabels: null,
    featureImage: null,
    videoUrl: null,
    agentName: null,
    agentPhone: null,
    agency: null,
    status: 'active',
    isActive: true,
    marketStatus: 'FOR_SALE',
    sourceId: 1,
    sourceUrl: 'https://acehome.co.id/listing/example',
    scrapedAt: '2026-03-15T00:00:00.000Z',
    createdAt: '2026-03-15T00:00:00.000Z',
    sourceName: 'Acehome',
    sourceCode: 'acehome',
    imported: false,
    importedListingId: null,
    importedAt: null,
    analysis: null,
    promoContent: [],
    calendar: [],
    ...overrides,
  };
}

function renderDetail() {
  return render(
    <MemoryRouter>
      <ScrapedListingDetail listingId={PIPELINE_ID} onClose={() => {}} />
    </MemoryRouter>
  );
}

describe('ScrapedListingDetail View routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateCalendarForListing.mockResolvedValue({ success: true, data: { inserted: 0, from: '' } });
  });

  it('links View to /listings/{importedListingId} when already imported', async () => {
    getListing.mockResolvedValue({
      success: true,
      data: baseDetail({ imported: true, importedListingId: MAIN_ID }),
    });

    renderDetail();

    const view = await screen.findByRole('link', { name: /view/i });
    expect(view).toHaveAttribute('href', `/listings/${MAIN_ID}`);
    expect(view.getAttribute('href')).not.toContain('undefined');
  });

  it('does not render View when imported is true but importedListingId is missing', async () => {
    getListing.mockResolvedValue({
      success: true,
      data: baseDetail({ imported: true, importedListingId: null }),
    });

    renderDetail();

    await screen.findByText('Imported to Listings');
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /import/i })).not.toBeInTheDocument();
  });

  it('shows Import and no View when the listing is not imported', async () => {
    getListing.mockResolvedValue({ success: true, data: baseDetail() });

    renderDetail();

    await screen.findByRole('button', { name: /^import$/i });
    expect(screen.queryByRole('link', { name: /view/i })).not.toBeInTheDocument();
  });

  it('links the post-import banner View to /listings/{mainListingId}', async () => {
    const user = userEvent.setup();
    getListing
      .mockResolvedValueOnce({ success: true, data: baseDetail() })
      .mockResolvedValueOnce({
        success: true,
        data: baseDetail({ imported: true, importedListingId: MAIN_ID }),
      });
    importPipelineListing.mockResolvedValue({
      success: true,
      data: { mainListingId: MAIN_ID, title: 'Acehome Graha Puspa Parongpong' },
    });

    renderDetail();

    await user.click(await screen.findByRole('button', { name: /^import$/i }));

    await waitFor(() => {
      const links = screen.getAllByRole('link', { name: /view/i });
      expect(links.length).toBeGreaterThanOrEqual(1);
      for (const link of links) {
        expect(link).toHaveAttribute('href', `/listings/${MAIN_ID}`);
      }
    });
  });
});
