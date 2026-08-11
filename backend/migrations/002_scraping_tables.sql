-- FreePropAI Database Schema
-- Migration 002 for Scraping Feature

-- Table: scraping_jobs
CREATE TABLE scraping_jobs (
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

CREATE INDEX idx_scraping_jobs_status ON scraping_jobs(status);
CREATE INDEX idx_scraping_jobs_source ON scraping_jobs(source_name);
CREATE INDEX idx_scraping_jobs_created ON scraping_jobs(created_at DESC);

-- Table: scraped_listings
CREATE TABLE scraped_listings (
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

CREATE INDEX idx_scraped_listings_job ON scraped_listings(scraping_job_id);
CREATE INDEX idx_scraped_listings_import_status ON scraped_listings(import_status);
CREATE INDEX idx_scraped_listings_source_id ON scraped_listings(source_id);

-- Table: scraping_configs
CREATE TABLE scraping_configs (
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

CREATE INDEX idx_scraping_configs_source ON scraping_configs(source_name);
CREATE INDEX idx_scraping_configs_active ON scraping_configs(is_active);

-- Triggers for updated_at
CREATE TRIGGER update_scraping_jobs_updated_at BEFORE UPDATE ON scraping_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraped_listings_updated_at BEFORE UPDATE ON scraped_listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scraping_configs_updated_at BEFORE UPDATE ON scraping_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
