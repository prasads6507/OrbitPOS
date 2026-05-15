-- Create shifts table
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage all shifts for their store"
    ON shifts
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE store_id = shifts.store_id AND role = 'admin'
        )
    );

CREATE POLICY "Employees can view their own shifts"
    ON shifts
    FOR SELECT
    USING (
        auth.uid() = employee_id OR
        auth.uid() IN (
            SELECT id FROM profiles 
            WHERE store_id = shifts.store_id AND role = 'admin'
        )
    );

-- Add to future reference: You can also add a policy for cashiers/employees to see others if needed.
