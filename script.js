console.log("Welcome to Coruscantbytes Studio!");

// Add a simple hover sound effect or interactions later here.
// For now, let's make the glitch effect respond slightly to mouse movement.
document.addEventListener("mousemove", (e) => {
    const glitchElement = document.querySelector('.glitch');
    if(glitchElement) {
        const x = (e.clientX / window.innerWidth - 0.5) * 10;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        glitchElement.style.transform = `translate(${x}px, ${y}px)`;
    }
});
