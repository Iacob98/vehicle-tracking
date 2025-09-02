"""
Migration script to add 'owner' role to user_role enum
Run this manually on production if needed
"""
from database import execute_query

def migrate_enum():
    """Add owner role to user_role enum on production"""
    try:
        # Check if owner already exists
        result = execute_query("""
            SELECT COUNT(*) FROM pg_enum 
            WHERE enumtypid = 'user_role'::regtype AND enumlabel = 'owner'
        """)
        
        if result and result[0][0] == 0:
            # Add owner role
            execute_query("ALTER TYPE user_role ADD VALUE 'owner'")
            print("✅ Successfully added 'owner' to user_role enum")
            
            # Update first admin user in each organization to be owner
            execute_query("""
                UPDATE users 
                SET role = 'owner' 
                WHERE role = 'admin' 
                AND created_at = (
                    SELECT MIN(created_at) 
                    FROM users u2 
                    WHERE u2.organization_id = users.organization_id
                )
            """)
            print("✅ Updated organization creators to owner role")
        else:
            print("ℹ️ Owner role already exists")
            
    except Exception as e:
        print(f"❌ Error migrating enum: {e}")

if __name__ == "__main__":
    migrate_enum()