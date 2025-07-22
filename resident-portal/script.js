
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js"
import {getDatabase, set, ref, onValue, get, child, remove} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js"

const firebaseConfig = {
  apiKey: "AIzaSyCZPq2smyRABce08nyWm-zhXTgPwGgAUw4",
  authDomain: "martinajm03-1.firebaseapp.com",
  databaseURL: "https://martinajm03-1-default-rtdb.firebaseio.com",
  projectId: "martinajm03-1",
  storageBucket: "martinajm03-1.firebasestorage.app",
  messagingSenderId: "307326545673",
  appId: "1:307326545673:web:d2f3313536056fb5396dd8",
  measurementId: "G-9W9STQ7FRT"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");
let lastView = 'home';
if (getCookie('lastView') != null) {
  lastView = getCookie('lastView');
}
activateTab(lastView);

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const targetId = tab.dataset.target;
    activateTab(targetId);
    setCookie('lastView', targetId, 1);
  })
})

document.getElementById('settings-button').addEventListener('click', () => {
  views.forEach(v => v.classList.remove("active"));
  tabs.forEach(t => t.classList.remove("active"));

  const targetView = document.getElementById('settings');

  targetView.classList.add("active");

  const newTitle = targetView.dataset.title || '';
  document.querySelector('.view-title').textContent = newTitle;
  setCookie('lastView', 'settings', 1);
})

function activateTab(targetId) {
  views.forEach(v => v.classList.remove("active"));
  tabs.forEach(t => t.classList.remove("active"));

  const targetView = document.getElementById(targetId);
  const targetTab = [...tabs].find(t => t.dataset.target === targetId);

  if (targetView) {
    targetView.classList.add("active");
    const newTitle = targetView.dataset.title || '';
    document.querySelector('.view-title').textContent = newTitle;
  }
  if (targetTab) {
    targetTab.classList.add("active");
  }
}

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + (days * 86400000));
  const expires = "expires=" + d.toUTCString();
  document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (let c of cookies) {
    const [key, value] = c.split("=");
    if (key === name) return value;
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
}

function dbWrite(location, value) {
  set(ref(db, location), value);
}
function dbRead(location) {
  let retVal = ref(db, location);
  onValue(retVal, (value) => {
    retVal = value.val();
  })
  return retVal;
}
function writeMessage(message) {
  dbWrite('liveMessage', message)
}

document.getElementById('liveMessage').textContent = localStorage.getItem('liveMessage');
let message;
message = ref(db, 'liveMessage');
onValue(message, (value) => {
  if (localStorage.getItem('liveMessage') != value.val()) {
    document.getElementById('liveMessage').textContent = value.val();
    localStorage.setItem('liveMessage', value.val())
  }
});

let user = localStorage.getItem('user');
if (user == '' || user == null) {
  document.querySelector('.login-container').classList.remove('loggedin');
  document.querySelector('.login-details').classList.remove('loggedin');
} else {
  document.querySelector('.login-container').classList.add('loggedin');
  document.querySelector('.login-details').classList.add('loggedin');
  document.getElementById('currentUser').textContent = user;
}
const usernameInput = document.getElementById('username');
usernameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    login();
  }
});

function login() {
  let username = usernameInput.value;
  if (username == '' || username == null) {
    alert('enter a username before logging in, dumbass')
    return 0;
  }
  findUser(username).then ((exists) => {
    if (exists) {
      document.querySelector('.login-container').classList.add('loggedin');
      document.querySelector('.login-details').classList.add('loggedin');
      localStorage.setItem('user',username);
      usernameInput.value = '';
      document.getElementById('currentUser').textContent = localStorage.getItem('user');
    } else {
      alert('User does not exist');
    }
  })
}
window.login = login;

function signup() {
  let username = usernameInput.value;
  if (username == '' || username == null) {
    alert('enter a username before signing up, dumbass')
    return 0;
  }
  findUser(username).then((exists) => {
    if (!exists) {
      localStorage.setItem('user',username);
      usernameInput.value = '';
      createUser(username);
      window.location.reload();
    } else {
      alert('User already exists');
    }
  })
}
window.signup = signup;

function logout() {
  document.querySelector('.login-container').classList.remove('loggedin');
  document.querySelector('.login-details').classList.remove('loggedin');
  localStorage.setItem('user','');
}
window.logout = logout;

async function findUser(username) {
  try {
    const snapshot = await get(child(ref(db), `users/${username}`));
    return snapshot.exists(); // returns true or false
  } catch (error) {
    console.error("Error checking user:", error);
    return false; // or throw error if preferred
  }
}

function createUser(username) {
  const usersRef = ref(db, "users/" + username);
  set(usersRef, {'notification': 'false'})
  .then(() => {
    console.log("User added successfully!");
  })
  .catch((error) => {
    console.error("Error adding user:", error);
  });
}

function deleteUser() {
  
  const username = localStorage.getItem('user');
  const confirmed = confirm(`Are you sure you want to delete '${username}'?`);

  if (!confirmed) {
    console.log("Deletion canceled");
    return;
  }

  logout();
  const userRef = ref(db, `users/${username}`);
  remove(userRef)
    .then(() => {
      console.log(`User '${username}' deleted successfully`);
    })
    .catch((error) => {
      console.error("Error deleting user:", error);
    });
}
window.deleteUser = deleteUser;

onValue(ref(db, 'users/' + localStorage.getItem('user') + '/notification'), (value) => {
  if (value.val() == 'true') {
    document.getElementById('notifs').classList.add('active');
  } else {
    document.getElementById('notifs').classList.remove('active');
  }
});

const textarea = document.getElementById('message-input');

textarea.addEventListener('input', () => {
  textarea.style.height = 'auto'; // Reset height
  textarea.style.height = textarea.scrollHeight + 'px'; // Adjust to content height
});

textarea.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    writeMessage(textarea.value);
    textarea.value = '';
    textarea.style.height = 'auto'; // Reset height
    textarea.style.height = textarea.scrollHeight + 'px';
  }
});


// firebase cloud messaging

navigator.serviceWorker.register('/service-worker.js')
  .then((registration) => {
    messaging.useServiceWorker(registration);

    // Request permission
    return Notification.requestPermission();
  })
  .then((permission) => {
    if (permission === 'granted') {
      return messaging.getToken({
        vapidKey: 'BL9YyzC6ok9Xfi9Ht47_fIXhPx-TDL52FCtE0eHODx36qpBJtnv7CTi21Rrm20sY-NgEgpIbIfnDETFwbUDOB_s'
      });
    } else {
      throw new Error('Permission not granted for Notification');
    }
  })
  .then((token) => {
    console.log("FCM Token:", token);
    // You can send this token to your server to send notifications
  })
  .catch((err) => {
    console.error("Error getting permission or token:", err);
  });
