import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get Supabase credentials from environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_KEY")

# Now you can use these variables to connect to Supabase
# For example, using the supabase-py library:
# from supabase import create_client, Client
# supabase: Client = create_client(supabase_url, supabase_key)

print(f"Supabase URL: {supabase_url}")
print(f"Supabase Key: {supabase_key}")
