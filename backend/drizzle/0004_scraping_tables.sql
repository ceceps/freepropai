-- Migration: Add scraping tables for property scraping feature
-- Created: 2026-08-07

-- Table: scraping_jobs
-- Stores history and status of scraping jobs
CREATE TABLE IF NOT EXISTS scraping_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url VARCHAR(500) NOT NULL,
  source_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  total_listings_found INT DEFAULT 0,
  total_listings_imported INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_source ON scraping_jobs(source_name);
CREATE INDEX IF NOT EXISTS idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

-- Table: scraped_listings
-- Stores raw scraped data before import to listings
CREATE TABLE IF NOT EXISTS scraped_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scraping_job_id UUID NOT NULL REFERENCES scraping_jobs(id) ON DELETE CASCADE,
  source_url VARCHAR(500) NOT NULL,
  source_id VARCHAR(255),
  title VARCHAR(255) NOT NULL,
  land_area DECIMAL(10,2),
  building_area DECIMAL(10,2),
  location VARCHAR(255),
  price DECIMAL(15,2),
  bedrooms INT,
  bathrooms INT,
  property_type VARCHAR(100),
  description TEXT,
  image_urls TEXT[],
  contact_info JSONB,
  raw_data JSONB,
  import_status VARCHAR(50) CHECK (import_status IN ('pending', 'imported', 'skipped', 'failed')) DEFAULT 'pending',
  imported_listing_id UUID REFERENCES listings(id),
  imported_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraped_listings_job ON scraped_listings(scraping_job_id);
CREATE INDEX IF NOT EXISTS idx_scraped_listings_import_status ON scraped_listings(import_status);
CREATE INDEX IF NOT EXISTS idx_scraped_listings_source_id ON scraped_listings(source_id);

-- Table: scraping_configs
-- Stores scraping configuration for various websites
CREATE TABLE IF NOT EXISTS scraping_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name VARCHAR(100) NOT NULL UNIQUE,
  base_url VARCHAR(500) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  scraping_prompt TEXT NOT NULL,
  field_mappings JSONB NOT NULL,
  rate_limit_delay INT DEFAULT 2000,
  max_pages INT DEFAULT 10,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scraping_configs_source ON scraping_configs(source_name);
CREATE INDEX IF NOT EXISTS idx_scraping_configs_active ON scraping_configs(is_active);

-- Insert default scraping config for acehome.com
INSERT INTO scraping_configs (
  source_name,
  base_url,
  is_active,
  scraping_prompt,
  field_mappings,
  rate_limit_delay,
  max_pages,
  notes
) VALUES (
  'acehome',
  'https://acehome.com',
  true,
  'Extract all property listings from this page with the following information:
- Title (judul properti)
- Price (harga dalam Rupiah, convert to number without currency symbols)
- Location (lokasi lengkap)
- Land area (luas tanah dalam m²)
- Building area (luas bangunan dalam m²)
- Number of bedrooms (jumlah kamar tidur)
- Number of bathrooms (jumlah kamar mandi)
- Property type (tipe properti: rumah, apartemen, ruko, dll)
- Description (deskripsi properti)
- Image URLs (array of all image URLs for this property)
- Contact information (nama, nomor telepon, WhatsApp if available)
- Listing URL (link ke detail listing)

Return as JSON array with this exact structure:
[
  {
    "title": "string",
    "price": number,
    "location": "string",
    "landArea": number,
    "buildingArea": number,
    "bedrooms": number,
    "bathrooms": number,
    "propertyType": "string",
    "description": "string",
    "imageUrls": ["string"],
    "contactInfo": {
      "name": "string",
      "phone": "string",
      "whatsapp": "string"
    },
    "listingUrl": "string"
  }
]',
  '{"title": "title", "price": "price", "location": "location", "landArea": "land_area", "buildingArea": "building_area", "bedrooms": "bedrooms", "bathrooms": "bathrooms", "propertyType": "property_type", "description": "description", "imageUrls": "image_urls", "contactInfo": "contact_info", "listingUrl": "source_url"}'::jsonb,
  2000,
  10,
  'Default scraping configuration for acehome.com property listings'
) ON CONFLICT (source_name) DO NOTHING;
