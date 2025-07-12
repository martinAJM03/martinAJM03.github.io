const tabs = document.querySelectorAll(".tab");
const views = document.querySelectorAll(".view");
const homeOpts = document.querySelectorAll(".home-option");
const back = document.querySelectorAll('.back-button');


// 🔹 Cookie helpers
function setCookie(name, value, days = 7) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  return document.cookie.split("; ").reduce((acc, part) => {
    const [key, val] = part.split("=");
    return key === name ? decodeURIComponent(val) : acc;
  }, "");
}

// 🔹 Tab activation logic
function activateTab(targetId) {
  views.forEach(v => v.classList.remove("active"));
  tabs.forEach(t => t.classList.remove("active"));

  const targetView = document.getElementById(targetId);
  const targetTab = [...tabs].find(t => t.dataset.target === targetId);

  if (targetView) targetView.classList.add("active");
  if (targetTab) targetTab.classList.add("active");
}

// 🔹 Load last active tab from cookie (or default to first tab)
const lastTab = getCookie("activeTab") || tabs[0].dataset.target;
activateTab(lastTab);

// 🔹 Click handler
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    const targetId = tab.dataset.target;
    activateTab(targetId);
    setCookie("activeTab", targetId);
  });
});

homeOpts.forEach(homeOpt => {
  homeOpt.addEventListener("click", () => {
    const targetId = homeOpt.dataset.target;
    views.forEach(v => v.classList.remove("active"))
    const targetView = document.getElementById(targetId);
    if (targetView) targetView.classList.add("active");
    setCookie("activeTab", targetId);
  });
});

back.forEach(back => {
  back.addEventListener("click", () => {
    views.forEach(v => v.classList.remove('active'));
      document.getElementById('home').classList.add('active');
  });
});

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-app.js";
import { getDatabase, ref, set, onValue, remove } from "https://www.gstatic.com/firebasejs/10.5.2/firebase-database.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCZPq2smyRABce08nyWm-zhXTgPwGgAUw4",
  authDomain: "martinajm03-1.firebaseapp.com",
  databaseURL: "https://martinajm03-1-default-rtdb.firebaseio.com",
  projectId: "martinajm03-1",
  storageBucket: "martinajm03-1.appspot.com",
  messagingSenderId: "307326545673",
  appId: "1:307326545673:web:95d4352e944a1aea396dd8"
};

// ✅ Init Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const latestImageRef = ref(db, 'latestImage');

// ✅ DOM
const selectBtn = document.getElementById('select-button');
const imageInput = document.getElementById('image-input');
const submitBtn = document.getElementById('submit-button');
const latestImage = document.getElementById('latest-image');

// 👇 Trigger the hidden file input
selectBtn.addEventListener('click', () => {
  imageInput.click();
});

// 👇 Optionally show file name after selection
imageInput.addEventListener('change', () => {
  const file = imageInput.files[0];
  fileName.textContent = file ? file.name : "No file chosen";
});

// ✅ Submit Photo
submitBtn.addEventListener('click', () => {
  const file = imageInput.files[0];
  if (!file) return alert("Please select an image!");

  const reader = new FileReader();
  reader.onload = function (e) {
    const base64 = e.target.result; // already includes the data:image/png;base64, prefix
    set(latestImageRef, base64)
      .then(() => console.log("✅ Image uploaded"))
      .catch(err => console.error("❌ Upload failed:", err));
    imageInput.value = '';
  };
  reader.readAsDataURL(file); // converts to base64
  document.getElementById('fileName').innerText = "No file chosen";
});

// ✅ Display the Image Live
onValue(latestImageRef, (snapshot) => {
  const base64Image = snapshot.val();
  if (base64Image) {
    latestImage.src = base64Image; // renders back into PNG automatically
  } else {
    latestImage.src = '';
    latestImage.alt = "No image";
  }
});

const deleteBtn = document.getElementById('delete-image');

// Delete handler
deleteBtn.addEventListener('click', async () => {
  try {
    await remove(latestImageRef);
    latestImage.src = '';
    latestImage.alt = 'No image';
    console.log('✅ Image removed from Firebase');
    location.reload();
  } catch (err) {
    console.error('❌ Error deleting image:', err);
  }
});

const downloadBtn = document.getElementById('download-image');

downloadBtn.addEventListener('click', () => {
  const imageSrc = latestImage.src;

  if (!imageSrc) {
    alert("No image to download.");
    return;
  }

  const link = document.createElement('a');
  link.href = imageSrc;
  link.download = 'latest-image'; // You can change the filename here
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});
