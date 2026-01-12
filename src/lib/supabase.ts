import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
	'https://uvrztvtagoosuzacdwma.supabase.co',
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2cnp0dnRhZ29vc3V6YWNkd21hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwNDUzMzEsImV4cCI6MjA3MzYyMTMzMX0.A1cRIcjWd1-YhWO1P3-9MJNUB5bmpCIA2KLXxRmSkAM'
)
