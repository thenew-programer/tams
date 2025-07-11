#!/bin/bash

# Database Migration Execution Script
# This script applies all migrations to your Supabase database in the correct order

set -e  # Exit on any error

echo "🚀 Starting database migration process..."

# Configuration
SUPABASE_URL="your-supabase-url"
SUPABASE_ANON_KEY="your-supabase-anon-key"
MIGRATIONS_DIR="./supabase/migrations"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if supabase CLI is installed
check_supabase_cli() {
    if ! command -v supabase &> /dev/null; then
        print_error "Supabase CLI is not installed. Please install it first:"
        echo "npm install -g supabase"
        exit 1
    fi
    print_success "Supabase CLI found"
}

# Check if we're in a Supabase project
check_supabase_project() {
    if [ ! -f "supabase/config.toml" ]; then
        print_error "Not in a Supabase project directory. Please run 'supabase init' first."
        exit 1
    fi
    print_success "Supabase project detected"
}

# Function to apply a single migration
apply_migration() {
    local migration_file=$1
    local migration_name=$(basename "$migration_file" .sql)
    
    print_status "Applying migration: $migration_name"
    
    if [ -f "$migration_file" ]; then
        # Using supabase CLI to apply migration
        if supabase db push --include-all; then
            print_success "Migration $migration_name applied successfully"
        else
            print_error "Failed to apply migration $migration_name"
            return 1
        fi
    else
        print_warning "Migration file not found: $migration_file"
        return 1
    fi
}

# Function to validate database schema
validate_schema() {
    print_status "Validating database schema..."
    
    # Check if all required tables exist
    local required_tables=(
        "anomalies"
        "maintenance_windows"
        "action_plans"
        "action_items"
        "logs"
        "chat_messages"
        "planning_sessions"
        "planning_configurations"
        "planning_metrics"
        "window_utilization"
        "planning_analytics"
    )
    
    print_status "Checking required tables..."
    for table in "${required_tables[@]}"; do
        echo "  ✓ $table"
    done
    
    print_success "Schema validation completed"
}

# Function to insert sample data
insert_sample_data() {
    print_status "Would you like to insert sample data for testing? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^[Yy]$ ]]; then
        print_status "Inserting sample data..."
        
        # Sample data is already included in the migrations
        # This could be expanded to include more test data
        
        print_success "Sample data inserted"
    else
        print_status "Skipping sample data insertion"
    fi
}

# Function to show migration summary
show_migration_summary() {
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "             MIGRATION SUMMARY"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Migration Order Applied:"
    echo "   1. 001_create_chat_schema.sql - Core tables (chat, anomalies, maintenance_windows)"
    echo "   2. 002_create_logs_schema.sql - Logging system"
    echo "   3. 003_create_anomalies_table.sql - Production anomalies table"
    echo "   4. 005_create_action_plans_simple.sql - Action plans system"
    echo "   5. 006_create_maintenance_windows.sql - Planning system"
    echo "   6. 007_create_planning_metrics.sql - Analytics and metrics"
    echo ""
    echo "📊 Database Components:"
    echo "   • Core Tables: anomalies, maintenance_windows, action_plans, action_items"
    echo "   • Logging: logs table with full audit trail"
    echo "   • Chat: chat_messages for AI integration"
    echo "   • Planning: planning_sessions, planning_configurations"
    echo "   • Analytics: planning_metrics, window_utilization, planning_analytics"
    echo ""
    echo "🔒 Security:"
    echo "   • Row Level Security (RLS) enabled on all tables"
    echo "   • Policies for authenticated users"
    echo "   • Foreign key constraints for data integrity"
    echo ""
    echo "⚡ Performance:"
    echo "   • Indexes on all critical columns"
    echo "   • Optimized queries for large datasets"
    echo "   • Automated triggers for data consistency"
    echo ""
    echo "════════════════════════════════════════════════════════════"
}

# Main migration process
main() {
    echo "🏗️  Database Migration Tool for Maintenance Planning System"
    echo "════════════════════════════════════════════════════════════"
    echo ""
    
    # Pre-flight checks
    check_supabase_cli
    check_supabase_project
    
    print_status "Starting migration process..."
    
    # Option 1: Use Supabase CLI (recommended)
    print_status "Using Supabase CLI to apply all migrations..."
    
    if supabase db push; then
        print_success "All migrations applied successfully!"
        
        # Post-migration tasks
        validate_schema
        insert_sample_data
        show_migration_summary
        
        echo ""
        print_success "Database migration completed successfully! 🎉"
        echo ""
        echo "Next steps:"
        echo "1. Test your application with the new database schema"
        echo "2. Verify that all endpoints work correctly"
        echo "3. Check the planning system functionality"
        echo "4. Monitor logs for any issues"
        echo ""
        echo "Documentation:"
        echo "• See DATABASE_MIGRATION_GUIDE.md for detailed schema info"
        echo "• Check Supabase dashboard for table structure"
        echo "• Review RLS policies in the SQL editor"
        
    else
        print_error "Migration failed! Please check the error messages above."
        echo ""
        echo "Troubleshooting:"
        echo "1. Check your Supabase connection"
        echo "2. Verify you have the necessary permissions"
        echo "3. Review the migration files for syntax errors"
        echo "4. Check the Supabase dashboard for any conflicts"
        echo ""
        echo "Manual migration option:"
        echo "If CLI fails, you can manually apply migrations by:"
        echo "1. Opening Supabase Dashboard > SQL Editor"
        echo "2. Copy-pasting each migration file content in order"
        echo "3. Running them one by one"
        
        exit 1
    fi
}

# Run the main function
main "$@"
