// for dark mode
//https://flaviocopes.com/dark-mode/
const chk = document.getElementById('darkModeToggle');
chk.addEventListener('change', () => {
	console.log('local mode: ' + localStorage.getItem('mode'))
	if (localStorage.getItem('mode') === 'dark'){
		localStorage.setItem('mode', 'light'); 
		document.querySelector('body').classList.remove('dark')
		document.getElementById("darkModeToggle").checked = false;
	}
	else {
		localStorage.setItem('mode', 'dark'); 
		document.querySelector('body').classList.add('dark');
		document.getElementById("darkModeToggle").checked = true;
	}
 //    document.body.classList.toggle('dark');
	// document.getElementsByTagName('img')[0].classList.toggle('dark');
});

if(document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded',afterDOMLoaded);
} else {
    afterDOMLoaded();
}

function afterDOMLoaded(){
	console.log('init local mode: ' + localStorage.getItem('mode'))
  	if (localStorage.getItem('mode') === 'dark'){
		document.querySelector('body').classList.add('dark')
		document.getElementById("darkModeToggle").checked = true;
	}
	else {
		document.querySelector('body').classList.remove('dark');
		document.getElementById("darkModeToggle").checked = false;
	}
}

document.getElementById('_yPushState').addEventListener('y-push-state-load', function() {
	console.log('init local mode: ' + localStorage.getItem('mode'))
  	if (localStorage.getItem('mode') === 'dark'){
		document.querySelector('body').classList.add('dark')
		document.getElementById("darkModeToggle").checked = true;
	}
	else {
		document.querySelector('body').classList.remove('dark');
		document.getElementById("darkModeToggle").checked = false;
	}
});
