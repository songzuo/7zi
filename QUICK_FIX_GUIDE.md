# Quick Fix Guide - Build Blockers

**Last Updated:** 2026-03-19
**Priority:** 🔴 CRITICAL - Must complete before any performance work

---

## 5-Minute Quick Fix

### Step 1: Install Missing Dependencies (30 seconds)

```bash
cd /root/.openclaw/workspace/7zi-project

npm install socket.io
npm install --save-dev @types/socket.io
```

### Step 2: Fix WebSocket Server (3 minutes)

**File:** `src/lib/websocket/server.ts`

**Line 642:**
```typescript
// BEFORE:
export function getServer(): SocketIOServer | null {
  return io;
}

// AFTER:
export async function getServer(): Promise<SocketIOServer | null> {
  return io;
}
```

**Line 646:**
```typescript
// BEFORE:
export function getStats() {
  if (!io) {
    return {
      connected: 0,
      rooms: 0,
    };
  }
  // ...
}

// AFTER:
export async function getStats() {
  if (!io) {
    return {
      connected: 0,
      rooms: 0,
    };
  }
  // ...
}
```

**Line 665:**
```typescript
// BEFORE:
export function getRoomInfo(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;
  // ...
}

// AFTER:
export async function getRoomInfo(roomId: string) {
  const room = getRoom(roomId);
  if (!room) return null;
  // ...
}
```

**Line 686:**
```typescript
// BEFORE:
export function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
  }));
}

// AFTER:
export async function getAllRooms() {
  return Array.from(rooms.values()).map(room => ({
    id: room.id,
    name: room.name,
  }));
}
```

**Line 697:**
```typescript
// BEFORE:
export function broadcastSystemAnnouncement(message: string): void {
  broadcastToAll('system:announcement', {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
  });
}

// AFTER:
export async function broadcastSystemAnnouncement(message: string): Promise<void> {
  broadcastToAll('system:announcement', {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    message,
  });
}
```

### Step 3: Verify JWT Module (30 seconds)

```bash
# Check if JWT module exists
ls -la src/lib/auth/jwt.ts

# If it doesn't exist, create it
cat > src/lib/auth/jwt.ts << 'EOF'
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
EOF
```

### Step 4: Test Build (1 minute)

```bash
# Clean previous build
rm -rf .next

# Test build
npm run build
```

**Expected Output:**
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Collecting build traces
✓ Finalizing page optimization
```

If you see errors, check the error messages and adjust accordingly.

---

## Full Batch Fix Script

**Save as:** `scripts/fix-build.sh`

```bash
#!/bin/bash

set -e

echo "🔧 Starting build fix..."

# Step 1: Install dependencies
echo "📦 Installing missing dependencies..."
npm install socket.io
npm install --save-dev @types/socket.io

# Step 2: Create JWT module if missing
echo "📝 Verifying JWT module..."
if [ ! -f "src/lib/auth/jwt.ts" ]; then
  cat > src/lib/auth/jwt.ts << 'JWT_EOF'
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-in-production'
);

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
JWT_EOF
  echo "✅ JWT module created"
else
  echo "✅ JWT module already exists"
fi

# Step 3: Fix WebSocket server
echo "🔨 Fixing WebSocket server..."
# Using sed to fix the async functions
sed -i 's/^export function getServer():/export async function getServer():/' src/lib/websocket/server.ts
sed -i 's/^export function getStats() {$/export async function getStats() {/' src/lib/websocket/server.ts
sed -i 's/^export function getRoomInfo(/export async function getRoomInfo(/' src/lib/websocket/server.ts
sed -i 's/^export function getAllRooms() {$/export async function getAllRooms() {/' src/lib/websocket/server.ts
sed -i 's/^export function broadcastSystemAnnouncement(/export async function broadcastSystemAnnouncement(/' src/lib/websocket/server.ts

# Fix return types
sed -i 's/export async function getServer(): SocketIOServer | null {$/export async function getServer(): Promise<SocketIOServer | null> {/' src/lib/websocket/server.ts
sed -i 's/export async function broadcastSystemAnnouncement(message: string): void {$/export async function broadcastSystemAnnouncement(message: string): Promise<void> {/' src/lib/websocket/server.ts

echo "✅ WebSocket server fixed"

# Step 4: Clean and build
echo "🧹 Cleaning build artifacts..."
rm -rf .next

echo "🏗️  Building project..."
npm run build

echo "✅ Build successful!"
echo ""
echo "🎉 All build blockers fixed!"
echo ""
echo "Next steps:"
echo "1. Run: npm run build:analyze"
echo "2. Review bundle sizes"
echo "3. Measure performance with Lighthouse"
echo ""
echo "For full optimization guide, see: PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md"
```

**Make executable and run:**

```bash
chmod +x scripts/fix-build.sh
./scripts/fix-build.sh
```

---

## Verification

### Check 1: Verify Dependencies

```bash
npm list socket.io
# Should show: socket.io@x.x.x

npm list @types/socket.io
# Should show: @types/socket.io@x.x.x
```

### Check 2: Verify JWT Module

```bash
cat src/lib/auth/jwt.ts
# Should see the JWT implementation
```

### Check 3: Verify WebSocket Fixes

```bash
grep "export async function" src/lib/websocket/server.ts | head -10
# Should show all the async functions
```

### Check 4: Verify Build

```bash
npm run build
# Should complete successfully
```

---

## Common Issues & Solutions

### Issue: "Module not found: socket.io"

**Solution:**
```bash
npm install socket.io
```

### Issue: "Cannot find module '@/lib/auth/jwt'"

**Solution:**
```bash
# Create the module (see Step 3 above)
cat > src/lib/auth/jwt.ts << 'EOF'
# (JWT code from Step 3)
EOF
```

### Issue: "TypeScript error: async functions"

**Solution:**
Make sure all 5 functions in `src/lib/websocket/server.ts` have `async` keyword.

### Issue: "Build still failing"

**Solution:**
1. Check the full error message
2. Make sure all TypeScript errors are fixed
3. Verify all dependencies are installed
4. Try clean build: `rm -rf .next && npm run build`

---

## Next Steps After Build Fix

### 1. Run Bundle Analysis

```bash
npm run build:analyze
```

This will generate bundle analysis in `.next/analyze/`.

### 2. Measure Performance

```bash
# Start production server
npm start

# In another terminal, run Lighthouse
lighthouse http://localhost:3000 --view --preset=desktop
```

### 3. Review Optimization Opportunities

Check these files for optimization ideas:
- `PERFORMANCE_AUDIT_REPORT.md` - Full analysis
- `PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md` - Step-by-step guide
- `PERFORMANCE_AUDIT_SUMMARY.md` - Quick overview

### 4. Implement Quick Wins

1. Add Web Vitals tracking (30 min)
2. Optimize xlsx package (45 min)
3. Add resource hints (15 min)
4. Add Service Worker (2-3 hours)

---

## Summary

**Time to fix:** 5 minutes (manual) or 1 minute (script)
**Difficulty:** Easy
**Impact:** Enables all performance work

**What you'll achieve:**
- ✅ Successful build
- ✅ Bundle analysis available
- ✅ Performance measurement possible
- ✅ Optimization roadmap clear

**After this fix:**
- Run `npm run build:analyze`
- Review bundle sizes
- Measure Core Web Vitals
- Implement optimizations

---

**Need help?** Check the full guides:
- `PERFORMANCE_AUDIT_REPORT.md` - Detailed analysis
- `PERFORMANCE_OPTIMIZATION_IMPLEMENTATION_GUIDE.md` - Complete optimization guide
- `PERFORMANCE_AUDIT_SUMMARY.md` - Quick overview
