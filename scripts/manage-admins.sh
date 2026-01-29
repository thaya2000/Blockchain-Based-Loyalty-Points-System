#!/bin/bash

# Admin Management Script for Blockchain Loyalty System

echo "========================================="
echo "Admin Management Script"
echo "========================================="
echo ""

# Function to show current admins
show_admins() {
    echo "Current Admins:"
    echo "---------------"
    PGPASSWORD=root psql -h 172.31.16.1 -U postgres -d loyalty_db -c "\
        SELECT wallet_address, name, role, is_active, created_at \
        FROM admins \
        ORDER BY created_at;" 2>/dev/null || echo "Error: Could not connect to database"
    echo ""
}

# Function to add new admin
add_admin() {
    echo ""
    echo "Add New Admin"
    echo "-------------"
    read -p "Enter wallet address: " wallet
    read -p "Enter name (optional): " name
    read -p "Enter email (optional): " email
    read -p "Enter role (super_admin/admin/moderator, default: admin): " role
    
    if [ -z "$wallet" ]; then
        echo "Error: Wallet address is required"
        return
    fi
    
    if [ -z "$role" ]; then
        role="admin"
    fi
    
    if [ -z "$name" ]; then
        name="Admin User"
    fi
    
    if [ -z "$email" ]; then
        email=""
    fi
    
    PGPASSWORD=root psql -h 172.31.16.1 -U postgres -d loyalty_db -c "\
        INSERT INTO admins (wallet_address, name, email, role) \
        VALUES ('$wallet', '$name', '$email', '$role') \
        ON CONFLICT (wallet_address) DO UPDATE \
        SET name = EXCLUDED.name, email = EXCLUDED.email, role = EXCLUDED.role, is_active = true;" \
        2>/dev/null && echo "✅ Admin added successfully!" || echo "❌ Failed to add admin"
    
    show_admins
}

# Function to remove admin
remove_admin() {
    echo ""
    echo "Remove Admin"
    echo "------------"
    read -p "Enter wallet address to remove: " wallet
    
    if [ -z "$wallet" ]; then
        echo "Error: Wallet address is required"
        return
    fi
    
    PGPASSWORD=root psql -h 172.31.16.1 -U postgres -d loyalty_db -c "\
        UPDATE admins SET is_active = false WHERE wallet_address = '$wallet';" \
        2>/dev/null && echo "✅ Admin deactivated!" || echo "❌ Failed to remove admin"
    
    show_admins
}

# Function to update placeholder admin
update_placeholder() {
    echo ""
    echo "Update Placeholder Admin"
    echo "------------------------"
    read -p "Enter your actual wallet address: " wallet
    
    if [ -z "$wallet" ]; then
        echo "Error: Wallet address is required"
        return
    fi
    
    PGPASSWORD=root psql -h 172.31.16.1 -U postgres -d loyalty_db -c "\
        UPDATE admins \
        SET wallet_address = '$wallet' \
        WHERE wallet_address = 'REPLACE_WITH_YOUR_WALLET_ADDRESS';" \
        2>/dev/null && echo "✅ Placeholder updated!" || echo "❌ Failed to update"
    
    show_admins
}

# Main menu
while true; do
    show_admins
    echo "Options:"
    echo "1) Add new admin"
    echo "2) Deactivate admin"
    echo "3) Update placeholder admin"
    echo "4) Refresh list"
    echo "5) Exit"
    echo ""
    read -p "Choose an option (1-5): " choice
    
    case $choice in
        1) add_admin ;;
        2) remove_admin ;;
        3) update_placeholder ;;
        4) continue ;;
        5) echo "Goodbye!"; exit 0 ;;
        *) echo "Invalid option" ;;
    esac
    
    echo ""
    echo "========================================="
    echo ""
done
