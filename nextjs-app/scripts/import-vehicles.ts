import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Organization ID for admin
const ORGANIZATION_ID = '550e8400-e29b-41d4-a716-446655440000'

interface VehicleCSV {
  id: string
  organization_id: string
  name: string
  license_plate: string
  vin: string
  status: string
  photo_url: string
  created_at: string
  model: string
  year: string
  is_rental: string
  rental_start_date: string
  rental_end_date: string
  rental_monthly_price: string
}

async function importVehicles() {
  console.log('🚗 Starting vehicle import...\n')

  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '../../vehicles_20251013_165714.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const lines = csvContent.trim().split('\n')
    const headers = lines[0].split(',')

    console.log(`📊 Found ${lines.length - 1} vehicles to import\n`)

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // Process each line (skip header)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line.trim()) continue

      try {
        // Parse CSV line
        const values = line.split(',')
        const vehicle: any = {}

        headers.forEach((header, index) => {
          vehicle[header] = values[index] || ''
        })

        // Prepare data for insert
        const vehicleData = {
          organization_id: ORGANIZATION_ID,
          name: vehicle.name || `Vehicle ${i}`,
          license_plate: vehicle.license_plate,
          vin: vehicle.vin || null,
          status: vehicle.status.toLowerCase() === 'repair' ? 'repair' : 'active',
          photo_url: null,
          created_at: vehicle.created_at || new Date().toISOString(),
          model: vehicle.model || null,
          year: vehicle.year ? parseInt(vehicle.year) : null,
          is_rental: vehicle.is_rental === 'True' || vehicle.is_rental === 'true',
          rental_start_date: vehicle.rental_start_date || null,
          rental_end_date: vehicle.rental_end_date || null,
          rental_monthly_price: vehicle.rental_monthly_price ? parseFloat(vehicle.rental_monthly_price) : null,
        }

        // Insert into database
        const { data, error } = await supabase
          .from('vehicles')
          .insert(vehicleData)
          .select()

        if (error) {
          errorCount++
          errors.push(`Line ${i + 1} (${vehicle.license_plate}): ${error.message}`)
          console.error(`❌ Error importing ${vehicle.license_plate}:`, error.message)
        } else {
          successCount++
          console.log(`✅ Imported: ${vehicle.license_plate} - ${vehicle.model} (${vehicle.year})`)
        }

      } catch (err: any) {
        errorCount++
        errors.push(`Line ${i + 1}: ${err.message}`)
        console.error(`❌ Error processing line ${i + 1}:`, err.message)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Import Summary:')
    console.log(`✅ Successfully imported: ${successCount} vehicles`)
    console.log(`❌ Errors: ${errorCount}`)

    if (errors.length > 0) {
      console.log('\n🔍 Error details:')
      errors.forEach(err => console.log(`  - ${err}`))
    }

    console.log('='.repeat(60) + '\n')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

importVehicles()
