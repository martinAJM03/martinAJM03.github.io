const enableButton = document.getElementById('notifButton');
enableButton.addEventListener('click', async () => {
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    console.log('Notifications permitted');
    subscribeForPush(); // proceed to get token/subscription
  } else {
    console.log('Notification permission denied');
  }
});
