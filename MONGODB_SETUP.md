# MongoDB Setup for Local Development

## Quick Start

MongoDB needs to be running before starting the backend server.

### Start MongoDB

**Option 1: Manual start (current session only)**
```bash
mkdir -p /usr/local/var/mongodb
mkdir -p /usr/local/var/log/mongodb
mongod --dbpath /usr/local/var/mongodb --fork --logpath /usr/local/var/log/mongodb/mongod.log
```

**Option 2: Using Homebrew services (starts automatically)**
```bash
brew services start mongodb-community
# or if you have the older mongodb formula:
brew services start mongodb
```

**Option 3: Using Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

### Verify MongoDB is Running

```bash
# Check if process is running
pgrep -f mongod

# Test connection
mongosh --eval "db.adminCommand('ping')"
```

### Stop MongoDB

**If started manually:**
```bash
pkill mongod
```

**If using Homebrew services:**
```bash
brew services stop mongodb-community
```

**If using Docker:**
```bash
docker stop mongodb
```

## Troubleshooting

### "connect ECONNREFUSED 127.0.0.1:27017"
- MongoDB is not running
- Start it using one of the methods above

### "Address already in use"
- MongoDB is already running
- Check with: `pgrep -f mongod`

### Permission errors
- Make sure you have write access to `/usr/local/var/mongodb`
- Or use a different data directory: `mongod --dbpath ~/mongodb-data`

## Default Configuration

- **Host**: `127.0.0.1`
- **Port**: `27017`
- **Database**: `roisalen`
- **Connection String**: `127.0.0.1:27017/roisalen`

You can override the connection string with the `MONGOLAB_URI` environment variable.

