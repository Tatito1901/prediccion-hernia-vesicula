-- Create lead_intent_enum
CREATE TYPE lead_intent_enum AS ENUM (
  'ONLY_WANTS_INFORMATION',
  'WANTS_TO_SCHEDULE_APPOINTMENT',
  'WANTS_TO_COMPARE_PRICES',
  'OTHER'
);

-- Add lead_intent column to leads table
ALTER TABLE leads 
ADD COLUMN lead_intent lead_intent_enum;

-- Remove priority_level column from leads table
ALTER TABLE leads 
DROP COLUMN priority_level;
