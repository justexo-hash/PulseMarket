# PostgreSQL Remote Access Configuration - Step by Step

## Prerequisites
- You're connected to your Kamatera server via SSH
- PostgreSQL is already installed
- You're logged in as root or have sudo privileges

---

## Step 1: Find Your PostgreSQL Version

First, let's find which version of PostgreSQL you have installed:

```bash
psql --version
```

This will show something like `psql (PostgreSQL) 14.x` or `16.x`. Note this version number.

---

## Step 2: Configure PostgreSQL to Listen on All Addresses

### Option A: Using nano (Recommended for beginners)

```bash
# Find your PostgreSQL config file (replace 14 with your version number)
ls /etc/postgresql/

# This will show something like: 14  or  16  or  main
# Edit the config file (replace 14/main with what you see)
nano /etc/postgresql/14/main/postgresql.conf
```

**OR if you see a different structure:**

```bash
nano /etc/postgresql/*/main/postgresql.conf
```

**In the nano editor:**
1. Press `Ctrl + W` to search
2. Type `listen_addresses` and press Enter
3. Find the line that says: `#listen_addresses = 'localhost'`
4. Change it to: `listen_addresses = '*'` (remove the `#` and change `localhost` to `*`)
5. Press `Ctrl + O` to save
6. Press `Enter` to confirm
7. Press `Ctrl + X` to exit

### Option B: Using sed (Quick method)

```bash
# Replace 14/main with your PostgreSQL version/path
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/14/main/postgresql.conf
```

Or if you don't know the exact path:
```bash
find /etc/postgresql -name "postgresql.conf" -type f | head -1 | xargs sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g"
```

**Verify the change:**
```bash
grep listen_addresses /etc/postgresql/*/main/postgresql.conf
```

You should see: `listen_addresses = '*'`

---

## Step 3: Configure PostgreSQL Authentication

Edit the `pg_hba.conf` file:

```bash
nano /etc/postgresql/14/main/pg_hba.conf
```

**OR:**

```bash
nano /etc/postgresql/*/main/pg_hba.conf
```

**Scroll to the bottom of the file** (use arrow keys or `Ctrl + End`)

**Add this line at the very end:**

```
host    all             all             0.0.0.0/0               md5
```

This line allows connections from any IP address using password authentication.

**Save and exit:**
1. Press `Ctrl + O` to save
2. Press `Enter` to confirm
3. Press `Ctrl + X` to exit

**Verify the change:**
```bash
tail -5 /etc/postgresql/*/main/pg_hba.conf
```

You should see your new line at the bottom.

---

## Step 4: Restart PostgreSQL Service

```bash
systemctl restart postgresql
```

**Check if it's running:**
```bash
systemctl status postgresql
```

You should see `active (running)` in green. If you see any errors, check the logs:

```bash
tail -50 /var/log/postgresql/postgresql-*-main.log
```

---

## Step 5: Configure Firewall

### Option A: Using UFW (Ubuntu Firewall - Most Common)

**Check if UFW is installed:**
```bash
which ufw
```

If it's installed, use these commands:

```bash
# Allow PostgreSQL port
ufw allow 5432/tcp

# If firewall is not active, enable it
ufw enable

# Check firewall status
ufw status
```

**You should see:**
```
5432/tcp                   ALLOW       Anywhere
```

### Option B: Using iptables (If UFW is not available)

```bash
# Allow incoming connections on port 5432
iptables -A INPUT -p tcp --dport 5432 -j ACCEPT

# Save the rules (on Ubuntu/Debian)
iptables-save > /etc/iptables/rules.v4
```

### Option C: Using Kamatera's Firewall Panel

1. **Log in to Kamatera dashboard**
2. **Go to your server** → **Firewall** or **Network** settings
3. **Add a firewall rule:**
   - **Type**: Inbound
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: 0.0.0.0/0 (or your specific IP for better security)
   - **Action**: Allow
4. **Save the rule**

This is often the easiest method if Kamatera provides a web interface for firewall management.

---

## Step 6: Test the Configuration

### Test 1: Check PostgreSQL is listening on all interfaces

```bash
netstat -tulpn | grep 5432
```

**OR:**

```bash
ss -tulpn | grep 5432
```

**You should see something like:**
```
tcp  0  0  0.0.0.0:5432  0.0.0.0:*  LISTEN  xxxx/postgres
```

If you see `127.0.0.1:5432` instead of `0.0.0.0:5432`, the configuration didn't work. Re-check Step 2.

### Test 2: Test connection from localhost

```bash
psql -h localhost -U pulsemarket_user -d pulsemarket
```

Enter your password when prompted. If it connects, PostgreSQL is working.

### Test 3: Test connection from your local machine

**On your Windows computer, open PowerShell or Command Prompt:**

```bash
# Install psql client if you don't have it, or use a GUI tool
# Or test with Node.js from your PulseMarket project
```

**Or test from your PulseMarket project:**

Create a test file `test-db.js` in your project root:

```javascript
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT version()`;
  console.log("✅ Database connection successful!");
  console.log(result);
} catch (error) {
  console.error("❌ Connection failed:", error.message);
}
```

Run it:
```bash
node test-db.js
```

---

## Complete Command Sequence (Copy-Paste Ready)

Here's everything in one go (replace `14` with your PostgreSQL version if different):

```bash
# Step 1: Find PostgreSQL version
psql --version

# Step 2: Configure listen_addresses
nano /etc/postgresql/14/main/postgresql.conf
# (Change listen_addresses = '*' manually in the editor)

# OR use sed (after confirming version):
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" /etc/postgresql/*/main/postgresql.conf

# Step 3: Configure authentication
echo "host    all             all             0.0.0.0/0               md5" >> /etc/postgresql/*/main/pg_hba.conf

# Step 4: Restart PostgreSQL
systemctl restart postgresql
systemctl status postgresql

# Step 5: Configure firewall
ufw allow 5432/tcp
ufw enable
ufw status

# Step 6: Verify listening
netstat -tulpn | grep 5432
```

---

## Troubleshooting

### "Permission denied" errors?
- Make sure you're using `sudo` or logged in as root
- Check file permissions: `ls -la /etc/postgresql/*/main/`

### "File not found" errors?
- Find your config file: `find /etc -name "postgresql.conf" 2>/dev/null`
- Or: `locate postgresql.conf`

### Can't connect remotely?
1. **Check PostgreSQL is listening:**
   ```bash
   netstat -tulpn | grep 5432
   ```
   Should show `0.0.0.0:5432`, not `127.0.0.1:5432`

2. **Check firewall:**
   ```bash
   ufw status
   # or
   iptables -L -n | grep 5432
   ```

3. **Check PostgreSQL logs:**
   ```bash
   tail -50 /var/log/postgresql/postgresql-*-main.log
   ```

4. **Check Kamatera firewall rules** in the web dashboard

5. **Test port from your local machine:**
   ```bash
   telnet YOUR_SERVER_IP 5432
   ```
   Or use an online tool: https://www.yougetsignal.com/tools/open-ports/

### Connection timeout?
- Kamatera might have a network-level firewall
- Check Kamatera dashboard → Network → Firewall Rules
- Make sure port 5432 is allowed

---

## Security Recommendations

### 1. Restrict by IP (More Secure)

Instead of `0.0.0.0/0`, use your specific IP:

```bash
nano /etc/postgresql/*/main/pg_hba.conf
```

Change:
```
host    all             all             0.0.0.0/0               md5
```

To (replace with YOUR IP):
```
host    all             all             YOUR_IP_ADDRESS/32     md5
```

### 2. Change Default Port (Optional)

Edit `postgresql.conf`:
```
port = 5433
```

Then update firewall and connection string accordingly.

### 3. Use SSL Connection (Recommended for Production)

Your connection string should include:
```
?sslmode=require
```

---

## Next Steps

Once everything is configured:

1. **Add to your `.env` file:**
   ```env
   DATABASE_URL=postgresql://pulsemarket_user:password@YOUR_SERVER_IP:5432/pulsemarket?sslmode=require
   ```

2. **Test from PulseMarket:**
   ```bash
   npm run db:push
   ```

3. **Start your app:**
   ```bash
   npm run dev
   ```

If you encounter any issues, check the troubleshooting section above!

