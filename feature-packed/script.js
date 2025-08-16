// View switching
const views = document.querySelectorAll('.view');

function view(target) {
  views.forEach(v => v.classList.remove('active'));
  document.getElementById(target).classList.add('active');
  localStorage.setItem('lastView', target);
}

// Last View

let lastView = localStorage.getItem('lastView');
if (lastView == null) {
  lastView = 'home'
}
view(lastView);

// Counter
let counterData = [];
if (localStorage.getItem('counterData') != null) {
  counterData = JSON.parse(localStorage.getItem('counterData')) || [];
}
localStorage.setItem('counterData', '');

function add(id) {
  counterData[id].value++;
  renderCounters();
}
function subtract(id) {
  counterData[id].value--;
  renderCounters();
}

async function addCounter() {
  document.getElementById('colorPicker').classList.add('active'); 
  document.getElementById('colorPicker').value = '#ff0000';
  await createPopup('Name:', 'prompt');
  if (localStorage.getItem('popupReturn') !== 'closed') {
    counterData.push({label: localStorage.getItem('popupReturn'), value: 0, color: document.getElementById('colorPicker').value})
    renderCounters();
  }
}
function removeCounter(id) {
  counterData.splice(id, 1);
  renderCounters();
}
function renderCounters() {
  document.querySelector('.counter-container').innerHTML = '';
  for (i in counterData) {
    document.querySelector('.counter-container').innerHTML += 
      `
      <div class="counter" data-counterid="${i}">
        <div class="remove-button" onclick="removeCounter(${i})"><i class="fa-solid fa-circle-minus"></i></div>
        <div class="value-container" style="background-color: ${counterData[i].color}">
          <div class="counter-label">${counterData[i].label}</div>
          <div class="counter-buttons">
            <div class="counter-value">${counterData[i].value}</div>
            <button class="subtract" onclick="subtract(${i})"><i class="fa-solid fa-minus"></i></button>
            <button class="add" onclick="add(${i})"><i class="fa-solid fa-plus"></i></button>
          </div>
        </div>
      </div>
      `
  }
  if (editMode === true) {
    document.querySelectorAll('.remove-button').forEach(button => {
      button.classList.add('active');
    })
  }
  document.querySelectorAll('.value-container').forEach(counter => {
    counter.addEventListener('click', () => {editCounterDetails(counter.closest('.counter').dataset.counterid)})
  })
  localStorage.setItem('counterData', JSON.stringify(counterData));
}

let editMode = false;
function editCounters(mode = 'toggle') {
  if (mode === 'toggle') {
    if (editMode === false) {
      document.querySelectorAll('.remove-button').forEach(button => {
        button.classList.add('active');
      })
      document.getElementById('edit-counters').textContent = 'Done'
      editMode = true;
    }
    else { 
      document.querySelectorAll('.remove-button').forEach(button => {
        button.classList.remove('active');
      })
      document.getElementById('edit-counters').textContent = 'Edit'
      editMode = false;
    }
  }
  else if (mode == 'true') {
    document.querySelectorAll('.remove-button').forEach(button => {
      button.classList.add('active');
    })
    document.getElementById('edit-counters').textContent = 'Done'
    editMode = true;
  }
  else if (mode == 'false') {
    document.querySelectorAll('.remove-button').forEach(button => {
      button.classList.remove('active');
    })
    document.getElementById('edit-counters').textContent = 'Edit'
    editMode = false;
  }
}

async function editCounterDetails(id) {
  if (editMode) {
    setTimeout(() => {
      document.getElementById('popupInput').focus();
    }, 0);
    document.getElementById('popupInput').value = counterData[id].label;
    document.getElementById('colorPicker').classList.add('active'); 
    document.getElementById('colorPicker').value = counterData[id].color;
    await createPopup('Edit counter','prompt');
    const popupReturn = localStorage.getItem('popupReturn');
    if (popupReturn !== 'closed') {
      counterData[id].label = popupReturn;
      counterData[id].color = document.getElementById('colorPicker').value;
      renderCounters();
    }

    document.getElementById('colorPicker').classList.remove('active'); 
    console.log(counterData[id].color)
  }
}

async function resetCounters() {
  await createPopup('Are you sure?', 'confirm', 'danger');
  if (localStorage.getItem('popupReturn') !== 'closed') {
    counterData = [];
    renderCounters();
    console.log('All counters cleared')
  }
}

renderCounters();

// Popups
const popupOverlay = document.getElementById('popupOverlay');
const popup = document.getElementById('popup');
const popupContent = document.getElementById('popupContent');
const popupButtons = document.getElementById('popupButtons');
let popupResolve;

const inputEl = document.getElementById('popupInput');
inputEl.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    closePopup('submit');
  }
});

async function createPopup(content = 'What?', type = 'alert', color = 'normal') {
  content = (content === '') ? 'What?' : content;
  popup.classList.add('fade-in');

  return new Promise(resolve => {
    popupResolve = resolve;
    let buttonColor;
    switch (color) {
      case 'danger': {
        buttonColor = 'red';
        break;
      }
      case 'normal' :  
      case 'default' : {
        buttonColor = 'rgb(59, 130, 247)'
        break;
      }
    }
    switch (type) {
      case 'alert': {
        popupButtons.innerHTML = `<div class="popup-button" id="popupButton2" style="background-color:rgba(120, 120, 120, 0.5)" onclick="closePopup('close')">Close</div>`
        break;
      }
      case 'prompt': {
        document.querySelector('.popup-input').classList.add('active');
        popupButtons.innerHTML = `<div class="popup-button" id="popupButton1" style="background-color:${buttonColor}" onclick="closePopup('submit')">Submit</div>`;
        popupButtons.innerHTML += `<div class="popup-button" id="popupButton2" style="background-color:rgba(120, 120, 120, 0.5)" onclick="closePopup('close')">Cancel</div>`;
        popupContent.classList.add('prompt');
        break;
      }
      case 'confirm': {
        popupButtons.innerHTML = `<div class="popup-button" id="popupButton1" style="background-color:${buttonColor}" onclick="closePopup('confirm')">Okay</div>`;
        popupButtons.innerHTML += `<div class="popup-button" id="popupButton2" style="background-color:rgba(120, 120, 120, 0.5)" onclick="closePopup('close')">Cancel</div>`
        break;
      }
      default : {
        popupButtons.innerHTML = `<div class="popup-button" id="popupButton2" style="background-color:rgba(120, 120, 120, 0.5)" onclick="closePopup('close')">Close</div>`
        break;
      }
    }
  
    popupContent.innerHTML = content;
    popupOverlay.classList.add('active');
  });
}
function closePopup(type = 'close') {
  let returnValue;
  switch (type) {
    case 'close' : {
      console.log('popup closed with value: "closed"');
      returnValue = 'closed';
      break;
    }
    case 'submit' : {
      const popupInput = document.getElementById('popupInput').value;
      if (popupInput == '' || popupInput == null){
        alert('stupid idiot. you need to enter something into the text box.');
        return 0;
      }
      console.log(`popup returned with value: "${popupInput}"`)
      returnValue = popupInput;
      break;
    }
    case 'confirm' : {
      returnValue = 'confirmed';
      console.log('popup confirmed with value: "confirmed"');
      break;
    }
    default :
      console.log('popup closed with no changes');
      returnValue = null;
  }

  localStorage.setItem('popupReturn', returnValue)
  if (popupResolve) popupResolve(returnValue);

  popup.classList.remove('fade-in');
  popup.classList.add('fade-out');

  popup.addEventListener('animationend', function handleFadeOut() {
    popupOverlay.classList.remove('active');
    popup.classList.remove('fade-out');
    popup.removeEventListener('animationend', handleFadeOut);
  });
  document.querySelector('.popup-input').classList.remove('active');
  popupContent.classList.remove('prompt');
  document.getElementById('popupInput').value = '';
}

function focusKeyboard() {
  inputEl.focus();
  inputEl.click();
}

// Random Number

function generateNumber(min = Number(document.getElementById('random-min').value), max = Number(document.getElementById('random-max').value)) {
  for (i=0; i<20; i++) {
  const rand = Math.floor(Math.random() * (max - min + 1)) + min;
  document.querySelector('.random-number-output').textContent = rand;
  }
}

// List Randomizer

let listData = [];

async function addListItem() {
  await createPopup('Name:', 'prompt');
  if (localStorage.getItem('popupReturn') !== 'closed') {
    listData.push(localStorage.getItem('popupReturn'));
    renderList();
  }
}
function removeListItem(id) {
  listData.splice(id, 1);
  renderList();
}
function renderList() {
  document.querySelector('.item-list').innerHTML = '';
  for (i in listData) {
    document.querySelector('.item-list').innerHTML += 
      `
      <div class="item" data-itemId="${i}">
        <div class="remove-button" onclick="removeListItem(${i})"><span class="fa-solid fa-circle-minus"></span></div>
        <p>${listData[i]}</p>
      </div>
      `
  }
  if (editMode === true) {
    document.querySelectorAll('.remove-button').forEach(button => {
      button.classList.add('active');
    })
  }
}

function editList(mode = 'toggle') {
  if (mode === 'toggle') {
    if (editMode === false) {
      document.querySelectorAll('.remove-button').forEach(button => {
        button.classList.add('active');
      })
      document.getElementById('edit-list').textContent = 'Done'
      editMode = true;
    }
    else { 
      document.querySelectorAll('.remove-button').forEach(button => {
        button.classList.remove('active');
      })
      document.getElementById('edit-list').textContent = 'Edit'
      editMode = false;
    }
  }
  else if (mode == 'true') {
    document.querySelectorAll('.remove-button').forEach(button => {
      button.classList.add('active');
    })
    document.getElementById('edit-list').textContent = 'Done'
    editMode = true;
  }
  else if (mode == 'false') {
    document.querySelectorAll('.remove-button').forEach(button => {
      button.classList.remove('active');
    })
    document.getElementById('edit-list').textContent = 'Edit'
    editMode = false;
  }
}

renderList();

function randomItem() {
  if (listData.length == 0) {
    createPopup('No items in the list');
    return;
  }
  const rand = Math.floor(Math.random() * listData.length);
  document.querySelector('.random-item').textContent = listData[rand];
}