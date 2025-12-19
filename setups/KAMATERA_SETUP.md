# Setting Up PostgreSQL on Kamatera

Kamatera is a cloud hosting provider. You'll need to create a VPS (Virtual Private Server) and install PostgreSQL on it. Here's a step-by-step guide:

## Option 1: Create a Cloud Server with PostgreSQL (Recommended)

### Step 1: Create a Cloud Server

1. **Log in to Kamatera** at https://www.kamatera.com
2. **Navigate to Cloud Servers** → **Create Server**
3. **Configure your server:**
   - **Datacenter**: Choose the closest one to you
   - **Operating System**: 
     - Ubuntu 22.04 LTS (Recommended) or
     - Ubuntu 24.04 LTS or
     - Debian 12
   - **CPU**: Start with 1 CPU (you can upgrade later)
   - **RAM**: Minimum 1GB (2GB recommended for PostgreSQL)
   - **Storage**: Minimum 20GB SSD
   - **Network**: Choose a data center location
   - **Root Password**: Set a strong password (save this!)
4. **Click "Create"** and wait for the server to be provisioned (usually 2-5 minutes)

### Step 2: Connect to Your Server

You'll need SSH access. You can use:
- **Windows**: PowerShell, Command Prompt, or PuTTY
- **Mac/Linux**: Terminal

**Find your server's IP address** in the Kamatera dashboard under your server details.

**Connect via SSH:**
```bash
ssh root@YOUR_SERVER_IP
```

Enter the root password you set when creating the server.

### Step 3: Install PostgreSQL

Once connected via SSH, run these commands:

#### For Ubuntu/Debian:

```bash
# Update package list
apt update

# Install PostgreSQL
apt install postgresql postgresql-contrib -y

# Check PostgreSQL version
psql --version

# Start PostgreSQL service
systemctl start postgresql
systemctl enable postgresql
```

### Step 4: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL, create a database and user
CREATE DATABASE pulsemarket;
CREATE USER pulsemarket_user WITH PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE pulsemarket TO pulsemarket_user;

# Exit PostgreSQL
\q
```

**Important**: Replace `your_secure_password_here` with a strong password!

### Step 5: Configure PostgreSQL for Remote Access

```bash
# Edit PostgreSQL config file
nano /etc/postgresql/*/main/postgresql.conf
```

Find this line and uncomment it (remove the #):
```
#listen_addresses = 'localhost'
```

Change it to:
```
listen_addresses = '*'
```

Save and exit (Ctrl+X, then Y, then Enter)

### Step 6: Configure PostgreSQL Authentication

```bash
# Edit pg_hba.conf
nano /etc/postgresql/*/main/pg_hba.conf
```

Add this line at the end (allows password authentication from any IP):
```
host    all             all             0.0.0.0/0               md5
```

Save and exit.

### Step 7: Restart PostgreSQL

```bash
systemctl restart postgresql
```

### Step 8: Configure Firewall (if needed)

```bash
# Allow PostgreSQL port (5432) through firewall
ufw allow 5432/tcp
ufw enable
```

Or if Kamatera uses iptables:
```bash
iptables -A INPUT -p tcp --dport 5432 -j ACCEPT
```

### Step 9: Get Your Connection String

Your connection string will look like:

```
postgresql://pulsemarket_user:your_secure_password_here@YOUR_SERVER_IP:5432/pulsemarket
```

**Replace:**
- `pulsemarket_user` - The username you created
- `your_secure_password_here` - The password you set
- `YOUR_SERVER_IP` - Your Kamatera server's IP address
- `5432` - PostgreSQL default port (usually this)
- `pulsemarket` - The database name

### Step 10: Test the Connection

From your local machine, you can test the connection:
```bash
psql postgresql://pulsemarket_user:your_secure_password_here@YOUR_SERVER_IP:5432/pulsemarket
```

Or use a PostgreSQL client like pgAdmin, DBeaver, or TablePlus.

## Option 2: Use a Managed Database Service (Easier Alternative)

If you prefer not to manage PostgreSQL yourself, consider:

1. **Neon** (Recommended - Free tier available): https://neon.tech
2. **Supabase** (Free tier available): https://supabase.com
3. **Railway** (Free tier available): https://railway.app

These services handle all the setup, security, and backups for you!

## Security Best Practices

### 1. Change Default PostgreSQL Port (Optional but Recommended)

```bash
# Edit postgresql.conf
nano /etc/postgresql/*/main/postgresql.conf

# Change the port from 5432 to something else (e.g., 5433)
port = 5433

# Restart PostgreSQL
systemctl restart postgresql
```

### 2. Restrict Access by IP (More Secure)

Instead of allowing all IPs, you can restrict to your IP:

Edit `/etc/postgresql/*/main/pg_hba.conf`:
```
host    all             all             YOUR_IP_ADDRESS/32       md5
```

### 3. Use SSL Connection (Recommended)

Your connection string with SSL:
```
postgresql://pulsemarket_user:password@YOUR_SERVER_IP:5432/pulsemarket?sslmode=require
```

You may need to configure SSL certificates first. For development, `sslmode=require` is sufficient.

## Troubleshooting

### Can't connect from local machine?

1. **Check firewall**: Make sure port 5432 is open in Kamatera firewall settings
2. **Check PostgreSQL is running**: `systemctl status postgresql`
3. **Check PostgreSQL logs**: `tail -f /var/log/postgresql/postgresql-*-main.log`
4. **Verify connection string**: Double-check IP, port, username, password, database name

### Connection refused?

- PostgreSQL might not be listening on the right interface
- Check `listen_addresses` in `postgresql.conf`
- Check firewall rules

### Authentication failed?

- Verify username and password are correct
- Check `pg_hba.conf` has the right authentication method (md5)
- Make sure the user has proper permissions

## Quick Reference Commands

```bash
# Start PostgreSQL
systemctl start postgresql

# Stop PostgreSQL
systemctl stop postgresql

# Restart PostgreSQL
systemctl restart postgresql

# Check PostgreSQL status
systemctl status postgresql

# View PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*-main.log

# Connect to PostgreSQL as postgres user
sudo -u postgres psql

# Connect to specific database
sudo -u postgres psql pulsemarket
```

## Next Steps

Once you have your connection string:

1. Add it to your `.env` file in the Polymeme project:
   ```env
   DATABASE_URL=postgresql://pulsemarket_user:password@YOUR_SERVER_IP:5432/pulsemarket
   ```

2. Run the database migrations:
   ```bash
   npm run db:push
   ```

3. Start your app:
   ```bash
   npm run dev
   ```

That's it! Your Polymeme app will now connect to your PostgreSQL database on Kamatera.

