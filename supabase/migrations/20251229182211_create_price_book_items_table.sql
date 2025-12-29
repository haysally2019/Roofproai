/*
  # Create Price Book Items Table

  1. New Tables
    - `price_book_items`
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `category` (text) - Item category
      - `name` (text) - Item name
      - `unit` (text) - Unit of measurement
      - `cost` (numeric) - Cost per unit
      - `price` (numeric) - Sell price per unit
      - `markup_percent` (numeric) - Markup percentage
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Update timestamp

  2. Security
    - Enable RLS on `price_book_items` table
    - Add policies for authenticated users to manage their company's price book
*/

CREATE TABLE IF NOT EXISTS price_book_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'General',
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'SQ',
  cost numeric NOT NULL DEFAULT 0,
  price numeric NOT NULL DEFAULT 0,
  markup_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE price_book_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's price book"
  ON price_book_items FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Company owners can insert price book items"
  ON price_book_items FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Company Owner', 'Company Admin', 'Admin', 'Super Admin')
    )
  );

CREATE POLICY "Company owners can update price book items"
  ON price_book_items FOR UPDATE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Company Owner', 'Company Admin', 'Admin', 'Super Admin')
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Company Owner', 'Company Admin', 'Admin', 'Super Admin')
    )
  );

CREATE POLICY "Company owners can delete price book items"
  ON price_book_items FOR DELETE
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() 
      AND role IN ('Company Owner', 'Company Admin', 'Admin', 'Super Admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_price_book_items_company_id ON price_book_items(company_id);
CREATE INDEX IF NOT EXISTS idx_price_book_items_category ON price_book_items(category);
