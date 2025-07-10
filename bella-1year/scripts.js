const tabs = document.querySelectorAll('.home-button');
const views = document.querySelectorAll('.view');
const back = document.querySelectorAll('.back-button')
let previous = 

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    if (tab.dataset.target == null) {/*do nothing*/} 
    else {
      views.forEach(v => v.classList.remove('active'));
      const targetId = tab.dataset.target;
      document.getElementById(targetId).classList.add('active');
    }
  });
});

back.forEach(back => {
  back.addEventListener('click', () => {
    views.forEach(v => v.classList.remove('active'));
      document.getElementById('view-home').classList.add('active');
  });
});
/*const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
  || window.navigator.standalone === true;

if (isStandalone) {
  //Do Nothing
} else {
  views.forEach(v => v.classList.remove('active'));
  document.getElementById('blank').classList.add('active');
}*/