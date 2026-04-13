//pon aquí tu js

const mario = document.getElementById("mario)");
var posicionX = 300;
document.addEventListener("keydown",(event) =>{

switch(event.key){

    case "ArrowLeft":
        posicionX = posicionX -10;
        break;

}
mario.style.left=posicionX + "px";

});