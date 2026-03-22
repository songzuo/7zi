# WebSocket Collaboration - Testing Guide

## Overview

This guide provides step-by-step instructions for testing the WebSocket collaboration functionality.

---

## Prerequisites

1. Node.js and npm installed
2. 7zi-project cloned and dependencies installed
3. Access to the codebase

---

## Quick Test (5 Minutes)

### Step 1: Start the Development Server

```bash
cd 7zi-project
npm run dev
```

Wait for the server to start (you should see "Ready in Xms" or similar).

### Step 2: Open Demo Page

Open your browser and navigate to:
```
http://localhost:3000/collaboration-demo
```

### Step 3: Test Basic Functionality

1. **Connection Test**:
   - Click the "Connect" button
   - Verify the status indicator turns green
   - Check console for connection messages

2. **Room Join Test**:
   - Click "Join Room"
   - Verify "Room Joined" appears in the activity log
   - Check that you're shown in the user list

3. **Document Edit Test**:
   - Type a message in the textarea
   - Click "Add to Document"
   - Verify the message appears in the document content area

---

## Multi-User Collaboration Test (10 Minutes)

### Step 1: Open Multiple Browser Tabs

1. Open the demo page in Tab 1
2. Open the demo page in Tab 2
3. Open the demo page in Tab 3 (optional)

### Step 2: Configure Different Users

**Tab 1 - Alice:**
- User ID: `alice`
- User Name: `Alice`
- Click "Connect"
- Click "Join Room" (use Room ID: `test-task-1`)

**Tab 2 - Bob:**
- User ID: `bob`
- User Name: `Bob`
- Click "Connect"
- Click "Join Room" (use same Room ID: `test-task-1`)

**Tab 3 - Charlie** (if using):
- User ID: `charlie`
- User Name: `Charlie`
- Click "Connect"
- Click "Join Room" (use same Room ID: `test-task-1`)

### Step 3: Test Real-Time Sync

1. **Tab 1 - Alice**:
   - Type "Hello from Alice" in the textarea
   - Click "Add to Document"
   - Look at Tab 2 and Tab 3 - you should see the message appear instantly

2. **Tab 2 - Bob**:
   - Type "Bob is here!" in the textarea
   - Click "Add to Document"
   - Check Tab 1 and Tab 3 - message should appear

3. **Tab 3 - Charlie**:
   - Type "Charlie joined the conversation" in the textarea
   - Click "Add to Document"
   - Verify all tabs see the message

### Step 4: Test User Presence

1. **Tab 1 - Alice**:
   - Look at the "Total Users" count
   - It should show 3 (Alice, Bob, Charlie)
   - Look at the "User List" - you should see 3 colored circles

2. **Tab 2 - Bob**:
   - Verify same user count (3)
   - Verify same user list (3 colored circles)

3. **Tab 3 - Charlie**:
   - Verify same user count (3)
   - Verify same user list (3 colored circles)

### Step 5: Test Typing Indicators

1. **Tab 1 - Alice**:
   - Type in the textarea but don't click "Add to Document"
   - Look at Tab 2 and Tab 3
   - You should see "Alice is typing..." appear
   - Wait 3 seconds - the typing indicator should disappear

2. **Tab 2 - Bob**:
   - Type in the textarea
   - Check Tab 1 and Tab 3
   - Verify "Bob is typing..." appears

3. **Tab 3 - Charlie**:
   - Type in the textarea
   - Verify "Charlie is typing..." appears

### Step 6: Test Reconnection

1. **Tab 1 - Alice**:
   - Click "Disconnect"
   - Status should turn red
   - Click "Reconnect"
   - Status should turn green again
   - Verify you're automatically re-joined to the room

2. **Tab 2 - Bob**:
   - Refresh the page (F5)
   - Wait a few seconds
   - Verify auto-reconnect kicks in
   - Check that you're back in the room

### Step 7: Test Room Leave/Join

1. **Tab 3 - Charlie**:
   - Click "Leave Room"
   - Tab 1 and Tab 2 should show user count decrease to 2
   - Click "Join Room" again
   - Tab 1 and Tab 2 should show user count back to 3

---

## Component-Specific Tests

### Test 1: Connection Status Component

**Expected Behavior**:
- ✅ Shows colored status indicator (green/yellow/red)
- ✅ Displays "Connected" when connected
- ✅ Shows "Connecting..." when connecting
- ✅ Shows "Disconnected" when disconnected
- ✅ Shows number of users in room
- ✅ Displays typing indicator when users type
- ✅ Shows "Reconnect" button when disconnected

**Test Steps**:
1. Observe status when not connected (red, "Disconnected")
2. Click "Connect" - status should change to yellow ("Connecting...")
3. Wait for connection - status should change to green ("Connected")
4. Click "Disconnect" - verify red status and reconnect button
5. Join room - verify user count appears
6. Type in textarea - verify typing indicator appears

---

### Test 2: User List Component

**Expected Behavior**:
- ✅ Shows colored circles or avatars for each user
- ✅ Different users have different colors
- ✅ Tooltips show user names
- ✅ Current user is indicated
- ✅ Updates when users join/leave

**Test Steps**:
1. Join room with one user - verify 1 circle appears
2. Open second tab with different user - verify 2 circles
3. Open third tab - verify 3 circles
4. Close one tab - verify user count decreases
5. Hover over circles - verify tooltips show user names

---

### Test 3: Remote Cursor Component

**Expected Behavior**:
- ✅ Shows colored cursor caret
- ✅ Displays user name label above cursor
- ✅ Cursor follows remote user's position
- ✅ Doesn't show current user's cursor
- ✅ Updates in real-time

**Test Steps**:
1. Open demo in Tab 1 and Tab 2
2. Join same room with different users
3. In Tab 1, click in the textarea at different positions
4. In Tab 2, observe cursor appearing at those positions
5. Verify cursor color matches user color
6. Verify user name label appears

---

### Test 4: Selection Highlight Component

**Expected Behavior**:
- ✅ Highlights text selected by remote users
- ✅ Highlight color matches user color
- ✅ Shows user name tooltip on selection
- ✅ Handles multiple selections
- ✅ Updates in real-time

**Test Steps**:
1. Open demo in Tab 1 and Tab 2
2. Join same room with different users
3. In Tab 1, select some text in the document
4. In Tab 2, observe colored highlight on that text
5. Verify highlight color matches user color
6. Verify tooltip shows user name
7. Change selection - verify highlight updates

---

### Test 5: Typing Indicator Component

**Expected Behavior**:
- ✅ Shows animated typing dots
- ✅ Displays "X users are typing..."
- ✅ Appears when users type
- ✅ Disappears after 3 seconds of inactivity
- ✅ Updates in real-time

**Test Steps**:
1. Open demo in Tab 1 and Tab 2
2. Join same room
3. In Tab 1, start typing in textarea
4. In Tab 2, verify typing indicator appears
5. Stop typing in Tab 1
6. Wait 3 seconds - verify indicator disappears in Tab 2
7. Repeat with multiple users

---

## Edge Cases and Error Handling

### Test 1: Network Disconnection

1. Start collaboration in multiple tabs
2. Disconnect network (or disable WiFi)
3. Observe:
   - ✅ Status changes to "Disconnected"
   - ✅ Reconnect attempts start
   - ✅ Exponential backoff occurs
4. Reconnect network
5. Observe:
   - ✅ Auto-reconnect succeeds
   - ✅ Room is re-joined
   - ✅ Document syncs

### Test 2: Invalid Token

1. In the demo page, change "Authentication Token" to an invalid value
2. Click "Connect"
3. Observe:
   - ✅ Connection fails
   - ✅ Error message displayed
   - ✅ Status shows error state

### Test 3: Room Not Found

1. Connect to server
2. Try to join a non-existent room
3. Observe:
   - ✅ New room is created
   - ✅ Document state is initialized
   - ✅ User is added to room

### Test 4: Rapid Typing

1. Open two tabs
2. In Tab 1, type very rapidly without stopping
3. In Tab 2, observe:
   - ✅ Typing indicator appears
   - ✅ Cursor updates are throttled (not every keystroke)
   - ✅ Document syncs correctly

### Test 5: Simultaneous Edits

1. Open three tabs with different users
2. All users type different messages simultaneously
3. Click "Add to Document" at the same time
4. Verify:
   - ✅ All messages appear in all tabs
   - ✅ Order is consistent across tabs
   - ✅ No text duplication or loss

---

## Performance Tests

### Test 1: Large Document

1. Create a large document (1000+ lines)
2. Edit at different positions
3. Verify:
   - ✅ Cursor movements are smooth
   - ✅ Edits sync quickly
   - ✅ No noticeable lag

### Test 2: Many Users

1. Open 10+ browser tabs
2. Join same room with different users
3. Verify:
   - ✅ All users appear in user list
   - ✅ Cursor updates are handled
   - ✅ Performance remains acceptable

---

## Automated Testing

### Run Component Tests

```bash
cd 7zi-project
node scripts/test-collaboration-ui.js
```

### Run Unit Tests

```bash
npm test -- src/lib/websocket/__tests__/collaboration.test.ts
```

### Run Integration Tests

```bash
npm test -- src/lib/websocket/__tests__/integration.test.ts
```

---

## Browser Compatibility Test

Test the collaboration features in different browsers:

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge

For each browser:
1. Open demo page
2. Connect and join room
3. Test basic editing
4. Verify real-time sync across browsers

---

## Mobile Testing

1. Open demo page on mobile device
2. Connect and join room
3. Test:
   - ✅ Connection works
   - ✅ Room join works
   - ✅ Typing works
   - ✅ Document syncs
   - ✅ Touch interactions work

---

## Common Issues and Solutions

### Issue 1: Can't Connect to WebSocket

**Symptoms**: Connection stays yellow or turns red

**Solutions**:
1. Check that dev server is running (`npm run dev`)
2. Verify WebSocket URL is correct
3. Check browser console for errors
4. Try refreshing the page

### Issue 2: Remote Cursors Not Showing

**Symptoms**: You don't see cursors from other users

**Solutions**:
1. Verify both users are in the same room
2. Check that room ID matches exactly
3. Ensure both users are connected
4. Look at console for JavaScript errors

### Issue 3: Document Not Syncing

**Symptoms**: Changes don't appear for other users

**Solutions**:
1. Verify room ID matches across tabs
2. Check that document ID is the same
3. Ensure operations are being sent (check activity log)
4. Verify server is running

### Issue 4: Typing Indicator Not Working

**Symptoms**: Typing status doesn't show for other users

**Solutions**:
1. Verify typing status is being sent
2. Check that you're in the same room
3. Ensure both users are connected
4. Wait up to 3 seconds for indicator to appear

---

## Test Results Template

Use this template to record your test results:

```
Date: ___________
Tester: ___________
Browser: ___________

Basic Functionality:
[ ] Connection works
[ ] Room join works
[ ] Document edit works
[ ] Document syncs

Multi-User:
[ ] Real-time sync works
[ ] User presence works
[ ] Typing indicators work
[ ] Reconnection works

Components:
[ ] Connection status works
[ ] User list works
[ ] Remote cursor works
[ ] Selection highlight works
[ ] Typing indicator works

Edge Cases:
[ ] Network disconnect handled
[ ] Invalid token handled
[ ] Room creation works
[ ] Rapid typing works
[ ] Simultaneous edits work

Performance:
[ ] Large document works
[ ] Many users handled

Notes:
```

---

## Success Criteria

The WebSocket collaboration implementation is considered working when:

1. ✅ Users can connect to the WebSocket server
2. ✅ Users can join the same room
3. ✅ Multiple users can edit the same document
4. ✅ Changes sync in real-time across all users
5. ✅ Remote cursors are visible for all users
6. ✅ Text selections are visible for all users
7. ✅ Typing indicators show when users type
8. ✅ User presence is displayed correctly
9. ✅ Reconnection works automatically
10. ✅ No data loss or conflicts during simultaneous edits

---

## Next Steps After Testing

1. **If all tests pass**: Integration is complete! Ready for production use.
2. **If some tests fail**: Check Troubleshooting section and fix issues.
3. **If new issues found**: Document them and create GitHub issues.

---

**Last Updated**: 2026-03-21
**Version**: 1.0.0
