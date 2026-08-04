-- FreePropAI Database Schema
-- Initial migration for AI Co-worker for Real Estate Agents

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Table: leads
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  budget_min DECIMAL(15,2),
  budget_max DECIMAL(15,2),
  location VARCHAR(255),
  unit_type VARCHAR(100),
  urgency VARCHAR(20) CHECK (urgency IN ('immediate', 'soon', 'flexible')),
  score VARCHAR(10) CHECK (score IN ('Hot', 'Warm', 'Cold')),
  raw_chat_text TEXT,
  extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contact_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'new',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_leads_score ON leads(score);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_last_contact ON leads(last_contact_at);

-- Table: follow_ups
CREATE TABLE follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  message_draft TEXT NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'sent')) DEFAULT 'pending',
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by VARCHAR(255),
  sent_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_followups_lead ON follow_ups(lead_id);
CREATE INDEX idx_followups_status ON follow_ups(status);
CREATE INDEX idx_followups_scheduled ON follow_ups(scheduled_for);

-- Table: listings
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  land_area DECIMAL(10,2),
  building_area DECIMAL(10,2),
  location VARCHAR(255) NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  bedrooms INT,
  bathrooms INT,
  property_type VARCHAR(100),
  additional_info TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(location);

-- Table: listing_photos
CREATE TABLE listing_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  photo_url VARCHAR(500) NOT NULL,
  photo_order INT DEFAULT 0,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listing_photos_listing ON listing_photos(listing_id);

-- Table: listing_descriptions
CREATE TABLE listing_descriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  variant_type VARCHAR(50) CHECK (variant_type IN ('formal', 'casual_1', 'casual_2')),
  description_text TEXT NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_listing_descriptions_listing ON listing_descriptions(listing_id);
CREATE INDEX idx_listing_descriptions_variant ON listing_descriptions(variant_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_follow_ups_updated_at BEFORE UPDATE ON follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
