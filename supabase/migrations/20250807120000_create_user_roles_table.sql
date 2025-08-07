-- Create user_roles table for managing user permissions
CREATE TABLE public.user_roles (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'employee',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure one active role per user
  UNIQUE(user_id, is_active) DEFERRABLE INITIALLY DEFERRED
);

-- Add comments
COMMENT ON TABLE public.user_roles IS 'Manages user roles and permissions for the application';
COMMENT ON COLUMN public.user_roles.role IS 'User role: super_admin, admin, hr_manager, finance_admin, manager, employee';

-- Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_active ON public.user_roles(user_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for service role
CREATE POLICY "Allow service_role access" ON public.user_roles FOR ALL USING (true) WITH CHECK (true);

-- Create policy for users to view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles 
  FOR SELECT USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_roles_updated_at();

-- Insert default roles for existing users (if any)
-- This will create employee roles for any existing auth users
INSERT INTO public.user_roles (user_id, role, is_active)
SELECT 
  id,
  'employee',
  true
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_roles WHERE is_active = true)
ON CONFLICT DO NOTHING;