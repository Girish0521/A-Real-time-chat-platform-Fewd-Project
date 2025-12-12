

const STORAGE_KEYS = {
  USERS: "chat_users",
  CURRENT_USER: "chat_current_user"
};

function getUsers() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || "[]");
}

function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

function setCurrentUser(username) {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify({ username }));
}

function getCurrentUser() {
  const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return data ? JSON.parse(data) : null;
}

function logout() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  location.reload();
}

// ======== Auth logic ========
const authScreen = document.getElementById("auth-screen");
const chatScreen = document.getElementById("chat-screen");
const currentUserNameEl = document.getElementById("current-user-name");
const logoutBtn = document.getElementById("logout-btn");

// Tabs
const tabButtons = document.querySelectorAll(".tab");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

// Switch tabs
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    if (btn.dataset.tab === "login") {
      loginForm.classList.add("active");
      registerForm.classList.remove("active");
    } else {
      registerForm.classList.add("active");
      loginForm.classList.remove("active");
    }
  });
});

// Register
registerForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value.trim();

  if (!username || !password) return;

  const users = getUsers();
  if (users.find((u) => u.username === username)) {
    alert("Username already exists");
    return;
  }

  users.push({ username, password });
  saveUsers(users);
  alert("Registered successfully. You can login now.");
  registerForm.reset();
});

// Login
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();

  const users = getUsers();
  const found = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!found) {
    alert("Invalid credentials");
    return;
  }

  setCurrentUser(username);
  showChatScreen();
});

// Auto-login if already stored
const existingUser = getCurrentUser();
if (existingUser) {
  showChatScreen();
}

logoutBtn.addEventListener("click", logout);

function showChatScreen() {
  const user = getCurrentUser();
  if (!user) return;

  authScreen.classList.add("hidden");
  chatScreen.classList.remove("hidden");
  currentUserNameEl.textContent = user.username;

  initializeChatData();
  renderUserList();
  renderGroupList();
}

// ======== Chat state ========

// In a real app, chats/messages are in a DB.
// Here we keep them only in memory.
const state = {
  chatType: "private", // "private" | "group"
  selectedId: null, // username or group id
  users: [],
  groups: [
    { id: "group-1", name: "Friends Group" },
    { id: "group-2", name: "Project Team" }
  ],
  messages: {} // key: chatKey, value: array of messages
};

function initializeChatData() {
  const allUsers = getUsers().map((u) => u.username);
  const current = getCurrentUser().username;
  state.users = allUsers.filter((u) => u !== current);
}

// Key for one-to-one chat
function privateChatKey(userA, userB) {
  return [userA, userB].sort().join("__");
}

// Key for group chat
function groupChatKey(groupId) {
  return `group__${groupId}`;
}

// ======== UI: user & group lists ========
const userListEl = document.getElementById("user-list");
const groupListEl = document.getElementById("group-list");
const chatTypeButtons = document.querySelectorAll(".chat-type-btn");
const chatTitleEl = document.getElementById("chat-title");
const chatSubtitleEl = document.getElementById("chat-subtitle");
const messageListEl = document.getElementById("message-list");

chatTypeButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    chatTypeButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    state.chatType = btn.dataset.type;
    state.selectedId = null;
    messageListEl.innerHTML = "";
    chatTitleEl.textContent = "Select a chat";
    chatSubtitleEl.textContent = "";

    if (state.chatType === "private") {
      userListEl.classList.remove("hidden");
      groupListEl.classList.add("hidden");
    } else {
      userListEl.classList.add("hidden");
      groupListEl.classList.remove("hidden");
    }
  });
});

function renderUserList() {
  userListEl.innerHTML = "";
  state.users.forEach((username) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.dataset.username = username;
    item.innerHTML = `
      <span>${username}</span>
      <small>Online</small>
    `;
    item.addEventListener("click", () => {
      selectPrivateChat(username);
    });
    userListEl.appendChild(item);
  });
}

function renderGroupList() {
  groupListEl.innerHTML = "";
  state.groups.forEach((group) => {
    const item = document.createElement("div");
    item.className = "list-item";
    item.dataset.groupId = group.id;
    item.innerHTML = `
      <span>${group.name}</span>
      <small>Group</small>
    `;
    item.addEventListener("click", () => {
      selectGroupChat(group);
    });
    groupListEl.appendChild(item);
  });
}

function clearActiveListItems() {
  document
    .querySelectorAll(".list-item")
    .forEach((el) => el.classList.remove("active"));
}

function selectPrivateChat(otherUsername) {
  clearActiveListItems();
  const item = document.querySelector(
    `.list-item[data-username="${otherUsername}"]`
  );
  if (item) item.classList.add("active");

  state.chatType = "private";
  state.selectedId = otherUsername;

  const current = getCurrentUser().username;
  const key = privateChatKey(current, otherUsername);

  chatTitleEl.textContent = otherUsername;
  chatSubtitleEl.textContent = "One-to-one chat";

  renderMessagesForKey(key);
}

function selectGroupChat(group) {
  clearActiveListItems();
  const item = document.querySelector(
    `.list-item[data-group-id="${group.id}"]`
  );
  if (item) item.classList.add("active");

  state.chatType = "group";
  state.selectedId = group.id;

  const key = groupChatKey(group.id);
  chatTitleEl.textContent = group.name;
  chatSubtitleEl.textContent = "Group chat";

  renderMessagesForKey(key);
}

// ======== Messages UI ========
function renderMessagesForKey(chatKey) {
  messageListEl.innerHTML = "";
  const msgs = state.messages[chatKey] || [];
  msgs.forEach((m) => {
    appendMessageElement(m);
  });
  scrollMessagesToBottom();
}

function appendMessageElement(message) {
  const current = getCurrentUser().username;
  const li = document.createElement("li");
  li.className = "message " + (message.sender === current ? "me" : "other");

  const header = document.createElement("div");
  header.className = "message-header";
  header.textContent =
    message.sender === current ? "You" : message.sender;

  const body = document.createElement("div");
  body.textContent = message.text;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = message.time;

  li.appendChild(header);
  li.appendChild(body);

  if (message.files && message.files.length > 0) {
    const fileTag = document.createElement("div");
    fileTag.className = "file-tag";
    fileTag.textContent = `${message.files.length} file(s) attached`;
    li.appendChild(fileTag);
  }

  li.appendChild(meta);
  messageListEl.appendChild(li);
}

function scrollMessagesToBottom() {
  messageListEl.scrollTop = messageListEl.scrollHeight;
}

// ======== Send message logic ========
const messageForm = document.getElementById("message-form");
const messageInput = document.getElementById("message-input");
const fileInput = document.getElementById("file-input");

messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!state.selectedId) {
    alert("Select a user or group first");
    return;
  }

  const text = messageInput.value.trim();
  const files = Array.from(fileInput.files);

  if (!text && files.length === 0) return;

  const current = getCurrentUser().username;
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const chatKey =
    state.chatType === "private"
      ? privateChatKey(current, state.selectedId)
      : groupChatKey(state.selectedId);

  const message = {
    chatKey,
    sender: current,
    text,
    files: files.map((f) => ({ name: f.name, size: f.size })),
    time
  };

  // Save locally
  if (!state.messages[chatKey]) state.messages[chatKey] = [];
  state.messages[chatKey].push(message);

  appendMessageElement(message);
  scrollMessagesToBottom();
  messageInput.value = "";
  fileInput.value = "";

  // TODO: send to server via WebSocket/Firebase
  sendToServer(message);
});

// ======== File selection buttons ========
const fileBtn = document.getElementById("file-btn");
fileBtn.addEventListener("click", () => {
  fileInput.click();
});

// ======== Emoji picker ========
const emojiBtn = document.getElementById("emoji-btn");
const emojiPicker = document.getElementById("emoji-picker");

emojiBtn.addEventListener("click", () => {
  emojiPicker.classList.toggle("hidden");
});

emojiPicker.addEventListener("click", (e) => {
  if (e.target.classList.contains("emoji")) {
    messageInput.value += e.target.textContent;
    messageInput.focus();
  }
});

// Hide emoji picker when clicking outside
document.addEventListener("click", (e) => {
  if (
    !emojiPicker.contains(e.target) &&
    e.target !== emojiBtn
  ) {
    emojiPicker.classList.add("hidden");
  }
});

// ======== Real-time placeholder (WebSocket/Firebase) ========
// In your project, replace these functions with:
// - WebSocket client (new WebSocket("ws://..."))
// - OR Firebase Realtime Database / Firestore listeners. [web:8][web:9]

let socket = null;

function setupRealtimeConnection() {
  // Example WebSocket skeleton:
  // socket = new WebSocket("ws://localhost:8080");
  // socket.addEventListener("message", (event) => {
  //   const msg = JSON.parse(event.data);
  //   handleIncomingMessage(msg);
  // });

  // Or use Firebase SDK to listen to new messages.
}

function sendToServer(message) {
  // Example WebSocket send:
  // if (socket && socket.readyState === WebSocket.OPEN) {
  //   socket.send(JSON.stringify(message));
  // }

  // Example Firebase: push to messages collection.
}

function handleIncomingMessage(message) {
  const key = message.chatKey;
  if (!state.messages[key]) state.messages[key] = [];
  state.messages[key].push(message);

  if (state.selectedId) {
    const current = getCurrentUser().username;
    const activeKey =
      state.chatType === "private"
        ? privateChatKey(current, state.selectedId)
        : groupChatKey(state.selectedId);

    if (activeKey === key) {
      appendMessageElement(message);
      scrollMessagesToBottom();
    }
  }
}


setupRealtimeConnection();
